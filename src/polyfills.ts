/**
 * @stomp/stompjs uses TextEncoder/TextDecoder, which Hermes does not ship.
 * Must be imported before any STOMP code runs (see index.js).
 */
import { TextEncoder, TextDecoder } from 'text-encoding';

const g = globalThis as unknown as Record<string, unknown>;
if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;
