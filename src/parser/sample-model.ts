/** Reference AIP-AMS authorization model — full tenant-scoped RBAC. */
export const SAMPLE_FGA_MODEL = `model
  schema 1.1

# ─── IDENTITY ─────────────────────────────────────────────

type user
  relations
    define client: [client]

    define can_read: can_read from client
    define can_update: [user] or admin from client
    define can_delete: admin from client

# ─── TENANT ───────────────────────────────────────────────

type client
  relations
    define admin: [user]
    define director: [user]
    define manager: [user]
    define member: [user]

    define can_read: admin or director or manager or member

    define can_manage_users: admin
    define can_update_profile: admin or director

    define can_invite_user_as_admin: admin
    define can_invite_user_as_director: admin or director
    define can_invite_user_as_manager: admin or director or manager
    define can_invite_user_as_member: admin or director or manager

    define can_invite_agents: admin or director
    define can_create_category: admin
    define can_create_ip_owner: admin or director
    define can_create_trademark: admin or manager
    define can_create_task: admin or director or manager
    define can_create_agency: admin
    define can_edit_settings: admin
    define can_use_ask_ams: admin or director or manager or member

    define can_create_file: can_read

    define can_read_user: can_read
    define can_read_category: can_read
    define can_read_ip_owner: can_read
    define can_read_client_setting: can_read

# ─── FLAT RESOURCES ───────────────────────────────────────

type ip_owner
  relations
    define client: [client]
    define intellectual_property: [intellectual_property]

    define can_read: can_read from client or can_read from intellectual_property
    define can_update: admin from client or director from client or manager from client
    define can_archive: admin from client
    define can_unarchive: admin from client

type client_setting
  relations
    define client: [client]
    define ip_agency: [ip_agency]

    define can_read: can_read from client or member from ip_agency
    define can_update: admin from client

type jurisdiction
  relations
    define client: [client]
    define ip_agency: [ip_agency]

    define can_read: can_read from client or member from ip_agency
    define can_update: admin from client
    define can_onboard: member from ip_agency

type ip_agency
  relations
    define client: [client]

    define admin: [user]
    define member: [user] or admin

    define can_read: can_read from client or member
    define can_update: admin from client or member

    define can_add_member: admin from client or admin
    define can_remove_member: admin from client or admin
    define can_list_members: admin or member

# ─── HIERARCHICAL RESOURCES ───────────────────────────────

type category
  relations
    define client: [client]
    define parent: [category]

    define can_manage: [user] or can_create from parent or admin from client
    define can_create: can_manage
    define can_read: [user] or can_read from parent or can_read from client
    define can_update: can_manage
    define can_delete: can_manage

type intellectual_property
  relations
    define client: [client]
    define category: [category]
    define ip_agency: [ip_agency]

    define manager: [user] or can_manage from category
    define can_read: [user] or manager or can_read from category or admin from client or member from ip_agency
    define can_create: manager
    define can_update: manager or admin from client
    define can_archive: admin from client or director from client or manager from client

type task
  relations
    define can_change_status: manager from intellectual_property or admin from ip_agency or member from ip_agency
    define can_create: manager from intellectual_property
    define can_mark_complete: manager from intellectual_property
    define can_read: can_read from intellectual_property or member from ip_agency or admin from ip_agency
    define intellectual_property: [intellectual_property]
    define ip_agency: [ip_agency]

# ─── FILES ────────────────────────────────────────────────

type file
  relations
    define client: [client]

    define can_read: can_read from client
    define can_create: can_create_file from client
    define can_delete: admin from client
`;
