-- Optional location for weather and local context (defaults to app region if unset)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS zip TEXT;
