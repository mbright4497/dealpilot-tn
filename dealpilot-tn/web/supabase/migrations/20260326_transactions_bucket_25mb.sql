-- Align storage bucket limit with app upload cap (25MB = 26214400 bytes)
UPDATE storage.buckets
SET file_size_limit = 26214400
WHERE id = 'transactions';
