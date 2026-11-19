import React from 'react';
import { MotionConfig } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import { Header, type HeaderProps } from '../header/Header';
import { GlobalEditorStyles } from '../common/GlobalEditorStyles';
import { EditorScreen, type EditorScreenProps } from './EditorScreen';
import { ReaderScreen, type ReaderScreenProps } from './ReaderScreen';
import { AppModalsHost, type AppModalsHostProps } from '../modals/AppModalsHost';

export interface AppWorkspaceHostProps {
  // Theme & Root layout
  visualStyle: 'standard' | 'neon';
  neonTextColored: boolean;
  isDarkMode: boolean;
  performanceMode: boolean;
  isKeyboardOpen: boolean;
  vvHeight: number;

  // Header Props
  headerProps: HeaderProps;

  // Workspace Screens
  activeView: 'editor' | 'reader';
  readerProps: Omit<ReaderScreenProps, 'isVisible'>;
  editorProps: Omit<EditorScreenProps, 'isVisible'>;

  // Modals & Popups Host
  modalsHostProps: AppModalsHostProps;
}

export const AppWorkspaceHost: React.FC<AppWorkspaceHostProps> = ({
  visualStyle,
  neonTextColored,
  isDarkMode,
  performanceMode,
  isKeyboardOpen,
  vvHeight,
  headerProps,
  activeView,
  readerProps,
  editorProps,
  modalsHostProps,
}) => {
  const globalPerfMode = usePerformanceStore((s) => s.performanceMode);
  const lowGpuMode = usePerformanceStore((s) => s.lowGpuMode);
  const effectivePerf = performanceMode || globalPerfMode;

  return (
    <MotionConfig reducedMotion={(effectivePerf || lowGpuMode) ? 'always' : 'user'}>
      <div
        className={cn(
          "flex flex-col w-full h-full relative font-sans overflow-hidden transition-colors duration-500 selection:bg-[rgb(var(--accent-color)/0.3)]",
          visualStyle === 'neon'
            ? "theme-neon bg-slate-950 text-cyan-400"
            : isDarkMode
            ? "bg-slate-950 text-slate-100"
            : "theme-light bg-white text-slate-900 border-slate-200",
          effectivePerf && "perf-mode",
          lowGpuMode && "low-gpu-mode"
        )}
        style={{
          height: isKeyboardOpen && vvHeight ? `${vvHeight}px` : '100dvh',
        }}
      >
        {/* Dynamic Theme & Editor Styles */}
        <GlobalEditorStyles visualStyle={visualStyle} neonTextColored={neonTextColored} />

        {/* Header / Main Toolbar */}
        <Header {...headerProps} />

        {/* Main Workspace Area: Reader Screen & Editor Screen */}
        <div className="flex flex-1 overflow-hidden relative">
          <ReaderScreen
            isVisible={activeView === 'reader'}
            {...readerProps}
          />

          <EditorScreen
            isVisible={activeView === 'editor'}
            {...editorProps}
          />
        </div>

        {/* Global Modals, Dialogs and Popups Host */}
        <AppModalsHost {...modalsHostProps} />
      </div>
    </MotionConfig>
  );
};
