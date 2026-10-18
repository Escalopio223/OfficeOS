import { EventEmitter } from 'events';
import crypto from 'crypto';

export const telemetryEvents = new EventEmitter();
// Aumentar el límite de listeners para múltiples clientes SSE conectados
telemetryEvents.setMaxListeners(200);

/**
 * Genera un hash corto legible (#a4f9) para identificar la sesión sin revelar datos personales
 */
export function generateSessionHash(sessionId: string): string {
  const hash = crypto.createHash('sha256').update(sessionId).digest('hex');
  return `#${hash.slice(0, 4).toLowerCase()}`;
}

/**
 * Categoriza el origen del tráfico (referrer) para analítica
 */
export function categorizeReferrer(referrer?: string): string {
  if (!referrer || referrer.trim() === '') return 'Directo';
  const lower = referrer.toLowerCase();
  if (lower.includes('linkedin.com')) return 'LinkedIn';
  if (lower.includes('github.com')) return 'GitHub';
  if (lower.includes('google.')) return 'Google';
  if (lower.includes('twitter.com') || lower.includes('t.co') || lower.includes('x.com')) return 'X / Twitter';
  if (lower.includes('reddit.com')) return 'Reddit';
  if (lower.includes('youtube.com')) return 'YouTube';

  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Referencia Externa';
  }
}

/**
 * Analizador seguro de User-Agent (RGPD compliance: sin almacenar IPs)
 */
export function parseUserAgent(ua?: string): { os: string; browser: string } {
  if (!ua) return { os: 'Desconocido', browser: 'Desconocido' };

  let os = 'Otro OS';
  if (/windows phone/i.test(ua)) os = 'Windows Phone';
  else if (/win(dows|98|me|nt|xp|vista|7|8|10|11)/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac(intosh| os x)/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Otro Navegador';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return { os, browser };
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  sessionHash: string;
}

export interface FileActivityEvent {
  type: 'created' | 'opened' | 'deleted';
  sessionHash: string;
  fileName: string;
  timestamp: string;
}
