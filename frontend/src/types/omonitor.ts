export interface SystemMetricsCpu {
  percent: number;
  cores: number;
  model: string;
}

export interface SystemMetricsMemory {
  hostTotal: number;
  hostUsed: number;
  hostFree: number;
  hostPercent: number;
  processRss: number;
  processHeapUsed: number;
  processHeapTotal: number;
}

export interface InfrastructureHealth {
  postgres: {
    status: 'online' | 'offline';
    latencyMs: number;
  };
  redis: {
    status: 'online' | 'offline';
    latencyMs: number;
  };
  bullmq: {
    status: 'online' | 'offline';
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export interface SystemMetricsTick {
  timestamp: number;
  cpu: SystemMetricsCpu;
  memory: SystemMetricsMemory;
  uptime: number;
  eventLoopLagMs: number;
  health: InfrastructureHealth;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  sessionHash: string;
}

export interface TelemetrySessionItem {
  session_id: string;
  session_hash: string;
  os: string;
  browser: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  referrer: string;
  referrer_type: string;
  started_at: string;
  last_active_at: string;
  files_created: number;
  files_opened: number;
  files_deleted: number;
  duration_seconds: number | string;
  is_online: boolean;
  justUpdated?: boolean;
}

export interface TelemetrySummary {
  totalSessions: number;
  onlineCount: number;
  avgStaySeconds: number;
  totalFilesManipulated: number;
  totalFilesCreated: number;
  totalFilesOpened: number;
  totalFilesDeleted: number;
}

export interface FileActivityNotification {
  type: 'created' | 'opened' | 'deleted';
  sessionHash: string;
  fileName: string;
  timestamp: string;
}
