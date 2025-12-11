-- Check all places and their statuses
SELECT 
    id,
    name,
    status,
    created_at
FROM places
ORDER BY created_at DESC
LIMIT 30;
