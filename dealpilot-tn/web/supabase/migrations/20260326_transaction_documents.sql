-- transaction_documents: multi-document contract management per transaction
-- Run in Supabase SQL editor after review. Do not execute from CI unless intended.

CREATE TABLE IF NOT EXISTS public.transaction_documents (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  document_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  version INTEGER DEFAULT 1,

  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,

  status TEXT DEFAULT 'uploaded',

  extracted_data JSONB,
  broker_review JSONB,
  deal_impact JSONB,

  is_executed BOOLEAN DEFAULT FALSE,
  executed_date DATE,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_documents_tx ON public.transaction_documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_documents_user ON public.transaction_documents(user_id);

ALTER TABLE public.transaction_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_transaction_documents" ON public.transaction_documents;
CREATE POLICY "own_transaction_documents"
  ON public.transaction_documents
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Private bucket: object path = {user_id}/{transaction_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transactions',
  'transactions',
  false,
  26214400,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "transactions_storage_select_own" ON storage.objects;
CREATE POLICY "transactions_storage_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'transactions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "transactions_storage_insert_own" ON storage.objects;
CREATE POLICY "transactions_storage_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'transactions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "transactions_storage_update_own" ON storage.objects;
CREATE POLICY "transactions_storage_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'transactions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "transactions_storage_delete_own" ON storage.objects;
CREATE POLICY "transactions_storage_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'transactions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
