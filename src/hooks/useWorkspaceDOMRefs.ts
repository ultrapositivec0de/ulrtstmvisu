import { useRef } from 'react';
import { useEditorStore } from '../store';

export interface WorkspaceDOMRefs {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  isSyncingRef: React.MutableRefObject<boolean>;
  lastSyncContentRef: React.MutableRefObject<string>;
  previewRef: React.RefObject<HTMLDivElement | null>;
  previewPaneRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  editorPaneRef: React.RefObject<HTMLDivElement | null>;
  isFirstRender: React.MutableRefObject<boolean>;
  hasLoadedRef: React.MutableRefObject<boolean>;
  wysiwygSyncTimeoutRef: React.MutableRefObject<number | null>;
  wysiwygLocalBackupTimeoutRef: React.MutableRefObject<number | null>;
}

export function useWorkspaceDOMRefs(): WorkspaceDOMRefs {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const wysiwygRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const lastSyncContentRef = useRef<string>(useEditorStore.getState().content);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewPaneRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef<boolean>(true);
  const hasLoadedRef = useRef<boolean>(false);
  const wysiwygSyncTimeoutRef = useRef<number | null>(null);
  const wysiwygLocalBackupTimeoutRef = useRef<number | null>(null);

  return {
    editorRef,
    wysiwygRef,
    isSyncingRef,
    lastSyncContentRef,
    previewRef,
    previewPaneRef,
    fileInputRef,
    scrollRef,
    editorPaneRef,
    isFirstRender,
    hasLoadedRef,
    wysiwygSyncTimeoutRef,
    wysiwygLocalBackupTimeoutRef,
  };
}
