-- Mission Control: Chat messages + Calendar events
-- Chat: persists all Mission Control <-> Tango conversations
CREATE TABLE IF NOT EXISTS mission_chat (
  id BIGSERIAL PRIMARY KEY,
  sender TEXT NOT NULL DEFAULT 'You',
  text TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','agent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar: hookable event store (Google Cal, iCal, manual entries)
CREATE TABLE IF NOT EXISTS calendar_events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  assigned_agent TEXT DEFAULT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','google','ical','openclaw','ghl')),
  external_id TEXT DEFAULT NULL,
  color TEXT DEFAULT 'bg-blue-500',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_created ON mission_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_agent ON calendar_events(assigned_agent);

-- Realtime for live chat updates
ALTER PUBLICATION supabase_realtime ADD TABLE mission_chat;
