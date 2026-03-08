import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || "http://localhost:8000";

// Proxy reverso simples para o FastAPI Python
function proxyToPython(req: express.Request, res: express.Response, targetPath: string) {
  const options = {
    hostname: "localhost",
    port: 8000,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: "localhost:8000" },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", () => {
    res.status(503).json({
      error: "Agente Python offline",
      message: "Inicie o servidor Python: cd agent && python main.py",
      docs: `${PYTHON_AGENT_URL}/docs`
    });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // ── Proxy para o Agente Python (FastAPI na porta 8000) ─────────────────────
  app.all("/api/agent/*", (req, res) => {
    const targetPath = req.path.replace("/api/agent", "") + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "");
    proxyToPython(req, res, targetPath || "/health");
  });

  app.all("/api/voice/*", (req, res) => {
    const targetPath = "/voice" + req.path.replace("/api/voice", "") + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "");
    proxyToPython(req, res, targetPath);
  });

  // Status do agente Python
  app.get("/api/agent-status", async (req, res) => {
    try {
      const response = await fetch("http://localhost:8000/health");
      const data = await response.json();
      res.json({ online: true, ...data });
    } catch {
      res.json({ online: false, message: "Agente Python offline. Execute: cd agent && python main.py" });
    }
  });

  // Companies API

  app.get("/api/companies", async (req, res) => {
    try {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json(error);
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const { id, name, description, image } = req.body;
      const { error } = await supabase.from('companies').upsert({
        id,
        name,
        description,
        image
      });
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json(error);
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json(error);
    }
  });

  // Agents API
  app.get("/api/agents", async (req, res) => {
    try {
      const { data, error } = await supabase.from('agents').select('*');
      if (error) throw error;
      res.json(data.map((agent: any) => ({
        ...agent,
        companyId: agent.company_id,
        skills: Array.isArray(agent.skills) ? agent.skills : (agent.skills ? JSON.parse(agent.skills) : [])
      })));
    } catch (error) {
      res.status(500).json(error);
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      const { id, companyId, name, soul, model, color, image, skills } = req.body;
      const { error } = await supabase.from('agents').upsert({
        id,
        company_id: companyId,
        name,
        soul,
        model,
        color,
        image,
        skills: Array.isArray(skills) ? skills : []
      });
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json(error);
    }
  });

  // Workflows API
  app.get("/api/workflows", async (req, res) => {
    try {
      const { data, error } = await supabase.from('workflows').select('*');
      if (error) throw error;
      res.json(data.map((wf: any) => ({
        ...wf,
        steps: Array.isArray(wf.steps) ? wf.steps : (wf.steps ? JSON.parse(wf.steps) : [])
      })));
    } catch (error) {
      res.status(500).json(error);
    }
  });

  app.post("/api/workflows", async (req, res) => {
    try {
      const { id, name, description, steps } = req.body;
      const { error } = await supabase.from('workflows').upsert({
        id,
        name,
        description,
        steps: Array.isArray(steps) ? steps : []
      });
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json(error);
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
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Supabase integrated: ${supabaseUrl}`);
  });
}

startServer();
