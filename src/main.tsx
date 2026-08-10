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

// import '@fontsource/inter/400.css';
// import '@fontsource/inter/700.css';
// import '@fontsource/inter/900.css';
// import '@fontsource/roboto/400.css';
// import '@fontsource/roboto/700.css';
// import '@fontsource/open-sans/400.css';
// import '@fontsource/open-sans/700.css';
// import '@fontsource/montserrat/400.css';
// import '@fontsource/montserrat/700.css';
// import '@fontsource/montserrat/900.css';
// import '@fontsource/poppins/400.css';
// import '@fontsource/poppins/700.css';
// import '@fontsource/lato/400.css';
// import '@fontsource/lato/700.css';
// import '@fontsource/rubik/400.css';
// import '@fontsource/rubik/700.css';
// import '@fontsource/ubuntu/400.css';
// import '@fontsource/ubuntu/700.css';
// import '@fontsource/kanit/400.css';
// import '@fontsource/kanit/700.css';
// import '@fontsource/work-sans/400.css';
// import '@fontsource/work-sans/700.css';
// import '@fontsource/merriweather/400.css';
// import '@fontsource/merriweather/700.css';
// import '@fontsource/lora/400.css';
// import '@fontsource/lora/700.css';
// import '@fontsource/lora/400-italic.css';
// import '@fontsource/lora/700-italic.css';
// import '@fontsource/playfair-display/400.css';
// import '@fontsource/playfair-display/700.css';
// import '@fontsource/playfair-display/400-italic.css';
// import '@fontsource/playfair-display/700-italic.css';
// import '@fontsource/jetbrains-mono/400.css';
// import '@fontsource/jetbrains-mono/700.css';
// import '@fontsource/fira-code/400.css';
// import '@fontsource/fira-code/500.css';
// import '@fontsource/source-code-pro/400.css';
// import '@fontsource/source-code-pro/700.css';
// import '@fontsource/outfit/400.css';
// import '@fontsource/outfit/700.css';
// import '@fontsource/outfit/900.css';
// import '@fontsource/space-grotesk/400.css';
// import '@fontsource/space-grotesk/700.css';
// import '@fontsource/comfortaa/400.css';
// import '@fontsource/comfortaa/700.css';
// import '@fontsource/raleway/400.css';
// import '@fontsource/raleway/700.css';
// import '@fontsource/oswald/400.css';
// import '@fontsource/oswald/700.css';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
