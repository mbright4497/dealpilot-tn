-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  deal_id BIGINT,
  type TEXT NOT NULL CHECK (type IN ('deadline_warning','document_uploaded','checklist_completed','system','message')),
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_deal ON notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
