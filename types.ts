export interface AudioFile {
  name: string;
  size: number;
  type: string; // e.g., 'audio/x-matroska'
  duration?: number;
  channels?: string; // '5.1', '7.1', '2.0'
  codec?: string; // 'DTS-HD', 'E-AC3'
}

export enum ProcessState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: number;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface SyncSegment {
  start: number;
  end: number;
  source: 'MASTER_EN' | 'DUB_PT';
  reason: 'GAP_FILL' | 'ORIGINAL_DUB' | 'CENSORED_SCENE';
}

export interface AnalysisData {
  time: number;
  rmsMaster: number;
  rmsDub: number;
  isGap: number; // 0 or 1 for visualization
}