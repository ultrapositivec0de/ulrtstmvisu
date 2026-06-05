import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handler for debugging white screens
window.addEventListener('error', (e) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'absolute';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.width = '100%';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerHTML = `<h3>Error: ${e.message}</h3><pre>${e.error?.stack}</pre>`;
  document.body.appendChild(errorDiv);
});

window.addEventListener('unhandledrejection', (e) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'absolute';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.backgroundColor = 'darkred';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.width = '100%';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerHTML = `<h3>Unhandled Promise Rejection: ${e.reason?.message || e.reason}</h3><pre>${e.reason?.stack}</pre>`;
  document.body.appendChild(errorDiv);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
