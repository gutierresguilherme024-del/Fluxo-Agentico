import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import http from "http";
import dotenv from "dotenv";

dotenv.config();


const db = new Database("soulnode.db");
db.pragma("foreign_keys = ON");

// Python Agent Configuration
const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || "http://localhost:8000";

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    image TEXT
  );
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    name TEXT,
    soul TEXT,
    model TEXT,
    color TEXT,
    image TEXT,
    skills TEXT,
    FOREIGN KEY(companyId) REFERENCES companies(id)
  );
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    steps TEXT
  );
`);

// Migration: Add companyId to agents if it doesn't exist
try {
  db.prepare("SELECT companyId FROM agents LIMIT 1").get();
} catch (e: any) {
  if (e.message.includes("no such column: companyId")) {
    db.exec("ALTER TABLE agents ADD COLUMN companyId TEXT REFERENCES companies(id)");
    console.log("Migration: Added companyId column to agents table");
  }
}

// Seed initial data if empty
const companyCount = db.prepare("SELECT COUNT(*) as count FROM companies").get() as { count: number };
if (companyCount.count === 0) {
  db.prepare("INSERT INTO companies (id, name, description, image) VALUES (?, ?, ?, ?)").run(
    "c1", 
    "Jarvis Agents", 
    "Equipe de agentes inteligentes especializados em automacao e resolucao de problemas.",
    "https://picsum.photos/seed/tech/400/200"
  );

  const insertAgent = db.prepare("INSERT INTO agents (id, companyId, name, soul, model, color, image, skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertAgent.run("1", "c1", "Jarvis", "Voce eh o Jarvis, um assistente inteligente e amigavel que ajuda com tarefas de programacao e automacao.", "claude-opus-4-6", "#3b82f6", null, JSON.stringify(["Programacao", "Automacao", "Analise"]));
}

// Proxy function for Python Agent
function proxyToPythonAgent(req: express.Request, res: express.Response, targetPath: string) {
  const url = new URL(targetPath, PYTHON_AGENT_URL);

  const options: http.RequestOptions = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: url.host,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error("Agent proxy error:", err);
    res.status(503).json({
      error: "Python Agent unavailable",
      message: "The voice agent is currently offline. Please try again later.",
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
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '50mb' }));

<<<<<<< HEAD
  // CORS middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
=======
  // Python Agent Proxy Routes
  app.all("/api/agent/*", (req, res) => {
    const targetPath = req.path.replace("/api/agent", "") || "/";
    proxyToPythonAgent(req, res, targetPath);
  });

  app.all("/api/voice/*", (req, res) => {
    const targetPath = "/voice" + (req.path.replace("/api/voice", "") || "/");
    proxyToPythonAgent(req, res, targetPath);
  });

  app.get("/api/agent-status", async (req, res) => {
    try {
      const response = await fetch(`${PYTHON_AGENT_URL}/health`);
      const data = await response.json();
      res.json({ online: true, ...data });
    } catch {
      res.json({ online: false, message: "Python Agent is offline" });
>>>>>>> 3eb5769 (feat(jarvis-agent): Add Python FastAPI agent with voice integration)
    }
  });

  // Companies API
  app.get("/api/companies", (req, res) => {
    const companies = db.prepare("SELECT * FROM companies").all();
    res.json(companies);
  });

  app.post("/api/companies", (req, res) => {
    const { id, name, description, image } = req.body;
    const upsert = db.prepare(`
      INSERT INTO companies (id, name, description, image) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        name=excluded.name, 
        description=excluded.description, 
        image=excluded.image
    `);
    upsert.run(id, name, description, image);
    res.json({ success: true });
  });

  app.delete("/api/companies/:id", (req, res) => {
    db.prepare("DELETE FROM agents WHERE companyId = ?").run(req.params.id);
    db.prepare("DELETE FROM companies WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Agents API
  app.get("/api/agents", (req, res) => {
    const agents = db.prepare("SELECT * FROM agents").all().map((a: any) => ({
      ...a,
      skills: a.skills ? JSON.parse(a.skills) : []
    }));
    res.json(agents);
  });

  app.post("/api/agents", (req, res) => {
    const { id, companyId, name, soul, model, color, image, skills } = req.body;
    const upsert = db.prepare(`
      INSERT INTO agents (id, companyId, name, soul, model, color, image, skills) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        companyId=excluded.companyId,
        name=excluded.name, 
        soul=excluded.soul, 
        model=excluded.model, 
        color=excluded.color,
        image=excluded.image,
        skills=excluded.skills
    `);
    upsert.run(id, companyId, name, soul, model, color, image, JSON.stringify(skills || []));
    res.json({ success: true });
  });

  app.get("/api/workflows", (req, res) => {
    const workflows = db.prepare("SELECT * FROM workflows").all();
    res.json(workflows);
  });

  app.post("/api/workflows", (req, res) => {
    const { id, name, description, steps } = req.body;
    const upsert = db.prepare(`
      INSERT INTO workflows (id, name, description, steps) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        name=excluded.name, 
        description=excluded.description, 
        steps=excluded.steps
    `);
    upsert.run(id, name, description, JSON.stringify(steps));
    res.json({ success: true });
  });

  // Chat endpoint - Proxy to Python Agent
  app.post("/api/chat", async (req, res) => {
    try {
      const { agent_id, soul, user_id, message } = req.body;

      // Call Python Agent
      const agentResponse = await fetch(`${PYTHON_AGENT_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agent_id || "default",
          soul: soul || "Voce eh um assistente inteligente",
          user_id: user_id || "user",
          message: message
        })
      });

      if (!agentResponse.ok) {
        return res.status(agentResponse.status).json({
          error: "Erro ao chamar agente Python",
          details: await agentResponse.text()
        });
      }

      const data = await agentResponse.json();
      res.json(data);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(503).json({
        error: "Agente Python offline",
        message: "Nao conseguiu conectar ao agente Python. Verifique se esta rodando em " + PYTHON_AGENT_URL,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", python_agent_url: PYTHON_AGENT_URL });
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
    console.log(`[SERVER] Rodando em http://localhost:${PORT}`);
    console.log(`[AGENT] Conectando em ${PYTHON_AGENT_URL}`);
  });
}

startServer().catch(console.error);
