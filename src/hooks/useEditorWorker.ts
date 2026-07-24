import { useEffect, useRef } from 'react';

export interface EditorStats {
  words: number;
  chars: number;
}

export function useEditorWorker(
  onStatsCalculated: (rawStats: EditorStats, cleanStats: EditorStats) => void
) {
  const workerRef = useRef<Worker | null>(null);
  const onStatsRef = useRef(onStatsCalculated);

  // Keep latest callback ref to avoid worker re-subscription loops
  useEffect(() => {
    onStatsRef.current = onStatsCalculated;
  }, [onStatsCalculated]);

  useEffect(() => {
    try {
      // Instantiate native Vite module Web Worker
      const worker = new Worker(new URL('../workers/editorWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const { type, payload } = e.data;
        if (type === 'CALCULATE_STATS_RESULT' && payload) {
          if (onStatsRef.current) {
            onStatsRef.current(payload.rawStats, payload.cleanStats);
          }
        }
      };
    } catch (err) {
      console.warn('Web Worker setup fallback to main thread:', err);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Subscribe to Zustand store directly to avoid App re-renders
    let timer: any;
    
    const calculate = (content: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.postMessage({
            id: String(Date.now()),
            type: 'CALCULATE_STATS',
            payload: { text: content }
          });
        } else {
          // Fallback calculations on main thread if worker unsupported
          const rawWords = content.trim() ? content.trim().split(/\s+/).length : 0;
          const rawChars = content.length;
          onStatsRef.current({ words: rawWords, chars: rawChars }, { words: rawWords, chars: rawChars });
        }
      }, 100);
    };

    const unsubscribe = import('../store').then(({ useEditorStore }) => {
       calculate(useEditorStore.getState().content); // initial
       return useEditorStore.subscribe((state, prevState) => {
          if (state.content !== prevState.content) {
             calculate(state.content);
          }
       });
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe.then(unsub => unsub());
    };
  }, []);
}
