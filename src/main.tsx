import "regenerator-runtime/runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNeutralino, initStorageRestore, startStorageAutosave } from "./services/nativeService";

async function init() {
  // First, initialize the Neutralino native bridge connection (no-op in browser mode)
  try {
    initNeutralino();
  } catch (err) {
    console.error("[Native Init] Failed to bootstrap Neutralino framework:", err);
  }

  // Restore previous state if running in Native mode
  try {
    await initStorageRestore();
  } catch (err) {
    console.error("[Native Init] Failed to restore backup from filesystem:", err);
  }

  // Set up the automated disk background backup (autosave)
  try {
    startStorageAutosave();
  } catch (err) {
    console.error("[Native Init] Failed to bind autosave scheduler:", err);
  }

  // Always mount React under any conditions to prevent screen freezes
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

init();

