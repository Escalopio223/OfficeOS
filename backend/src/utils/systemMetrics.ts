import os from 'os';
import { performance } from 'perf_hooks';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { Queue } from 'bullmq';

// Estado previo de CPU para cálculo diferencial
let prevCpuTimes: { idle: number; total: number } | null = null;

export function getCpuSnapshot(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    const times = cpu.times;
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }

  return { idle, total };
}

// Inicializar muestra de CPU
prevCpuTimes = getCpuSnapshot();

export function calculateCpuPercent(): number {
  const current = getCpuSnapshot();
  if (!prevCpuTimes) {
    prevCpuTimes = current;
    return 0;
  }

  const deltaIdle = current.idle - prevCpuTimes.idle;
  const deltaTotal = current.total - prevCpuTimes.total;
  prevCpuTimes = current;

  if (deltaTotal <= 0) return 0;
  const fraction = 1 - deltaIdle / deltaTotal;
  return Math.max(0, Math.min(100, Math.round(fraction * 1000) / 10));
}

// Medición de Event Loop Lag
let lastEventLoopLag = 0;
function measureEventLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now();
    setImmediate(() => {
      const lag = Math.max(0, performance.now() - start);
      lastEventLoopLag = Math.round(lag * 10) / 10;
      resolve(lastEventLoopLag);
    });
  });
}

// Instancia de cola BullMQ para supervisión en tiempo real
let systemQueue: Queue | null = null;

export function getOrCreateSystemQueue(redisClient: Redis): Queue {
  if (!systemQueue) {
    systemQueue = new Queue('system-tasks', {
      connection: redisClient as any,
    });
  }
  return systemQueue;
}

export interface SystemMetricsPayload {
  timestamp: number;
  cpu: {
    percent: number;
    cores: number;
    model: string;
  };
  memory: {
    hostTotal: number;
    hostUsed: number;
    hostFree: number;
    hostPercent: number;
    processRss: number;
    processHeapUsed: number;
    processHeapTotal: number;
  };
  uptime: number;
  eventLoopLagMs: number;
  health: {
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
  };
}

export async function collectSystemMetrics(
  pool: Pool,
  redis: Redis
): Promise<SystemMetricsPayload> {
  const cpuPercent = calculateCpuPercent();
  const lag = await measureEventLoopLag();

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = process.memoryUsage();

  // 1. Healthcheck PostgreSQL
  let pgStatus: 'online' | 'offline' = 'offline';
  let pgLatency = -1;
  try {
    const t0 = performance.now();
    await pool.query('SELECT 1');
    pgLatency = Math.round((performance.now() - t0) * 10) / 10;
    pgStatus = 'online';
  } catch {
    pgStatus = 'offline';
  }

  // 2. Healthcheck Redis
  let redisStatus: 'online' | 'offline' = 'offline';
  let redisLatency = -1;
  try {
    const t0 = performance.now();
    await redis.ping();
    redisLatency = Math.round((performance.now() - t0) * 10) / 10;
    redisStatus = 'online';
  } catch {
    redisStatus = 'offline';
  }

  // 3. Healthcheck BullMQ
  let bullStatus: 'online' | 'offline' = 'offline';
  let queueCounts = { waiting: 0, active: 0, completed: 0, failed: 0 };
  try {
    if (redisStatus === 'online') {
      const q = getOrCreateSystemQueue(redis);
      const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed');
      queueCounts = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      };
      bullStatus = 'online';
    }
  } catch {
    bullStatus = 'offline';
  }

  const cpus = os.cpus();

  return {
    timestamp: Date.now(),
    cpu: {
      percent: cpuPercent,
      cores: cpus.length,
      model: cpus[0]?.model || 'CPU Genérica',
    },
    memory: {
      hostTotal: totalMem,
      hostUsed: usedMem,
      hostFree: freeMem,
      hostPercent: Math.round((usedMem / totalMem) * 1000) / 10,
      processRss: memUsage.rss,
      processHeapUsed: memUsage.heapUsed,
      processHeapTotal: memUsage.heapTotal,
    },
    uptime: Math.floor(process.uptime()),
    eventLoopLagMs: lag,
    health: {
      postgres: {
        status: pgStatus,
        latencyMs: pgLatency,
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatency,
      },
      bullmq: {
        status: bullStatus,
        ...queueCounts,
      },
    },
  };
}
