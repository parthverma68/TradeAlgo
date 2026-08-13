/**
 * DOWNSTREAM BOUNDARY (analytics).
 * Buffered, fire-and-forget event sink. Never blocks the UI and never throws.
 * Swap the transport for your analytics vendor without touching call sites.
 */
type Event = { name: string; props?: Record<string, unknown>; ts: string };

const buffer: Event[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function track(name: string, props?: Record<string, unknown>) {
  buffer.push({ name, props, ts: new Date().toISOString() });
  if (buffer.length > 50) buffer.splice(0, buffer.length - 50);
}

export function startTelemetry(sink?: (events: Event[]) => Promise<void>) {
  if (flushTimer) return;
  flushTimer = setInterval(async () => {
    if (!buffer.length) return;
    const batch = buffer.splice(0, buffer.length);
    try { await sink?.(batch); } catch { /* analytics must never break the app */ }
  }, 30000);
}

export function stopTelemetry() {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
}
