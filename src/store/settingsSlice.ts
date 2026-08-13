import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PlanKey } from '@/types';

interface SettingsState {
  activeSymbol: string;
  symbols: string[];
  notificationsEnabled: boolean;
  alertTypes: Record<string, boolean>;
  /** False until the welcome screen has been dismissed once. */
  onboarded: boolean;
  /** Local mock of the paid plan — gates premium indicator groups and alerts. */
  plan: PlanKey;
}
const initialState: SettingsState = {
  activeSymbol: 'NIFTY',
  symbols: ['NIFTY', 'BANKNIFTY'],
  notificationsEnabled: true,
  alertTypes: { iv_spike: true, unusual_oi: true, gap_up: true, reversal: false },
  onboarded: false,
  plan: 'free',
};

const slice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    symbolSelected: (s, a: PayloadAction<string>) => { s.activeSymbol = a.payload; },
    notificationsToggled: (s, a: PayloadAction<boolean>) => { s.notificationsEnabled = a.payload; },
    alertTypeToggled: (s, a: PayloadAction<string>) => {
      s.alertTypes[a.payload] = !s.alertTypes[a.payload];
    },
    onboardingHydrated: (s, a: PayloadAction<boolean>) => { s.onboarded = a.payload; },
    onboardingCompleted: (s) => { s.onboarded = true; },
    planChanged: (s, a: PayloadAction<PlanKey>) => { s.plan = a.payload; },
  },
});

export const {
  symbolSelected, notificationsToggled, alertTypeToggled,
  onboardingHydrated, onboardingCompleted, planChanged,
} = slice.actions;
export default slice.reducer;
