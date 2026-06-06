import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initStorageRestore, startStorageAutosave } from "./services/nativeService";

async function init() {
  try {
    // Restore local storage from filesystem backup before React mount
    await initStorageRestore();
  } catch (err) {
    console.error("[Native Init] Failed to restore backup:", err);
  }

  try {
    // Start periodic background disk-backup service
    startStorageAutosave();
  } catch (err) {
    console.error("[Native Init] Failed to start autosave:", err);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

init();

