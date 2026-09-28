import { create } from 'zustand';

export interface HistorySnapshot {
  content: string;
  cursorStart?: number;
  cursorEnd?: number;
  mode?: 'markdown' | 'visual';
  timestamp: number;
}

export interface HistoryStoreState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  maxHistory: number;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  pushSnapshot: (
    snapshot: Omit<HistorySnapshot, 'timestamp'>,
    immediate?: boolean
  ) => void;
  undo: (currentSnapshot?: Omit<HistorySnapshot, 'timestamp'>) => HistorySnapshot | null;
  redo: (currentSnapshot?: Omit<HistorySnapshot, 'timestamp'>) => HistorySnapshot | null;
  clearHistory: () => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSnapshot: HistorySnapshot | null = null;

export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,
  canUndo: false,
  canRedo: false,

  pushSnapshot: (snapshotInput, immediate = false) => {
    const newSnapshot: HistorySnapshot = {
      ...snapshotInput,
      timestamp: Date.now(),
    };

    const commitSnapshot = (snap: HistorySnapshot) => {
      const { past, maxHistory } = get();
      
      // Do not push identical consecutive snapshots
      if (past.length > 0 && past[past.length - 1].content === snap.content) {
        return;
      }

      const updatedPast = [...past.slice(-(maxHistory - 1)), snap];
      set({
        past: updatedPast,
        future: [], // New user action invalidates Redo stack
        canUndo: updatedPast.length > 0,
        canRedo: false,
      });
    };

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (immediate) {
      pendingSnapshot = null;
      commitSnapshot(newSnapshot);
    } else {
      pendingSnapshot = newSnapshot;
      debounceTimer = setTimeout(() => {
        if (pendingSnapshot) {
          commitSnapshot(pendingSnapshot);
          pendingSnapshot = null;
        }
        debounceTimer = null;
      }, 750);
    }
  },

  undo: (currentSnapshotInput) => {
    // Flush any pending debounced snapshot first
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    
    const { past, future } = get();
    if (past.length === 0) return null;

    const previousSnapshot = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    // Record current state into future stack for Redo if provided
    let newFuture = future;
    if (currentSnapshotInput) {
      const currentSnap: HistorySnapshot = {
        ...currentSnapshotInput,
        timestamp: Date.now(),
      };
      newFuture = [currentSnap, ...future];
    } else if (pendingSnapshot) {
      newFuture = [pendingSnapshot, ...future];
      pendingSnapshot = null;
    }

    set({
      past: newPast,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: newFuture.length > 0,
    });

    return previousSnapshot;
  },

  redo: (currentSnapshotInput) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const { past, future, maxHistory } = get();
    if (future.length === 0) return null;

    const nextSnapshot = future[0];
    const newFuture = future.slice(1);

    let newPast = past;
    if (currentSnapshotInput) {
      const currentSnap: HistorySnapshot = {
        ...currentSnapshotInput,
        timestamp: Date.now(),
      };
      newPast = [...past.slice(-(maxHistory - 1)), currentSnap];
    }

    set({
      past: newPast,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: newFuture.length > 0,
    });

    return nextSnapshot;
  },

  clearHistory: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingSnapshot = null;
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));
