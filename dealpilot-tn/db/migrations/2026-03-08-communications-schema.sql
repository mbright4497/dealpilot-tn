-- 1. deal_contacts: links contacts to deals with roles
CREATE TABLE IF NOT EXISTS public.deal_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('buyer','seller','lender','title_company','home_inspector','appraiser','surveyor','engineer','opposing_agent','transaction_coordinator','other')),
  comm_preference text NOT NULL DEFAULT 'agent_managed' CHECK (comm_preference IN ('agent_managed','client_direct')),
  preferred_channel text DEFAULT 'email' CHECK (preferred_channel IN ('sms','email','phone')),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT deal_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT deal_contacts_unique UNIQUE (deal_id, contact_id, role)
);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal ON public.deal_contacts(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_contact ON public.deal_contacts(contact_id);

-- 2. Enhance existing contacts table
ALTER TABLE IF EXISTS public.contacts ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE IF EXISTS public.contacts ADD COLUMN IF NOT EXISTS role_type text;
ALTER TABLE IF EXISTS public.contacts ADD COLUMN IF NOT EXISTS ghl_contact_id text;

-- 3. Enhance existing communication_log
ALTER TABLE IF EXISTS public.communication_log ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.communication_log ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE IF EXISTS public.communication_log ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE IF EXISTS public.communication_log ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('draft','queued','sent','delivered','failed','received'));
ALTER TABLE IF EXISTS public.communication_log ADD COLUMN IF NOT EXISTS template_id uuid;
ALTER TABLE IF EXISTS public.communication_log ADD COLUMN IF NOT EXISTS is_automated boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_comm_log_contact ON public.communication_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_comm_log_deal ON public.communication_log(deal_id);

-- 4. message_templates: TN-specific templates per deal phase
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('welcome','inspection','earnest_money','appraisal','title','underwriting','clear_to_close','closing','general','check_in')),
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  subject text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT message_templates_pkey PRIMARY KEY (id)
);

-- 5. auto_update_schedule: 48hr client check-in scheduler
CREATE TABLE IF NOT EXISTS public.auto_update_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  frequency_hours int NOT NULL DEFAULT 48,
  template_id uuid REFERENCES public.message_templates(id),
  next_send_at timestamptz,
  last_sent_at timestamptz,
  is_active boolean DEFAULT true,
  channel text DEFAULT 'sms' CHECK (channel IN ('sms','email')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT auto_update_schedule_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_auto_schedule_next ON public.auto_update_schedule(next_send_at) WHERE is_active = true;

-- 6. Seed system templates
INSERT INTO public.message_templates (name, category, channel, subject, body, is_system, variables) VALUES
('Welcome - Under Contract', 'welcome', 'email', 'Congratulations! Your offer has been accepted', 'Hi {{client_name}}, congratulations on getting under contract at {{property_address}}! I am your transaction coordinator and will be guiding you through every step to closing. Your next milestone is the home inspection, which needs to be completed by {{inspection_deadline}}. I will be in touch every couple of days with updates. Please do not hesitate to reach out anytime.', true, '["client_name","property_address","inspection_deadline"]'),
('Inspection Scheduled', 'inspection', 'sms', NULL, 'Hi {{client_name}}, your home inspection at {{property_address}} is scheduled for {{inspection_date}} at {{inspection_time}}. The inspector is {{inspector_name}} ({{inspector_phone}}). Please plan to attend if possible. Let me know if you have questions!', true, '["client_name","property_address","inspection_date","inspection_time","inspector_name","inspector_phone"]'),
('Earnest Money Reminder', 'earnest_money', 'sms', NULL, 'Hi {{client_name}}, reminder that earnest money of {{earnest_amount}} is due by {{earnest_deadline}}. Please wire or deliver to {{title_company}}. Let me know once sent and I will confirm receipt.', true, '["client_name","earnest_amount","earnest_deadline","title_company"]'),
('48hr Check-In', 'check_in', 'sms', NULL, 'Hi {{client_name}}, just checking in on {{property_address}}. {{update_text}} As always, feel free to reach out with any questions. We are on track!', true, '["client_name","property_address","update_text"]'),
('Clear to Close', 'clear_to_close', 'email', 'Great news - You are clear to close!', 'Hi {{client_name}}, great news! The lender has issued clear to close for {{property_address}}. Closing is scheduled for {{closing_date}} at {{closing_location}}. I will send over the settlement statement for your review 24 hours before closing. Congratulations, we are almost there!', true, '["client_name","property_address","closing_date","closing_location"]')
ON CONFLICT DO NOTHING;
