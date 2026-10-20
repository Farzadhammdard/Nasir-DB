// Schema per §42. `counters`, `role_permissions` and `sessions` are additions:
// §42 lists the *minimum* tables, and transaction-safe numbering (§19) plus
// revocable login sessions (§30 disable user) cannot be built without them.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS roles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  key           TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  is_system     INTEGER NOT NULL DEFAULT 0,
  grants_all    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS permissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  group_name  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  username               TEXT NOT NULL UNIQUE,
  full_name              TEXT NOT NULL DEFAULT '',
  password_hash          TEXT NOT NULL,
  password_salt          TEXT NOT NULL,
  role_id                INTEGER NOT NULL REFERENCES roles(id),
  is_active              INTEGER NOT NULL DEFAULT 1,
  is_owner               INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  deleted_at             TEXT
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token        TEXT PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  user_agent   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS counters (
  key        TEXT PRIMARY KEY,
  next_value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_number TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  is_permanent    INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  default_price_minor INTEGER NOT NULL DEFAULT 0,
  unit                TEXT NOT NULL DEFAULT '',
  is_active           INTEGER NOT NULL DEFAULT 1,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number         TEXT NOT NULL UNIQUE,
  customer_id         INTEGER NOT NULL REFERENCES customers(id),
  user_id             INTEGER REFERENCES users(id),
  bill_date           TEXT NOT NULL,
  subtotal_minor      INTEGER NOT NULL DEFAULT 0,
  discount_minor      INTEGER NOT NULL DEFAULT 0,
  grand_total_minor   INTEGER NOT NULL DEFAULT 0,
  paid_minor          INTEGER NOT NULL DEFAULT 0,
  remaining_minor     INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft',
  note                TEXT NOT NULL DEFAULT '',
  print_count         INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  deleted_at          TEXT
);

CREATE TABLE IF NOT EXISTS bill_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id          INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  service_id       INTEGER REFERENCES services(id) ON DELETE SET NULL,
  service_name     TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  quantity         REAL NOT NULL,
  unit_price_minor INTEGER NOT NULL,
  total_minor      INTEGER NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_number TEXT NOT NULL UNIQUE,
  customer_id    INTEGER NOT NULL REFERENCES customers(id),
  bill_id        INTEGER REFERENCES bills(id) ON DELETE SET NULL,
  user_id        INTEGER REFERENCES users(id),
  amount_minor   INTEGER NOT NULL,
  payment_date   TEXT NOT NULL,
  method         TEXT NOT NULL DEFAULT 'cash',
  note           TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  voided_at      TEXT,
  void_reason    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS expense_types (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_number  TEXT NOT NULL UNIQUE,
  expense_type_id INTEGER NOT NULL REFERENCES expense_types(id),
  amount_minor    INTEGER NOT NULL,
  expense_date    TEXT NOT NULL,
  note            TEXT NOT NULL DEFAULT '',
  user_id         INTEGER REFERENCES users(id),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  report_number         TEXT NOT NULL UNIQUE,
  week_start            TEXT NOT NULL UNIQUE,
  week_end              TEXT NOT NULL,
  revenue_minor         INTEGER NOT NULL DEFAULT 0,
  expenses_minor        INTEGER NOT NULL DEFAULT 0,
  profit_minor          INTEGER NOT NULL DEFAULT 0,
  bills_count           INTEGER NOT NULL DEFAULT 0,
  customers_count       INTEGER NOT NULL DEFAULT 0,
  total_paid_minor      INTEGER NOT NULL DEFAULT 0,
  total_remaining_minor INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'archived',
  adjustments_note      TEXT NOT NULL DEFAULT '',
  is_manual             INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL,
  bucket_key  TEXT,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  payload     TEXT NOT NULL DEFAULT '{}',
  total_minor INTEGER NOT NULL DEFAULT 0,
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  UNIQUE (kind, bucket_key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username   TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL DEFAULT '',
  details    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offline_queue (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  operation    TEXT NOT NULL,
  payload      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS backups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  note        TEXT NOT NULL DEFAULT '',
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_name       ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_permanent  ON customers(is_permanent, deleted_at);
CREATE INDEX IF NOT EXISTS idx_bills_customer       ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_date           ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_status         ON bills(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill      ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer    ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill        ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_date        ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type        ON expenses(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_audit_created        ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity         ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_queue_status         ON offline_queue(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_end   ON weekly_reports(week_end);
CREATE INDEX IF NOT EXISTS idx_sessions_user        ON sessions(user_id);
`;

export const PERMISSIONS = [
  { key: 'dashboard.view', group: 'dashboard' },
  { key: 'bills.view', group: 'bills' },
  { key: 'bills.create', group: 'bills' },
  { key: 'bills.edit', group: 'bills' },
  { key: 'bills.delete', group: 'bills' },
  { key: 'customers.view', group: 'customers' },
  { key: 'customers.manage', group: 'customers' },
  { key: 'payments.view', group: 'payments' },
  { key: 'payments.create', group: 'payments' },
  { key: 'expenses.view', group: 'expenses' },
  { key: 'expenses.manage', group: 'expenses' },
  { key: 'reports.view', group: 'reports' },
  { key: 'reports.manage', group: 'reports' },
  { key: 'users.manage', group: 'users' },
  { key: 'settings.manage', group: 'settings' },
  { key: 'backup.create', group: 'backup' },
  { key: 'backup.restore', group: 'backup' },
];

const DEFAULT_USER_PERMISSIONS = [
  'dashboard.view',
  'bills.view',
  'bills.create',
  'customers.view',
  'payments.view',
  'payments.create',
  'expenses.view',
  'reports.view',
];

const SYSTEM_ROLES = [
  { key: 'admin', name: 'Administrator', grantsAll: 1 },
  { key: 'user', name: 'Staff', grantsAll: 0 },
];

// Runs on every open, so it must stay idempotent and must use the raw handle:
// getDb() has not finished assigning `handle` yet at this point.
export function seedReferenceData(db) {
  const now = new Date().toISOString();
  const insertRole = db.prepare(
    'INSERT OR IGNORE INTO roles (key, name, is_system, grants_all, created_at) VALUES (?, ?, 1, ?, ?)'
  );
  for (const role of SYSTEM_ROLES) {
    insertRole.run(role.key, role.name, role.grantsAll, now);
  }

  const insertPermission = db.prepare(
    'INSERT OR IGNORE INTO permissions (key, group_name, sort_order) VALUES (?, ?, ?)'
  );
  PERMISSIONS.forEach((permission, index) => {
    insertPermission.run(permission.key, permission.group, index + 1);
  });

  const userRoleId = db.prepare("SELECT id FROM roles WHERE key = 'user'").get()?.id;
  if (userRoleId) {
    const insertRolePermission = db.prepare(
      'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
    );
    for (const key of DEFAULT_USER_PERMISSIONS) {
      const permissionId = db.prepare('SELECT id FROM permissions WHERE key = ?').get(key)?.id;
      if (permissionId) insertRolePermission.run(userRoleId, permissionId);
    }
  }

  const defaultServices = ['برشکاری', 'CNC', 'نوار با ماشین', 'زاویه برش', 'نوار ساده', 'نوار دبل'];
  for (const [index, name] of defaultServices.entries()) {
    if (!db.prepare('SELECT id FROM services WHERE name = ? LIMIT 1').get(name)) {
      db.prepare('INSERT INTO services (name, is_active, sort_order, created_at, updated_at) VALUES (?, 1, ?, ?, ?)').run(name, index + 1, now, now);
    }
  }

  const defaultExpenseTypes = ['مواد اولیه', 'حمل و نقل', 'کرایه', 'سایر'];
  for (const [index, name] of defaultExpenseTypes.entries()) {
    if (!db.prepare('SELECT id FROM expense_types WHERE name = ? LIMIT 1').get(name)) {
      db.prepare('INSERT INTO expense_types (name, is_active, sort_order, created_at, updated_at) VALUES (?, 1, ?, ?, ?)').run(name, index + 1, now, now);
    }
  }

}
