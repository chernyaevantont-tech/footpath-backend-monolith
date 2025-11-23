export class CypherQueries {
  // Send friend request
  static SEND_FRIEND_REQUEST = `
    MATCH (sender:User {id: $senderId}), (receiver:User {id: $receiverId})
    WHERE sender.id <> receiver.id
    MERGE (sender)-[r:REQUESTED_FRIENDSHIP]->(receiver)
    SET r.id = randomUUID(), r.status = $status, r.createdAt = $createdAt
    RETURN r.id as requestId
  `;

  // Get friend request by ID
  static GET_FRIEND_REQUEST = `
    MATCH (sender:User)-[r:REQUESTED_FRIENDSHIP]->(receiver:User)
    WHERE r.id = $requestId
    RETURN r.id as id, r.status as status, r.createdAt as createdAt, 
           sender.id as senderId, receiver.id as receiverId
  `;

  // Get pending friend requests for a user
  static GET_FRIEND_REQUESTS_FOR_USER = `
    MATCH (sender:User)-[r:REQUESTED_FRIENDSHIP]->(receiver:User {id: $userId})
    WHERE r.status = $status
    RETURN r.id as id, r.status as status, r.createdAt as createdAt,
           sender.id as senderId, sender.email as senderEmail
  `;

  // Get sent friend requests by a user
  static GET_SENT_FRIEND_REQUESTS = `
    MATCH (sender:User {id: $userId})-[r:REQUESTED_FRIENDSHIP]->(receiver:User)
    WHERE r.status = $status
    RETURN r.id as id, r.status as status, r.createdAt as createdAt,
           receiver.id as receiverId, receiver.email as receiverEmail
  `;

  // Accept friend request (this converts the REQUESTED_FRIENDSHIP to FRIENDS relationship)
  static ACCEPT_FRIEND_REQUEST = `
    MATCH (sender:User)-[request:REQUESTED_FRIENDSHIP]->(receiver:User {id: $receiverId})
    WHERE request.id = $requestId AND request.status = 'pending'
    SET request.status = $newStatus, request.updatedAt = $updatedAt
    MERGE (receiver)-[:FRIENDS]->(sender)  // Create bidirectional friendship
    MERGE (sender)-[:FRIENDS]->(receiver)
    RETURN request.id as requestId, request.status as status
  `;

  // Reject friend request
  static REJECT_FRIEND_REQUEST = `
    MATCH (sender:User)-[request:REQUESTED_FRIENDSHIP]->(receiver:User {id: $receiverId})
    WHERE request.id = $requestId AND request.status = 'pending'
    SET request.status = $newStatus, request.updatedAt = $updatedAt
    RETURN request.id as requestId, request.status as status
  `;

  // Get friends of a user
  static GET_FRIENDS = `
    MATCH (user:User {id: $userId})-[:FRIENDS]-(friend:User)
    RETURN friend.id as id, friend.email as email, friend.name as name
  `;

  // Remove friend (delete the FRIENDS relationship in both directions)
  static REMOVE_FRIEND = `
    MATCH (user:User {id: $userId})-[r:FRIENDS]-(friend:User {id: $friendId})
    DELETE r
    RETURN count(r) as deletedCount
  `;

  // Cancel friend request
  static CANCEL_FRIEND_REQUEST = `
    MATCH (sender:User {id: $senderId})-[r:REQUESTED_FRIENDSHIP]->(receiver:User {id: $receiverId})
    WHERE r.status = 'pending'
    DELETE r
    RETURN count(r) as deletedCount
  `;
}