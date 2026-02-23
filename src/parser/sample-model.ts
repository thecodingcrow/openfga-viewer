/** Sample GitHub-style authorization model — org/team/repo RBAC. */
export const SAMPLE_FGA_MODEL = `model
  schema 1.1

type user

type team
  relations
    define member: [user]

type organization
  relations
    define admin: [user]
    define member: [user, team#member]

    define can_create_repo: admin or member

type repository
  relations
    define organization: [organization]
    define admin: [user, team#member]
    define writer: [user, team#member] or admin
    define reader: [user, team#member] or writer or member from organization

    define can_push: writer
    define can_read: reader
    define can_admin: admin

type issue
  relations
    define repository: [repository]
    define assignee: [user]

    define can_read: reader from repository
    define can_close: assignee or writer from repository
    define can_edit: assignee or admin from repository`;
