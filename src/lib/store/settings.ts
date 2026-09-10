import type { Settings, Theme } from '@/types';
import { createStore, useStore } from './createStore';

const STORAGE_KEY = 'gsr:settings:v1';

const DEFAULT_INTERVAL = Number(import.meta.env.PUBLIC_SIM_INTERVAL_MS ?? 2000);

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  showRoutes: true,
  showPorts: true,
  showVesselLabels: true,
  updateIntervalMs: Number.isFinite(DEFAULT_INTERVAL) && DEFAULT_INTERVAL >= 500 ? DEFAULT_INTERVAL : 2000,
  speedUnit: 'kn',
  distanceUnit: 'nm',
};

function load(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const settingsStore = createStore<Settings>(load());

function persist(state: Settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode, quota) – settings stay in memory */
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

settingsStore.subscribe(() => {
  const state = settingsStore.getState();
  persist(state);
  applyTheme(state.theme);
});

if (typeof document !== 'undefined') applyTheme(settingsStore.getState().theme);

export function updateSettings(partial: Partial<Settings>): void {
  settingsStore.setState(partial);
}

export function resetSettings(): void {
  settingsStore.setState(DEFAULT_SETTINGS);
}

export function useSettings<S>(selector: (s: Settings) => S): S {
  return useStore(settingsStore, selector);
}
