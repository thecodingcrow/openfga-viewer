/** Trimmed AIP-AMS subset for type-level graph testing. Use Import for full model. */
export const SAMPLE_FGA_MODEL = `model
  schema 1.1

type user
  relations
    define client: [client]
    define can_read: can_read from client

type client
  relations
    define admin: [user]
    define director: [user]
    define member: [user]
    define can_read: admin or director or member

type ip_owner
  relations
    define client: [client]
    define can_read: can_read from client
    define can_update: admin from client or director from client

type ip_agency
  relations
    define client: [client]
    define admin: [user]
    define member: [user] or admin
    define can_read: can_read from client or member
`;
