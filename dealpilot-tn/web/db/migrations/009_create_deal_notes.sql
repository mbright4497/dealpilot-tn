-- Migration: Create deal_notes table

CREATE TABLE IF NOT EXISTS deal_notes (
  id SERIAL PRIMARY KEY,
  deal_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  author TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
