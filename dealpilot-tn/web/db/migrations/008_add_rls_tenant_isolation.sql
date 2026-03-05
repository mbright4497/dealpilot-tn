-- Migration 008: Add user_id columns and RLS policies for tenant isolation

-- 1) Add user_id columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='user_id') THEN
    ALTER TABLE deals ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='user_id') THEN
    ALTER TABLE contacts ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deadlines' AND column_name='user_id') THEN
    ALTER TABLE deadlines ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='offer_scores' AND column_name='user_id') THEN
    ALTER TABLE offer_scores ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_log' AND column_name='user_id') THEN
    ALTER TABLE activity_log ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deal_deadlines' AND column_name='user_id') THEN
    ALTER TABLE deal_deadlines ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deal_checklist_items' AND column_name='user_id') THEN
    ALTER TABLE deal_checklist_items ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversation_log' AND column_name='user_id') THEN
    ALTER TABLE conversation_log ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
    ALTER TABLE notifications ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_extractions' AND column_name='user_id') THEN
    ALTER TABLE document_extractions ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction_parties' AND column_name='user_id') THEN
    ALTER TABLE transaction_parties ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_logs' AND column_name='user_id') THEN
    ALTER TABLE message_logs ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END$$;

-- 2) For existing rows, set user_id to first auth user
DO $$
DECLARE u uuid;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NOT NULL THEN
    UPDATE deals SET user_id = u WHERE user_id IS NULL;
    UPDATE contacts SET user_id = u WHERE user_id IS NULL;
    UPDATE deadlines SET user_id = u WHERE user_id IS NULL;
    UPDATE offer_scores SET user_id = u WHERE user_id IS NULL;
    UPDATE activity_log SET user_id = u WHERE user_id IS NULL;
    UPDATE deal_deadlines SET user_id = u WHERE user_id IS NULL;
    UPDATE deal_checklist_items SET user_id = u WHERE user_id IS NULL;
    UPDATE conversation_log SET user_id = u WHERE user_id IS NULL;
    UPDATE notifications SET user_id = u WHERE user_id IS NULL;
    UPDATE document_extractions SET user_id = u WHERE user_id IS NULL;
    UPDATE transaction_parties SET user_id = u WHERE user_id IS NULL;
    UPDATE message_logs SET user_id = u WHERE user_id IS NULL;
  END IF;
END$$;

-- 3) Drop existing public_access policies if present
-- (Assumes policies are named public_access on each table)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('deals','contacts','deadlines','offer_scores','activity_log','deal_deadlines','deal_checklist_items','conversation_log','notifications','document_extractions','transaction_parties','message_logs')
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS public_access ON %I', r.tablename);
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
  END LOOP;
END$$;

-- 4) Enable RLS and create per-table policies
-- Helper to create simple policies

-- Deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY deals_select ON deals FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY deals_insert ON deals FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY deals_update ON deals FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
CREATE POLICY deals_delete ON deals FOR DELETE USING ( auth.uid() = user_id );

-- Contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_select ON contacts FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY contacts_insert ON contacts FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY contacts_update ON contacts FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
CREATE POLICY contacts_delete ON contacts FOR DELETE USING ( auth.uid() = user_id );

-- Deadlines (child of deals)
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY deadlines_select ON deadlines FOR SELECT USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deadlines.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deadlines_insert ON deadlines FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deadlines.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deadlines_update ON deadlines FOR UPDATE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deadlines.deal_id AND deals.user_id = auth.uid()) ) WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deadlines.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deadlines_delete ON deadlines FOR DELETE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deadlines.deal_id AND deals.user_id = auth.uid()) );

-- Repeat for other child tables similarly
ALTER TABLE offer_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY offer_scores_select ON offer_scores FOR SELECT USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = offer_scores.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY offer_scores_insert ON offer_scores FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = offer_scores.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY offer_scores_update ON offer_scores FOR UPDATE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = offer_scores.deal_id AND deals.user_id = auth.uid()) ) WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = offer_scores.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY offer_scores_delete ON offer_scores FOR DELETE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = offer_scores.deal_id AND deals.user_id = auth.uid()) );

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_log_select ON activity_log FOR SELECT USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = activity_log.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY activity_log_insert ON activity_log FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = activity_log.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY activity_log_update ON activity_log FOR UPDATE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = activity_log.deal_id AND deals.user_id = auth.uid()) ) WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = activity_log.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY activity_log_delete ON activity_log FOR DELETE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = activity_log.deal_id AND deals.user_id = auth.uid()) );

ALTER TABLE deal_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_deadlines_select ON deal_deadlines FOR SELECT USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_deadlines.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deal_deadlines_insert ON deal_deadlines FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_deadlines.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deal_deadlines_update ON deal_deadlines FOR UPDATE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_deadlines.deal_id AND deals.user_id = auth.uid()) ) WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_deadlines.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deal_deadlines_delete ON deal_deadlines FOR DELETE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_deadlines.deal_id AND deals.user_id = auth.uid()) );

ALTER TABLE deal_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_checklist_items_select ON deal_checklist_items FOR SELECT USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_checklist_items.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deal_checklist_items_insert ON deal_checklist_items FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_checklist_items.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deal_checklist_items_update ON deal_checklist_items FOR UPDATE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_checklist_items.deal_id AND deals.user_id = auth.uid()) ) WITH CHECK ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_checklist_items.deal_id AND deals.user_id = auth.uid()) );
CREATE POLICY deal_checklist_items_delete ON deal_checklist_items FOR DELETE USING ( EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_checklist_items.deal_id AND deals.user_id = auth.uid()) );

ALTER TABLE conversation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_log_select ON conversation_log FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY conversation_log_insert ON conversation_log FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY conversation_log_update ON conversation_log FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
CREATE POLICY conversation_log_delete ON conversation_log FOR DELETE USING ( auth.uid() = user_id );

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select ON notifications FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY notifications_update ON notifications FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
CREATE POLICY notifications_delete ON notifications FOR DELETE USING ( auth.uid() = user_id );

ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_extractions_select ON document_extractions FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY document_extractions_insert ON document_extractions FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY document_extractions_update ON document_extractions FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
CREATE POLICY document_extractions_delete ON document_extractions FOR DELETE USING ( auth.uid() = user_id );

ALTER TABLE transaction_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY transaction_parties_select ON transaction_parties FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY transaction_parties_insert ON transaction_parties FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY transaction_parties_update ON transaction_parties FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
CREATE POLICY transaction_parties_delete ON transaction_parties FOR DELETE USING ( auth.uid() = user_id );

ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY message_logs_select ON message_logs FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY message_logs_insert ON message_logs FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY message_logs_update ON message_logs FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
CREATE POLICY message_logs_delete ON message_logs FOR DELETE USING ( auth.uid() = user_id );

-- end migration
