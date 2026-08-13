import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

interface AuthState { token: string | null; user: User | null; hydrated: boolean; }
const initialState: AuthState = { token: null, user: null, hydrated: false };

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsReceived: (s, a: PayloadAction<{ token: string; user: User }>) => {
      s.token = a.payload.token; s.user = a.payload.user;
    },
    hydrated: (s, a: PayloadAction<{ token: string | null; user: User | null }>) => {
      s.token = a.payload.token; s.user = a.payload.user; s.hydrated = true;
    },
    loggedOut: (s) => { s.token = null; s.user = null; },
  },
});

export const { credentialsReceived, hydrated, loggedOut } = slice.actions;
export default slice.reducer;
