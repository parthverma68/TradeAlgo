/**
 * Holds data pushed over WebSocket. Kept separate from RTK Query cache so a
 * dropped socket never invalidates REST-fetched state — the UI degrades to
 * polling instead of going blank. See docs/04-STATE-DATA-FLOW.md
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PreOpen, AlertItem, LiveQuote } from '@/types';

export type ConnState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

interface LiveState {
  connection: ConnState;
  lastMessageAt: string | null;
  verdicts: Record<string, PreOpen>;
  /** Streaming last-traded prices, keyed by symbol. */
  quotes: Record<string, LiveQuote>;
  liveAlerts: AlertItem[];
  networkOnline: boolean;
}
const initialState: LiveState = {
  connection: 'idle', lastMessageAt: null, verdicts: {}, quotes: {},
  liveAlerts: [], networkOnline: true,
};

const slice = createSlice({
  name: 'live',
  initialState,
  reducers: {
    connectionChanged: (s, a: PayloadAction<ConnState>) => { s.connection = a.payload; },
    networkChanged: (s, a: PayloadAction<boolean>) => { s.networkOnline = a.payload; },
    verdictPushed: (s, a: PayloadAction<PreOpen>) => {
      s.verdicts[a.payload.symbol] = a.payload;
      s.lastMessageAt = new Date().toISOString();
    },
    quoteTicked: (s, a: PayloadAction<LiveQuote>) => {
      s.quotes[a.payload.symbol] = a.payload;
      s.lastMessageAt = a.payload.asOf;
    },
    alertPushed: (s, a: PayloadAction<AlertItem>) => {
      s.liveAlerts.unshift(a.payload);
      s.liveAlerts = s.liveAlerts.slice(0, 50);
      s.lastMessageAt = new Date().toISOString();
    },
    liveCleared: (s) => { s.verdicts = {}; s.quotes = {}; s.liveAlerts = []; },
  },
});

export const {
  connectionChanged, networkChanged, verdictPushed, quoteTicked, alertPushed, liveCleared,
} = slice.actions;
export default slice.reducer;
