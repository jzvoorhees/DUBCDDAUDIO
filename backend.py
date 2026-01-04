import os
import json
import subprocess
import re
import threading
from typing import Dict, List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logs: List[str] = []
progress: int = 0
running: bool = False
lock = threading.Lock()  # For thread safety on logs and progress

class AnalyzeRequest(BaseModel):
    path: str
    working_dir: str = "."

class StartSyncRequest(BaseModel):
    master_name: str
    dub_name: str
    working_dir: str

def get_audio_info(file_path: str) -> Dict:
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path
    ]
    try:
        output = subprocess.check_output(cmd).decode()
        data = json.loads(output)
        audio_stream = next(s for s in data["streams"] if s["codec_type"] == "audio")
        duration = float(data["format"]["duration"])
        channels = int(audio_stream["channels"])
        codec = audio_stream["codec_name"]
        return {"duration": duration, "channels": channels, "codec": codec}
    except Exception as e:
        raise ValueError(f"Failed to get audio info: {str(e)}")

def add_log(message: str):
    with lock:
        logs.append(message)

def set_progress(value: int):
    global progress
    with lock:
        progress = value

def process_audio(master_name: str, dub_name: str, working_dir: str):
    global running
    try:
        add_log("Starting audio synchronization process.")
        set_progress(0)

        full_master = os.path.join(working_dir, master_name)
        full_dub = os.path.join(working_dir, dub_name)

        add_log(f"Validating files: master={full_master}, dub={full_dub}")
        if not os.path.exists(full_master):
            raise FileNotFoundError(f"Master file not found: {full_master}")
        if not os.path.exists(full_dub):
            raise FileNotFoundError(f"Dub file not found: {full_dub}")
        add_log("Files validated successfully.")
        set_progress(10)

        master_pcm = os.path.join(working_dir, "master_pcm.wav")
        dub_pcm = os.path.join(working_dir, "dub_pcm.wav")

        add_log("Extracting PCM from master.")
        subprocess.check_call([
            "ffmpeg", "-i", full_master, "-vn", "-acodec", "pcm_f32le", "-y", master_pcm
        ])
        add_log("Master PCM extracted.")
        set_progress(20)

        add_log("Extracting PCM from dub.")
        subprocess.check_call([
            "ffmpeg", "-i", full_dub, "-vn", "-acodec", "pcm_f32le", "-y", dub_pcm
        ])
        add_log("Dub PCM extracted.")
        set_progress(30)

        master_info = get_audio_info(full_master)
        dub_info = get_audio_info(full_dub)
        master_dur = master_info["duration"]
        dub_dur = dub_info["duration"]
        channels = master_info["channels"]
        add_log(f"Master duration: {master_dur}s, Dub duration: {dub_dur}s, Channels: {channels}")

        add_log("Detecting silences in dub.")
        cmd = [
            "ffmpeg", "-i", dub_pcm, "-af", "silencedetect=noise=-60dB:d=0.5", "-f", "null", "-"
        ]
        p = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        _, err = p.communicate()
        err_str = err.decode()

        silence_starts = re.findall(r"silence_start: (\d+\.?\d*)", err_str)
        silence_ends = re.findall(r"silence_end: (\d+\.?\d*)", err_str)
        if len(silence_starts) != len(silence_ends):
            raise ValueError("Mismatch in silence start and end counts.")
        silences = [(float(start), float(end)) for start, end in zip(silence_starts, silence_ends)]
        add_log(f"Found {len(silences)} silence intervals: {silences}")
        set_progress(40)

        add_log("Building timeline segments.")
        non_silents = []
        prev_end = 0.0
        for start, end in sorted(silences, key=lambda x: x[0]):
            if start > prev_end:
                non_silents.append((prev_end, start))
            prev_end = max(prev_end, end)
        if dub_dur > prev_end:
            non_silents.append((prev_end, dub_dur))
        add_log(f"Non-silent intervals in dub: {non_silents}")

        segments = []
        current = 0.0
        i = 0
        non_silents = sorted(non_silents, key=lambda x: x[0])
        while current < master_dur:
            if i < len(non_silents):
                ns_start, ns_end = non_silents[i]
                ns_end = min(ns_end, dub_dur)
                if current < ns_start:
                    out = min(ns_start, dub_dur, master_dur)
                    segments.append((master_pcm, current, out))
                    add_log(f"Added master segment: {current} to {out}")
                    current = out
                if current >= ns_start:
                    out = min(ns_end, master_dur)
                    segments.append((dub_pcm, current, out))
                    add_log(f"Added dub segment: {current} to {out}")
                    current = out
                    i += 1
            else:
                segments.append((master_pcm, current, master_dur))
                add_log(f"Added final master segment: {current} to {master_dur}")
                current = master_dur
        set_progress(50)

        input_txt = os.path.join(working_dir, "input.txt")
        add_log(f"Creating concat input file: {input_txt}")
        with open(input_txt, "w") as f:
            for file_path, inpt, outpt in segments:
                f.write(f"file '{file_path}'\n")
                f.write(f"inpoint {inpt}\n")
                f.write(f"outpoint {outpt}\n")
        add_log("Concat input file created.")
        set_progress(80)

        output_file = os.path.join(working_dir, "OUTPUT_SYNCED.eac3")
        add_log(f"Rendering final output: {output_file}")
        cmd = [
            "ffmpeg", "-f", "concat", "-safe", "0", "-i", input_txt,
            "-c:a", "eac3", "-b:a", "640k", "-ac", str(channels), "-y", output_file
        ]
        subprocess.check_call(cmd)
        add_log("Final output rendered successfully.")
        set_progress(100)

    except Exception as e:
        add_log(f"Error during processing: {str(e)}")
        set_progress(100)
    finally:
        running = False
        add_log("Process completed.")

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    try:
        full_path = os.path.join(request.working_dir, request.path)
        info = get_audio_info(full_path)
        return info
    except Exception as e:
        return {"error": str(e)}

@app.post("/start-sync")
async def start_sync(request: StartSyncRequest):
    global running
    with lock:
        if running:
            return {"status": "already running"}
        running = True
        logs.clear()
        progress = 0
    thread = threading.Thread(target=process_audio, args=(request.master_name, request.dub_name, request.working_dir))
    thread.start()
    return {"status": "started"}

@app.get("/logs")
def get_logs():
    with lock:
        return logs

@app.get("/progress")
def get_progress():
    with lock:
        return {"progress": progress}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
