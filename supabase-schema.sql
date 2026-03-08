-- SQL for Supabase Editor
-- Link: https://wrwkhgwrxqpgjbvyfqql.supabase.co/project/wrwkhgwrxqpgjbvyfqql/editor

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  active_gateway TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  soul TEXT,
  model TEXT,
  color TEXT,
  image TEXT,
  skills JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]'::jsonb
);
