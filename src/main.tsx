import { Buffer } from 'buffer';

// Polyfills MUST run before any other imports that might depend on them
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}
if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
