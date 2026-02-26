-- Add assistant_style to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS assistant_style TEXT DEFAULT 'friendly-tn';
