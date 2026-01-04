import React, { useState, useEffect, useRef } from 'react';
import { 
  FileAudio, 
  UploadCloud, 
  Play, 
  Settings, 
  Activity, 
  Cpu, 
  Layers, 
  Download, 
  Check, 
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { LogTerminal } from './components/LogTerminal';
import { Timeline } from './components/Timeline';
import { AudioFile, LogEntry, ProcessState, SyncSegment, AnalysisData } from './types';

const API_URL = "http://127.0.0.1:8000";

const generateMockAnalysis = (points: number): AnalysisData[] => {
  const data: AnalysisData[] = [];
  for (let i = 0; i < points; i++) {
    const isGap = i > 30 && i < 45 || i > 70 && i < 75;
    data.push({
      time: i,
      rmsMaster: -12 + (Math.random() * 2),
      rmsDub: isGap ? -90 : -12 + (Math.random() * 4),
      isGap: isGap ? 1 : 0
    });
  }
  return data;
};

const App: React.FC = () => {
  // -- State --
  const [masterFile, setMasterFile] = useState<AudioFile | null>(null);
  const [dubFile, setDubFile] = useState<AudioFile | null>(null);
  const [workDir, setWorkDir] = useState<string>(""); 
  
  const [processState, setProcessState] = useState<ProcessState>(ProcessState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [segments, setSegments] = useState<SyncSegment[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [serverConnected, setServerConnected] = useState(false);

  const masterInputRef = useRef<HTMLInputElement>(null);
  const dubInputRef = useRef<HTMLInputElement>(null);

  // -- Polling Backend --
  useEffect(() => {
    const checkServer = async () => {
      try {
        await fetch(`${API_URL}/progress`);
        setServerConnected(true);
      } catch (e) {
        setServerConnected(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (processState === ProcessState.PROCESSING || processState === ProcessState.ANALYZING) {
      interval = setInterval(async () => {
        try {
          const logRes = await fetch(`${API_URL}/logs`);
          const logData = await logRes.json();
          setLogs(logData);

          const progRes = await fetch(`${API_URL}/progress`);
          const progData = await progRes.json();
          setProgress(progData.progress);
          
          if (progData.progress >= 100) {
             setProcessState(ProcessState.COMPLETED);
          }
        } catch (e) { console.error(e); }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [processState]);

  // -- Helpers --
  const validateFileWithBackend = async (file: File, type: 'master' | 'dub') => {
    try {
      // Tenta validar o arquivo no backend usando apenas o nome
      // O backend vai procurar na pasta de trabalho
      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.name, working_dir: workDir || undefined })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Erro: O Python não encontrou o arquivo "${file.name}".\n\nCertifique-se que o arquivo está na mesma pasta do script backend.py ou configure a Pasta de Trabalho.`);
        return;
      }

      const data = await res.json();
      
      const audioFile: AudioFile = {
        name: file.name,
        size: file.size,
        type: file.type || 'audio/unknown',
        channels: `${data.channels}ch` || 'Unknown',
        codec: data.codec || 'Unknown',
        duration: data.duration
      };

      if (type === 'master') setMasterFile(audioFile);
      else setDubFile(audioFile);

    } catch (e) {
      alert("Erro de conexão com o backend Python. O servidor está rodando?");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'master' | 'dub') => {
    if (e.target.files && e.target.files.length > 0) {
      validateFileWithBackend(e.target.files[0], type);
    }
  };

  const startProcess = async () => {
    if (!masterFile || !dubFile) return;
    
    setProcessState(ProcessState.ANALYZING);
    setLogs([]);
    setProgress(0);
    setSegments([]); // Reset visual timeline
    setAnalysisData(generateMockAnalysis(100)); // Visual placeholder

    try {
      await fetch(`${API_URL}/start-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_name: masterFile.name,
          dub_name: dubFile.name,
          working_dir: workDir || undefined
        })
      });
      setProcessState(ProcessState.PROCESSING);
    } catch (e) {
      alert("Falha ao iniciar sincronização");
      setProcessState(ProcessState.IDLE);
    }
  };

  // Playhead animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (processState === ProcessState.COMPLETED) {
      interval = setInterval(() => setCurrentTime(prev => (prev + 1) % 100), 100);
    }
    return () => clearInterval(interval);
  }, [processState]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30">
      
      {/* Hidden Inputs */}
      <input type="file" ref={masterInputRef} onChange={(e) => handleFileSelect(e, 'master')} className="hidden" accept=".mkv,.ac3,.eac3,.dts,.wav,.flac" />
      <input type="file" ref={dubInputRef} onChange={(e) => handleFileSelect(e, 'dub')} className="hidden" accept=".mkv,.ac3,.eac3,.dts,.wav,.flac" />

      {/* Sidebar */}
      <div className="w-full md:w-80 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-8 shrink-0">
        
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Layers className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">DubSync Studio</h1>
            <p className="text-xs text-zinc-500 font-mono uppercase">Local Engine v2.4</p>
          </div>
        </div>

        {!serverConnected && (
           <div className="bg-red-500/10 border border-red-500/50 p-3 rounded text-[10px] text-red-200">
              🛑 <b>BACKEND DESCONECTADO</b><br/>
              Execute <code>python backend.py</code> na pasta dos seus arquivos de áudio.
           </div>
        )}

        {/* Working Directory Config (Optional) */}
        <div className="space-y-2">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <FolderOpen className="w-3 h-3" /> Working Directory
            </h2>
            <input 
                type="text" 
                placeholder="Ex: C:\MeusFilmes (Deixe vazio para usar a pasta do script)" 
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-[10px] text-zinc-300 font-mono outline-none focus:border-blue-500"
                value={workDir}
                onChange={(e) => setWorkDir(e.target.value)}
            />
        </div>

        {/* Drop Zones (Clickable) */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <FileAudio className="w-3 h-3" /> Source Files
          </h2>
          
          {/* Master */}
          <div 
            className={`border-2 border-dashed rounded-xl p-4 transition-all group cursor-pointer relative overflow-hidden ${masterFile ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-700 hover:border-zinc-500'}`}
            onClick={() => masterInputRef.current?.click()}
          >
            {masterFile ? (
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">MASTER</span>
                    <Check className="w-4 h-4 text-blue-400" />
                 </div>
                 <p className="text-sm font-medium truncate mb-1">{masterFile.name}</p>
                 <div className="flex gap-2 text-[10px] text-zinc-400 font-mono">
                    <span className="bg-zinc-800 px-1 rounded">{masterFile.codec}</span>
                    <span className="bg-zinc-800 px-1 rounded">{masterFile.channels}</span>
                 </div>
               </div>
            ) : (
                <div className="text-center py-4">
                    <UploadCloud className="w-8 h-8 text-zinc-600 mx-auto mb-2 group-hover:text-zinc-400" />
                    <p className="text-xs text-zinc-500">Click to Select <span className="text-blue-400 font-bold">EN-US</span></p>
                </div>
            )}
          </div>

          {/* Dub */}
          <div 
            className={`border-2 border-dashed rounded-xl p-4 transition-all group cursor-pointer relative ${dubFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-700 hover:border-zinc-500'}`}
            onClick={() => dubInputRef.current?.click()}
          >
             {dubFile ? (
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">DUB SLAVE</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                 </div>
                 <p className="text-sm font-medium truncate mb-1">{dubFile.name}</p>
                 <div className="flex gap-2 text-[10px] text-zinc-400 font-mono">
                    <span className="bg-zinc-800 px-1 rounded">{dubFile.codec}</span>
                    <span className="bg-zinc-800 px-1 rounded">{dubFile.channels}</span>
                 </div>
               </div>
            ) : (
                <div className="text-center py-4">
                    <UploadCloud className="w-8 h-8 text-zinc-600 mx-auto mb-2 group-hover:text-zinc-400" />
                    <p className="text-xs text-zinc-500">Click to Select <span className="text-emerald-500 font-bold">PT-BR</span></p>
                </div>
            )}
          </div>
        </div>

        {/* Global Config */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-3 h-3" /> Configuration
          </h2>
          
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Silence Threshold</span>
              <span className="font-mono text-emerald-400">-60dB</span>
            </div>
            <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[70%]"></div>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-800">
              <span className="text-zinc-400">GPU Acceleration</span>
              <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400">
                <Cpu className="w-3 h-3" />
                <span>CUDA: ON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          {processState === ProcessState.COMPLETED ? (
              <button className="w-full bg-zinc-100 hover:bg-white text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Download className="w-4 h-4" /> Open Output Folder
              </button>
          ) : (
            <button 
                onClick={startProcess}
                disabled={!masterFile || !dubFile || processState !== ProcessState.IDLE || !serverConnected}
                className={`w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    !masterFile || !dubFile || !serverConnected
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : processState === ProcessState.IDLE 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)]' 
                        : 'bg-zinc-800 text-zinc-300 cursor-wait'
                }`}
            >
                {processState === ProcessState.IDLE ? (
                    <><Play className="w-4 h-4 fill-current" /> Initialize Sync</>
                ) : (
                    <><Activity className="w-4 h-4 animate-spin" /> Processing {Math.floor(progress)}%</>
                )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 flex flex-col gap-6 overflow-hidden relative">
        {/* Header Stat Bar */}
        <div className="flex items-center justify-between mb-4">
            <div>
                <h2 className="text-2xl font-semibold text-white">Project Timeline</h2>
                <p className="text-zinc-400 text-sm">Reference: EN-US (Master) • Strategy: Fill Gaps</p>
            </div>
            <div className="flex gap-4">
                <div className="text-right">
                    <p className="text-xs text-zinc-500 uppercase font-bold">Output Format</p>
                    <p className="font-mono text-emerald-400">E-AC3 5.1 / 640kbps</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-zinc-500 uppercase font-bold">Est. Duration</p>
                    <p className="font-mono text-blue-400">{masterFile ? masterFile.duration?.toFixed(2) : '--'}s</p>
                </div>
            </div>
        </div>

        {/* Visualization Area */}
        <div className="flex-1 flex flex-col gap-6 min-h-0">
            
            {/* Chart: RMS Analysis */}
            <div className="h-64 bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        RMS Analyzer & Gap Detection
                    </h3>
                    {processState !== ProcessState.IDLE && (
                         <span className="text-xs font-mono text-zinc-500 animate-pulse">LIVE MONITORING</span>
                    )}
                </div>
                
                <div className="flex-1 w-full min-h-0">
                    {analysisData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analysisData}>
                                <defs>
                                    <linearGradient id="colorMaster" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorDub" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis hide dataKey="time" />
                                <YAxis hide domain={[-100, 0]} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontSize: '12px' }}
                                    labelStyle={{ color: '#a1a1aa' }}
                                />
                                <ReferenceLine y={-60} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Silence Threshold', fill: '#ef4444', fontSize: 10 }} />
                                <Area 
                                    type="monotone" 
                                    dataKey="rmsMaster" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorMaster)" 
                                    name="Master (EN)"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="rmsDub" 
                                    stroke="#10b981" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorDub)" 
                                    name="Dub (PT)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-sm border-2 border-dashed border-zinc-800 rounded-lg">
                            WAITING FOR ANALYSIS DATA
                        </div>
                    )}
                </div>
            </div>

            {/* Component: Timeline Visualizer */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
                 <Timeline segments={segments} duration={100} currentTime={currentTime} />
            </div>

            {/* Component: Logs */}
            <div className="flex-1 min-h-0">
                <LogTerminal logs={logs} />
            </div>
        </div>
      </div>
      
    </div>
  );
};

export default App;