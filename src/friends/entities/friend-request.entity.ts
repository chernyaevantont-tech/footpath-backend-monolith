// FriendRequest is represented as a relationship in Neo4j
// (sender:User)-[:REQUESTED_FRIENDSHIP { status, createdAt, id }]->(receiver:User)

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: Date;
}