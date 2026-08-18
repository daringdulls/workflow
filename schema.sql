-- Reference only. The app creates these automatically on first run
-- (see src/lib/db.ts -> ensureSchema()), so you do NOT need to run this
-- by hand. It's here so you can see the shape of your data, or restore it
-- manually if you ever need to.

CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  profile TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🔗',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  profile TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS design_orders (
  id SERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS freelance_projects (
  id SERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'lead',
  deadline DATE,
  rate TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  profile TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  notes TEXT
);
