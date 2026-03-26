ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS assistant_style TEXT DEFAULT 'friendly_tn',
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ALTER COLUMN assistant_style SET DEFAULT 'friendly_tn';

UPDATE profiles
SET assistant_style = 'friendly_tn'
WHERE assistant_style IS NULL OR assistant_style = 'friendly-tn';
