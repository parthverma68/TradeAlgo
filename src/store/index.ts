import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { marketApi } from '@/api/marketApi';
import auth from './authSlice';
import live from './liveSlice';
import settings from './settingsSlice';

export const store = configureStore({
  reducer: {
    auth, live, settings,
    [marketApi.reducerPath]: marketApi.reducer,
  },
  middleware: (gdm) => gdm().concat(marketApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
