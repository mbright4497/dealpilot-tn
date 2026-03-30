-- Persist OpenAI thread ID per agent phone for Reva SMS conversation memory
CREATE TABLE IF NOT EXISTS reva_sms_threads (
  phone TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
