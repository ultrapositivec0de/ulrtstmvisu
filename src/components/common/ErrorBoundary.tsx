import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-6 bg-slate-900 border border-red-500/30 rounded-2xl space-y-4 shadow-xl">
            <h2 className="text-xl font-bold text-red-400">Сталася помилка інтерфейсу</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Невідома помилка під час рендерингу.'}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              Скинути локальні дані та перезавантажити
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
