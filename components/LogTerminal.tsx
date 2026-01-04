import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface LogTerminalProps {
  logs: LogEntry[];
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (level: string) => {
    switch (level) {
      case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'WARN': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'ERROR': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getColor = (level: string) => {
    switch (level) {
      case 'SUCCESS': return 'text-green-400';
      case 'WARN': return 'text-yellow-400';
      case 'ERROR': return 'text-red-400';
      default: return 'text-zinc-300';
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex flex-col h-full shadow-inner">
      <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Process Log / FFMPEG Output</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 bg-black/50"
      >
        {logs.length === 0 && (
          <div className="text-zinc-600 italic">Waiting for process to start...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-100">
            <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
            <div className="shrink-0 mt-0.5">{getIcon(log.level)}</div>
            <span className={`${getColor(log.level)} break-all`}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};