-- Check if any rejected places are used in paths
SELECT 
    p.id as place_id,
    p.name as place_name,
    p.status,
    COUNT(pp."pathId") as paths_count,
    string_agg(pp."pathId"::text, ', ') as path_ids
FROM places p
LEFT JOIN path_places pp ON p.id = pp."placeId"
WHERE p.status = 'rejected'
GROUP BY p.id, p.name, p.status;
