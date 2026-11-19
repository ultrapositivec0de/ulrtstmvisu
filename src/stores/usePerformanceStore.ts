import { create } from 'zustand';

const PERF_STORAGE_KEY = 'steem_performance_mode';
const LOW_GPU_STORAGE_KEY = 'steem_low_gpu_mode';

function getInitialPerformanceMode(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(PERF_STORAGE_KEY) !== 'false';
}

function getInitialLowGpuMode(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(LOW_GPU_STORAGE_KEY) === 'true';
}

export function syncPerformanceClassesToRoot(performanceMode: boolean, lowGpuMode: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('perf-mode', performanceMode);
  root.classList.toggle('low-gpu-mode', lowGpuMode);
}

const initialPerf = getInitialPerformanceMode();
const initialLowGpu = getInitialLowGpuMode();
syncPerformanceClassesToRoot(initialPerf, initialLowGpu);

export interface PerformanceStoreState {
  performanceMode: boolean;
  lowGpuMode: boolean;
  setPerformanceMode: (action: boolean | ((prev: boolean) => boolean)) => void;
  setLowGpuMode: (action: boolean | ((prev: boolean) => boolean)) => void;
}

export const usePerformanceStore = create<PerformanceStoreState>((set) => ({
  performanceMode: initialPerf,
  lowGpuMode: initialLowGpu,

  setPerformanceMode: (action) =>
    set((state) => {
      const next = typeof action === 'function' ? action(state.performanceMode) : action;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PERF_STORAGE_KEY, String(next));
      }
      syncPerformanceClassesToRoot(next, state.lowGpuMode);
      return { performanceMode: next };
    }),

  setLowGpuMode: (action) =>
    set((state) => {
      const next = typeof action === 'function' ? action(state.lowGpuMode) : action;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOW_GPU_STORAGE_KEY, String(next));
      }
      syncPerformanceClassesToRoot(state.performanceMode, next);
      return { lowGpuMode: next };
    }),
}));
