import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("soulnode.db");
db.pragma("foreign_keys = ON");

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
    "TechNova Solutions", 
    "A leading software development firm specializing in AI and cloud infrastructure.",
    "https://picsum.photos/seed/tech/400/200"
  );

  const insertAgent = db.prepare("INSERT INTO agents (id, companyId, name, soul, model, color, image, skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertAgent.run("1", "c1", "Architect", "You are a senior software architect focused on clean code and scalability.", "gemini-3.1-pro-preview", "#3b82f6", null, JSON.stringify(["Clean Architecture", "Scalability", "TypeScript"]));
  insertAgent.run("2", "c1", "Creative", "You are a creative writer and designer who thinks outside the box.", "gemini-3.1-flash-lite-preview", "#ec4899", null, JSON.stringify(["Creative Writing", "UI/UX Design", "Storytelling"]));
  insertAgent.run("3", "c1", "Debugger", "You are a meticulous debugger who finds the most obscure bugs.", "gemini-3-flash-preview", "#10b981", null, JSON.stringify(["Bug Hunting", "Performance Tuning", "Unit Testing"]));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

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
  });
}

startServer();
