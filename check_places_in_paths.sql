-- Check places in paths and their statuses
SELECT 
    p.id as place_id,
    p.name as place_name,
    p.status as place_status,
    pp."pathId" as path_id,
    pp."order" as visit_order
FROM places p
JOIN path_places pp ON p.id = pp."placeId"
ORDER BY pp."pathId", pp."order"
LIMIT 30;
