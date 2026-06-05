import express from "express";
import path from "path";
import { promises as fs } from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to read configurations
  app.get("/api/configs", async (_req, res) => {
    try {
      const tauriConfPath = path.join(process.cwd(), "src-tauri/tauri.conf.json");
      const cargoTomlPath = path.join(process.cwd(), "src-tauri/Cargo.toml");
      const releaseWorkflowPath = path.join(process.cwd(), ".github/workflows/release.yml");

      let tauriConf = null;
      let tauriConfRaw = "";
      let cargoToml = "";
      let releaseWorkflow = "";

      try {
        tauriConfRaw = await fs.readFile(tauriConfPath, "utf-8");
        tauriConf = JSON.parse(tauriConfRaw);
      } catch (e) {
        console.warn("Tauri conf not found or invalid", e);
      }

      try {
        cargoToml = await fs.readFile(cargoTomlPath, "utf-8");
      } catch (e) {
        console.warn("Cargo.toml not found", e);
      }

      try {
        releaseWorkflow = await fs.readFile(releaseWorkflowPath, "utf-8");
      } catch (e) {
        console.warn("Workflow file not found", e);
      }

      res.json({
        tauriConf,
        tauriConfRaw,
        cargoToml,
        releaseWorkflow,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to update configuration files
  app.post("/api/save-config", async (req, res) => {
    const { content, type } = req.body;
    try {
      if (type === "tauri.conf.json") {
        const filePath = path.join(process.cwd(), "src-tauri/tauri.conf.json");
        // Pretty print parsed JSON (or use string raw if sent as raw)
        const output = typeof content === "object" ? JSON.stringify(content, null, 2) : content;
        await fs.writeFile(filePath, output, "utf-8");
        return res.json({ success: true, message: "tauri.conf.json has been updated and saved!" });
      } else if (type === "release.yml") {
        const filePath = path.join(process.cwd(), ".github/workflows/release.yml");
        await fs.writeFile(filePath, content, "utf-8");
        return res.json({ success: true, message: "release.yml GitHub Action workflow has been updated and saved!" });
      } else if (type === "cargo.toml") {
        const filePath = path.join(process.cwd(), "src-tauri/Cargo.toml");
        await fs.writeFile(filePath, content, "utf-8");
        return res.json({ success: true, message: "Cargo.toml has been updated and saved!" });
      }
      res.status(400).json({ error: "Invalid configuration type received." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express-Vite Fullstack Server running on http://localhost:${PORT}`);
  });
}

startServer();
