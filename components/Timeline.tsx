import React from 'react';
import { SyncSegment } from '../types';

interface TimelineProps {
  segments: SyncSegment[];
  duration: number; // in seconds
  currentTime: number;
}

export const Timeline: React.FC<TimelineProps> = ({ segments, duration, currentTime }) => {
  // Calculate percentage width for a segment
  const getWidth = (start: number, end: number) => {
    return ((end - start) / duration) * 100;
  };

  const getLeft = (start: number) => {
    return (start / duration) * 100;
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs text-zinc-500 font-mono uppercase tracking-widest mb-1">
        <span>Timeline Composition</span>
        <span>{Math.floor(duration / 60)}m {Math.floor(duration % 60)}s</span>
      </div>
      
      <div className="relative h-12 bg-zinc-900 rounded border border-zinc-800 overflow-hidden w-full">
        {/* Base Grid */}
        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border-r border-zinc-500 h-full"></div>
          ))}
        </div>

        {/* Segments */}
        {segments.map((seg, idx) => (
          <div
            key={idx}
            className={`absolute h-full border-r border-black/10 transition-all duration-300 ${
              seg.source === 'DUB_PT' 
                ? 'bg-emerald-600/80 hover:bg-emerald-500' 
                : 'bg-blue-600/80 hover:bg-blue-500'
            }`}
            style={{
              left: `${getLeft(seg.start)}%`,
              width: `${getWidth(seg.start, seg.end)}%`,
            }}
            title={`${seg.source} (${seg.reason})`}
          >
            {/* Striped pattern for patched segments */}
            {seg.source === 'MASTER_EN' && (
               <div className="w-full h-full opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#fff_5px,#fff_10px)]"></div>
            )}
          </div>
        ))}

        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 transition-all duration-75 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        ></div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px] uppercase font-bold tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div>
          <span className="text-zinc-400">PT-BR (Original Dub)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          <span className="text-zinc-400">EN-US (Master Fill)</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-zinc-500">
           <span>Total Segments: {segments.length}</span>
           <span className="mx-2">|</span>
           <span>Patched Gaps: {segments.filter(s => s.source === 'MASTER_EN').length}</span>
        </div>
      </div>
    </div>
  );
};