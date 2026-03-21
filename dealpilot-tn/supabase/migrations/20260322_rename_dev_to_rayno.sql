-- Rename 'dev' agent to 'rayno' (Rayno = Software Engineer per org structure)
-- Also update agent_status FK reference

-- Step 1: Remove old agent_status row for 'dev'
DELETE FROM agent_status WHERE agent_id = 'dev';

-- Step 2: Update agent_registry id and display_name
UPDATE agent_registry SET id = 'rayno', display_name = 'Rayno' WHERE id = 'dev';

-- Step 3: Re-insert agent_status for 'rayno'
INSERT INTO agent_status (agent_id, status) VALUES ('rayno', 'idle') ON CONFLICT (agent_id) DO NOTHING;
