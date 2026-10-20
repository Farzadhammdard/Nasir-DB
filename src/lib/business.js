import { all, get, run, tx } from './db.js';
import { getAppConfig, getSetting, setManySettings, setSetting } from './settings.js';
import { nextSequence, peekSequence } from './numbering.js';
import { toMinor } from './money.js';
import { addDays, businessDate, eachWeekStart, isValidDate, nowIso, weekEndOf, weekStartOf } from './dates.js';
import { hashPassword, requirePermission, requireUser } from './auth.js';
import { AppError, classifyError, validationError } from './errors.js';
import { logError } from './log.js';

const RESOURCE_PERMISSION = {
  dashboard: 'dashboard.view', customers: 'customers.view', dues: 'customers.view',
  bills: 'bills.view', payments: 'payments.view', expenses: 'expenses.view',
  reports: 'reports.view', notifications: null, settings: 'settings.manage', permissions: 'users.manage',
  services: 'settings.manage', 'expense-types': 'settings.manage', users: 'users.manage',
  backup: 'backup.create', audit: 'settings.manage',
};

function fail(code, kind = 'validation', status = 422) {
  throw new AppError(kind, code, { status });
}

function validDate(value, fallback = businessDate()) {
  const date = String(value || fallback);
  if (!isValidDate(date)) fail('تاریخ معتبر وارد کنید.');
  return date;
}

function audit(user, action, entity, entityId = '', details = '') {
  run(
    'INSERT INTO audit_logs (user_id, username, action, entity, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user.id, user.username, action, entity, String(entityId), details, nowIso()]
  );
}

function sequence(kind) {
  const config = {
    start: Number(getSetting(`${kind}.start`, '1')),
    pad: Number(getSetting(`${kind}.pad`, '3')),
    prefix: getSetting(`${kind}.prefix`, ''),
  };
  return nextSequence(kind, config).formatted;
}

function rowsForCustomer() {
  return all(`SELECT c.*,
    COALESCE((SELECT SUM(b.grand_total_minor) FROM bills b WHERE b.customer_id=c.id AND b.deleted_at IS NULL),0) AS total_minor,
    COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.customer_id=c.id AND p.voided_at IS NULL),0) AS paid_minor,
    MAX(0,COALESCE((SELECT SUM(b.grand_total_minor) FROM bills b WHERE b.customer_id=c.id AND b.deleted_at IS NULL),0)-COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.customer_id=c.id AND p.voided_at IS NULL),0)) AS remaining_minor,
    (SELECT MAX(p.payment_date) FROM payments p WHERE p.customer_id=c.id AND p.voided_at IS NULL) AS last_payment
    FROM customers c WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC`);
}

function customerDetails(id) {
  const customer = rowsForCustomer().find((row) => row.id === id);
  if (!customer) return null;
  customer.bills = all('SELECT id,bill_number,bill_date,grand_total_minor,paid_minor,remaining_minor,status FROM bills WHERE customer_id=? AND deleted_at IS NULL ORDER BY bill_date DESC', [id]);
  customer.payments = all('SELECT p.id,p.payment_number,p.payment_date,p.amount_minor,p.method,p.note,b.bill_number FROM payments p LEFT JOIN bills b ON b.id=p.bill_id WHERE p.customer_id=? AND p.voided_at IS NULL ORDER BY p.payment_date DESC', [id]);
  return customer;
}

function insertCustomer(input, user, permanent = true) {
  const name = String(input.name ?? '').trim();
  if (!name) fail('نام مشتری الزامی است.');
  const now = nowIso();
  const customerNumber = sequence('customer');
  const result = run(
    `INSERT INTO customers (customer_number, name, phone, address, description, is_permanent, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [customerNumber, name, String(input.phone ?? '').trim(), String(input.address ?? '').trim(), String(input.description ?? '').trim(), permanent ? 1 : 0, now, now]
  );
  audit(user, 'created', 'customer', result.lastInsertRowid, customerNumber);
  return result.lastInsertRowid;
}

function updateBillTotals(billId) {
  const bill = get('SELECT * FROM bills WHERE id = ?', [billId]);
  if (!bill) return;
  const paid = Number(get('SELECT COALESCE(SUM(amount_minor),0) AS total FROM payments WHERE bill_id = ? AND voided_at IS NULL', [billId]).total);
  const remaining = Math.max(0, bill.grand_total_minor - paid);
  run('UPDATE bills SET paid_minor=?, remaining_minor=?, status=?, updated_at=? WHERE id=?', [paid, remaining, remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid', nowIso(), billId]);
}

function addPayment(input, user) {
  const amount = toMinor(input.amount);
  if (amount <= 0) fail('مبلغ پرداخت باید بیشتر از صفر باشد.', 'validation');
  const bill = input.billId ? get('SELECT * FROM bills WHERE id=? AND deleted_at IS NULL', [Number(input.billId)]) : null;
  if (input.billId && !bill) fail('بل پیدا نشد.');
  const customerId = Number(input.customerId || bill?.customer_id);
  if (!customerId || !get('SELECT id FROM customers WHERE id=? AND deleted_at IS NULL', [customerId])) fail('مشتری را انتخاب کنید.');
  if (bill && bill.customer_id !== customerId) fail('مشتری پرداخت با مشتری بل یکسان نیست.');
  if (bill) {
    const currentPaid = Number(get('SELECT COALESCE(SUM(amount_minor),0) AS total FROM payments WHERE bill_id=? AND voided_at IS NULL', [bill.id]).total);
    if (currentPaid + amount > bill.grand_total_minor) fail('مبلغ پرداخت از باقی بل بیشتر است.');
  }
  const now = nowIso();
  const number = sequence('payment');
  const result = run(
    `INSERT INTO payments (payment_number, customer_id, bill_id, user_id, amount_minor, payment_date, method, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [number, customerId, bill?.id ?? null, user.id, amount, validDate(input.date), String(input.method || 'cash'), String(input.note || '').trim(), now, now]
  );
  if (bill) updateBillTotals(bill.id);
  audit(user, 'created', 'payment', result.lastInsertRowid, number);
  return result.lastInsertRowid;
}

function createBill(input, user) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) fail('بل باید حداقل یک قلم داشته باشد.');
  for (const item of items) {
    if (!String(item.serviceName || item.serviceId || '').trim()) fail('خدمت هر قلم را مشخص کنید.');
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) fail('تعداد باید بیشتر از صفر باشد.');
    if (toMinor(item.unitPrice) < 0) fail('قیمت نمی‌تواند منفی باشد.');
  }
  return tx(() => {
    let customerId = Number(input.customerId) || 0;
    if (!customerId) {
      const name = String(input.customerName ?? '').trim();
      if (!name) fail('نام مشتری الزامی است.');
      const permanent = Boolean(input.isPermanent);
      const phone = String(input.customerPhone ?? '').trim();
      const existing = permanent && phone ? get('SELECT id FROM customers WHERE phone=? AND deleted_at IS NULL ORDER BY id LIMIT 1', [phone]) : null;
      customerId = existing?.id || insertCustomer({ name, phone, address: input.customerAddress }, user, permanent);
    }
    const customer = get('SELECT id FROM customers WHERE id=? AND deleted_at IS NULL', [customerId]);
    if (!customer) fail('مشتری پیدا نشد.');
    const calculatedItems = items.map((item, index) => {
      const service = item.serviceId ? get('SELECT id, name FROM services WHERE id=? AND is_active=1', [Number(item.serviceId)]) : null;
      const quantity = Number(item.quantity);
      const unitPrice = toMinor(item.unitPrice);
      return { serviceId: service?.id ?? null, name: service?.name ?? String(item.serviceName ?? '').trim(), description: String(item.description ?? '').trim(), quantity, unitPrice, total: Math.round(quantity * unitPrice), sort: index };
    });
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
    const discount = toMinor(input.discount);
    if (discount < 0 || discount > subtotal) fail('تخفیف باید بین صفر و جمع اقلام باشد.');
    const grandTotal = subtotal - discount;
    const paid = toMinor(input.paid);
    if (paid < 0 || paid > grandTotal) fail('پرداخت اولیه از مجموع بل بیشتر است.');
    const now = nowIso();
    const number = sequence('bill');
    const result = run(
      `INSERT INTO bills (bill_number, customer_id, user_id, bill_date, subtotal_minor, discount_minor, grand_total_minor, paid_minor, remaining_minor, status, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [number, customerId, user.id, validDate(input.date), subtotal, discount, grandTotal, grandTotal, 'unpaid', String(input.note || '').trim(), now, now]
    );
    const billId = result.lastInsertRowid;
    for (const item of calculatedItems) run(
      'INSERT INTO bill_items (bill_id, service_id, service_name, description, quantity, unit_price_minor, total_minor, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [billId, item.serviceId, item.name, item.description, item.quantity, item.unitPrice, item.total, item.sort]
    );
    if (paid > 0) addPayment({ customerId, billId, amount: paid / 100, date: input.date, note: 'پرداخت هنگام ثبت بل' }, user);
    audit(user, 'created', 'bill', billId, number);
    return billId;
  });
}

function billDetails(id) {
  const bill = get(`SELECT b.*, c.customer_number, c.name AS customer_name, c.phone AS customer_phone
    FROM bills b JOIN customers c ON c.id=b.customer_id WHERE b.id=? AND b.deleted_at IS NULL`, [id]);
  if (!bill) return null;
  bill.items = all('SELECT * FROM bill_items WHERE bill_id=? ORDER BY sort_order,id', [id]);
  bill.payments = all('SELECT * FROM payments WHERE bill_id=? AND voided_at IS NULL ORDER BY payment_date DESC', [id]);
  return bill;
}

function archiveReports() {
  const first = get(`SELECT MIN(day) AS day FROM (
    SELECT bill_date AS day FROM bills WHERE deleted_at IS NULL
    UNION ALL SELECT expense_date AS day FROM expenses WHERE deleted_at IS NULL
  )`).day;
  if (!first) return;
  const today = businessDate();
  const currentStart = weekStartOf(today);
  const last = get('SELECT week_start FROM weekly_reports ORDER BY week_start DESC LIMIT 1')?.week_start;
  const starts = eachWeekStart(last ? addDays(last, 7) : weekStartOf(first), addDays(currentStart, -1));
  for (const start of starts) {
    if (start >= currentStart || get('SELECT id FROM weekly_reports WHERE week_start=?', [start])) continue;
    const end = weekEndOf(start);
    const revenue = Number(get('SELECT COALESCE(SUM(grand_total_minor),0) AS v FROM bills WHERE deleted_at IS NULL AND bill_date BETWEEN ? AND ?', [start, end]).v);
    const expenses = Number(get('SELECT COALESCE(SUM(amount_minor),0) AS v FROM expenses WHERE deleted_at IS NULL AND expense_date BETWEEN ? AND ?', [start, end]).v);
    const paid = Number(get('SELECT COALESCE(SUM(amount_minor),0) AS v FROM payments WHERE voided_at IS NULL AND payment_date BETWEEN ? AND ?', [start, end]).v);
    const bills = Number(get('SELECT COUNT(*) AS v FROM bills WHERE deleted_at IS NULL AND bill_date BETWEEN ? AND ?', [start, end]).v);
    const customers = Number(get('SELECT COUNT(DISTINCT customer_id) AS v FROM bills WHERE deleted_at IS NULL AND bill_date BETWEEN ? AND ?', [start, end]).v);
    const remaining = Number(get(`SELECT COALESCE(SUM(MAX(0,b.grand_total_minor-COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.bill_id=b.id AND p.voided_at IS NULL AND p.payment_date<=?),0))),0) AS v
      FROM bills b WHERE b.deleted_at IS NULL AND b.bill_date<=?`, [end,end]).v);
    tx(() => {
      const number = sequence('report');
      const now = nowIso();
      run('INSERT OR IGNORE INTO weekly_reports (report_number, week_start, week_end, revenue_minor, expenses_minor, profit_minor, bills_count, customers_count, total_paid_minor, total_remaining_minor, status, is_manual, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)', [number, start, end, revenue, expenses, revenue - expenses, bills, customers, paid, remaining, 'archived', now, now]);
    });
  }
}

function maybeCreateDueNotification() {
  const today = businessDate();
  if (new Date(`${today}T00:00:00Z`).getUTCDay() !== 4) return;
  const rows = rowsForCustomer().filter((row) => row.remaining_minor > 0);
  if (!rows.length) return;
  const total = rows.reduce((sum, row) => sum + row.remaining_minor, 0);
  const body = rows.slice(0, 10).map((row) => `${row.name}: ${row.remaining_minor}`).join('\n');
  run('INSERT OR IGNORE INTO notifications (kind, bucket_key, title, body, payload, total_minor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', ['weekly-dues', today, 'یادآوری باقی‌داری هفتگی', body, JSON.stringify({ customers: rows.map(({ id, name, remaining_minor }) => ({ id, name, remaining: remaining_minor })) }), total, nowIso()]);
}

function dashboardData() {
  archiveReports();
  maybeCreateDueNotification();
  const today = businessDate();
  const weekStart = weekStartOf(today);
  const dayRevenue = Number(get('SELECT COALESCE(SUM(grand_total_minor),0) AS v FROM bills WHERE bill_date=? AND deleted_at IS NULL', [today]).v);
  const dayExpense = Number(get('SELECT COALESCE(SUM(amount_minor),0) AS v FROM expenses WHERE expense_date=? AND deleted_at IS NULL', [today]).v);
  const weekRevenue = Number(get('SELECT COALESCE(SUM(grand_total_minor),0) AS v FROM bills WHERE bill_date BETWEEN ? AND ? AND deleted_at IS NULL', [weekStart, today]).v);
  const weekExpense = Number(get('SELECT COALESCE(SUM(amount_minor),0) AS v FROM expenses WHERE expense_date BETWEEN ? AND ? AND deleted_at IS NULL', [weekStart, today]).v);
  const customers = rowsForCustomer();
  return {
    today: { revenue: dayRevenue, expenses: dayExpense, profit: dayRevenue - dayExpense, bills: Number(get('SELECT COUNT(*) AS v FROM bills WHERE bill_date=? AND deleted_at IS NULL', [today]).v), payments: Number(get('SELECT COALESCE(SUM(amount_minor),0) AS v FROM payments WHERE payment_date=? AND voided_at IS NULL', [today]).v) },
    week: { revenue: weekRevenue, expenses: weekExpense, profit: weekRevenue - weekExpense, start: weekStart, end: weekEndOf(today) },
    customerCount: customers.length,
    remaining: customers.reduce((sum, item) => sum + item.remaining_minor, 0),
    recentBills: all(`SELECT b.id,b.bill_number,b.bill_date,b.grand_total_minor,b.paid_minor,b.remaining_minor,b.status,c.name AS customer_name
      FROM bills b JOIN customers c ON c.id=b.customer_id WHERE b.deleted_at IS NULL ORDER BY b.created_at DESC LIMIT 8`),
    recentExpenses: all(`SELECT e.id,e.expense_number,e.expense_date,e.amount_minor,e.note,t.name AS type_name FROM expenses e
      JOIN expense_types t ON t.id=e.expense_type_id WHERE e.deleted_at IS NULL ORDER BY e.created_at DESC LIMIT 6`),
    dues: customers.filter((item) => item.remaining_minor > 0).slice(0, 8),
    unreadNotifications: Number(get('SELECT COUNT(*) AS v FROM notifications WHERE is_read=0').v),
  };
}

function restoreBackup(payload, user) {
  const tables = ['roles','permissions','role_permissions','users','user_permissions','sessions','counters','customers','services','bills','bill_items','payments','expense_types','expenses','weekly_reports','settings','notifications','audit_logs','offline_queue','backups'];
  if (!payload || payload.format !== 'companymanager-backup-v1' || !payload.tables) fail('فایل پشتیبان معتبر نیست.');
  tx(() => {
    for (const table of [...tables].reverse()) run(`DELETE FROM ${table}`);
    for (const table of tables) {
      const rows = payload.tables[table];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const columns = Object.keys(row);
        if (!columns.length) continue;
        const names = columns.map((name) => `"${name.replaceAll('"', '""')}"`).join(',');
        run(`INSERT INTO ${table} (${names}) VALUES (${columns.map(() => '?').join(',')})`, columns.map((name) => row[name]));
      }
    }
  });
  audit(user, 'restored', 'backup', '', 'Database restored from uploaded backup');
  return { restored: true };
}

export async function dispatchBusiness(method, parts, request, body = {}) {
  const [resource, idPart, action] = parts;
  if (!resource) fail('مسیر API پیدا نشد.', 'unknown', 404);
  if (resource === 'backup' && method === 'POST' && idPart === 'restore') {
    const user = await requirePermission('backup.restore');
    return restoreBackup(body, user);
  }
  const permission =
    resource === 'bills' && method === 'POST' ? 'bills.create' :
    resource === 'bills' && method === 'PATCH' ? 'bills.edit' :
    resource === 'bills' && method === 'DELETE' ? 'bills.delete' :
    resource === 'customers' && method !== 'GET' ? 'customers.manage' :
    resource === 'payments' && method === 'POST' ? 'payments.create' :
    resource === 'expenses' && method !== 'GET' ? 'expenses.manage' :
    resource === 'reports' && method !== 'GET' ? 'reports.manage' :
    RESOURCE_PERMISSION[resource];
  await requirePermission(permission);
  const user = await requireUser();
  const id = Number(idPart);

  if (resource === 'dashboard' && method === 'GET') return dashboardData();
  if (resource === 'customers' && method === 'GET') return id ? customerDetails(id) : rowsForCustomer();
  if (resource === 'customers' && method === 'POST') return tx(() => ({ id: insertCustomer(body, user) }));
  if (resource === 'customers' && id && method === 'PATCH') {
    const current = get('SELECT * FROM customers WHERE id=? AND deleted_at IS NULL', [id]);
    if (!current) fail('مشتری پیدا نشد.', 'unknown', 404);
    const name = String(body.name ?? current.name).trim();
    if (!name) fail('نام مشتری الزامی است.');
    run('UPDATE customers SET name=?,phone=?,address=?,description=?,is_permanent=?,updated_at=? WHERE id=?', [name, String(body.phone ?? current.phone).trim(), String(body.address ?? current.address).trim(), String(body.description ?? current.description), body.isPermanent === undefined ? current.is_permanent : body.isPermanent ? 1 : 0, nowIso(), id]);
    audit(user, 'updated', 'customer', id);
    return { success: true };
  }
  if (resource === 'customers' && id && method === 'DELETE') {
    run('UPDATE customers SET deleted_at=?,status=? WHERE id=?', [nowIso(), 'deleted', id]);
    audit(user, 'deleted', 'customer', id);
    return { success: true };
  }
  if (resource === 'dues' && method === 'GET') return rowsForCustomer().filter((row) => row.remaining_minor > 0);

  if (resource === 'bills' && method === 'GET') return id ? billDetails(id) : all(`SELECT b.*,c.customer_number,c.name AS customer_name,c.phone AS customer_phone FROM bills b JOIN customers c ON c.id=b.customer_id WHERE b.deleted_at IS NULL ORDER BY b.created_at DESC`);
  if (resource === 'bills' && method === 'POST') return { id: createBill(body, user) };
  if (resource === 'bills' && id && method === 'PATCH') {
    const current = billDetails(id);
    if (!current) fail('بل پیدا نشد.', 'unknown', 404);
    const items = Array.isArray(body.items) ? body.items : current.items.map((item) => ({ serviceId: item.service_id, serviceName: item.service_name, description: item.description, quantity: item.quantity, unitPrice: item.unit_price_minor / 100 }));
    if (!items.length) fail('بل باید حداقل یک قلم داشته باشد.');
    tx(() => {
      run('DELETE FROM bill_items WHERE bill_id=?', [id]);
      let subtotal = 0;
      items.forEach((item, index) => {
        const unitPrice = toMinor(item.unitPrice);
        const quantity = Number(item.quantity);
        if (!(quantity > 0) || unitPrice < 0) fail('تعداد یا قیمت نامعتبر است.');
        const total = Math.round(quantity * unitPrice); subtotal += total;
        run('INSERT INTO bill_items (bill_id,service_id,service_name,description,quantity,unit_price_minor,total_minor,sort_order) VALUES (?,?,?,?,?,?,?,?)', [id, Number(item.serviceId) || null, String(item.serviceName || 'خدمت'), String(item.description || ''), quantity, unitPrice, total, index]);
      });
      const discount = body.discount === undefined ? current.discount_minor : toMinor(body.discount);
      if (discount < 0 || discount > subtotal) fail('تخفیف نامعتبر است.');
      const paid = Number(get('SELECT COALESCE(SUM(amount_minor),0) AS total FROM payments WHERE bill_id=? AND voided_at IS NULL',[id]).total);
      if (paid > subtotal - discount) fail('مجموع بل نمی‌تواند از پرداخت‌های ثبت‌شده کمتر باشد.');
      run('UPDATE bills SET subtotal_minor=?,discount_minor=?,grand_total_minor=?,bill_date=?,note=?,updated_at=? WHERE id=?', [subtotal, discount, subtotal - discount, String(body.date || current.bill_date), String(body.note ?? current.note), nowIso(), id]);
      updateBillTotals(id);
      audit(user, 'updated', 'bill', id, current.bill_number);
    });
    return { success: true };
  }
  if (resource === 'bills' && id && method === 'DELETE') {
    tx(() => {
      const now = nowIso();
      run('UPDATE bills SET deleted_at=?,updated_at=? WHERE id=?', [now, now, id]);
      run('UPDATE payments SET voided_at=?,void_reason=?,updated_at=? WHERE bill_id=? AND voided_at IS NULL', [now,'bill deleted',now,id]);
      audit(user, 'deleted', 'bill', id);
    });
    return { success: true };
  }

  if (resource === 'payments' && method === 'GET') return all(`SELECT p.*,c.name AS customer_name,c.customer_number,b.bill_number FROM payments p JOIN customers c ON c.id=p.customer_id LEFT JOIN bills b ON b.id=p.bill_id WHERE p.voided_at IS NULL ORDER BY p.payment_date DESC,p.id DESC`);
  if (resource === 'payments' && method === 'POST') return tx(() => ({ id: addPayment(body, user) }));
  if (resource === 'payments' && id && method === 'DELETE') {
    const payment = get('SELECT * FROM payments WHERE id=? AND voided_at IS NULL', [id]);
    if (!payment) fail('پرداخت پیدا نشد.', 'unknown', 404);
    run('UPDATE payments SET voided_at=?,void_reason=?,updated_at=? WHERE id=?', [nowIso(), 'voided by user', nowIso(), id]);
    if (payment.bill_id) updateBillTotals(payment.bill_id);
    audit(user, 'voided', 'payment', id, payment.payment_number);
    return { success: true };
  }
  if (resource === 'payments' && id && method === 'PATCH') {
    const payment = get('SELECT * FROM payments WHERE id=? AND voided_at IS NULL', [id]);
    if (!payment) fail('پرداخت پیدا نشد.', 'unknown', 404);
    const amount = body.amount === undefined ? payment.amount_minor : toMinor(body.amount);
    if (amount <= 0) fail('مبلغ پرداخت باید بیشتر از صفر باشد.');
    if (payment.bill_id) {
      const bill = get('SELECT grand_total_minor FROM bills WHERE id=?', [payment.bill_id]);
      const others = Number(get('SELECT COALESCE(SUM(amount_minor),0) AS total FROM payments WHERE bill_id=? AND id<>? AND voided_at IS NULL', [payment.bill_id,id]).total);
      if (others + amount > bill.grand_total_minor) fail('مبلغ پرداخت از باقی بل بیشتر است.');
    }
    run('UPDATE payments SET amount_minor=?,payment_date=?,method=?,note=?,updated_at=? WHERE id=?', [amount,validDate(body.date,payment.payment_date),String(body.method || payment.method),String(body.note ?? payment.note),nowIso(),id]);
    if (payment.bill_id) updateBillTotals(payment.bill_id);
    audit(user,'updated','payment',id,payment.payment_number);
    return {success:true};
  }

  if (resource === 'expenses' && method === 'GET') return all(`SELECT e.*,t.name AS type_name FROM expenses e JOIN expense_types t ON t.id=e.expense_type_id WHERE e.deleted_at IS NULL ORDER BY e.expense_date DESC,e.id DESC`);
  if (resource === 'expenses' && method === 'POST') {
    const amount = toMinor(body.amount); if (amount <= 0) fail('مبلغ مصرف باید بیشتر از صفر باشد.');
    return tx(() => { const number = sequence('expense'); const now = nowIso(); const result = run('INSERT INTO expenses (expense_number,expense_type_id,amount_minor,expense_date,note,user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', [number, Number(body.typeId), amount, validDate(body.date), String(body.note || '').trim(), user.id, now, now]); audit(user, 'created', 'expense', result.lastInsertRowid, number); return { id: result.lastInsertRowid }; });
  }
  if (resource === 'expenses' && id && method === 'PATCH') {
    const current = get('SELECT * FROM expenses WHERE id=? AND deleted_at IS NULL', [id]); if (!current) fail('مصرف پیدا نشد.', 'unknown', 404);
    run('UPDATE expenses SET expense_type_id=?,amount_minor=?,expense_date=?,note=?,updated_at=? WHERE id=?', [Number(body.typeId ?? current.expense_type_id), body.amount === undefined ? current.amount_minor : toMinor(body.amount), String(body.date || current.expense_date), String(body.note ?? current.note), nowIso(), id]); audit(user, 'updated', 'expense', id); return { success: true };
  }
  if (resource === 'expenses' && id && method === 'DELETE') { run('UPDATE expenses SET deleted_at=?,updated_at=? WHERE id=?', [nowIso(), nowIso(), id]); audit(user, 'deleted', 'expense', id); return { success: true }; }

  if (resource === 'services' && method === 'GET') return all('SELECT * FROM services ORDER BY sort_order,name');
  if (resource === 'services' && method === 'POST') { const name = String(body.name || '').trim(); if (!name) fail('نام خدمت الزامی است.'); const now = nowIso(); const result = run('INSERT INTO services (name,default_price_minor,unit,is_active,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', [name,toMinor(body.price),String(body.unit || ''),1,Number(body.sortOrder)||0,now,now]); return { id: result.lastInsertRowid }; }
  if (resource === 'services' && id && method === 'PATCH') { run('UPDATE services SET name=?,default_price_minor=?,unit=?,is_active=?,updated_at=? WHERE id=?', [String(body.name || '').trim(),toMinor(body.price),String(body.unit || ''),body.active === false ? 0 : 1,nowIso(),id]); return { success: true }; }
  if (resource === 'services' && id && method === 'DELETE') { run('UPDATE services SET is_active=0,updated_at=? WHERE id=?', [nowIso(),id]); return { success: true }; }

  if (resource === 'expense-types' && method === 'GET') return all('SELECT * FROM expense_types WHERE is_active=1 ORDER BY sort_order,name');
  if (resource === 'expense-types' && method === 'POST') { const name = String(body.name || '').trim(); if (!name) fail('نام نوع مصرف الزامی است.'); const now = nowIso(); const result = run('INSERT INTO expense_types (name,is_active,sort_order,created_at,updated_at) VALUES (?,1,?,?,?)', [name,Number(body.sortOrder)||0,now,now]); return { id: result.lastInsertRowid }; }
  if (resource === 'expense-types' && id && method === 'DELETE') { run('UPDATE expense_types SET is_active=0,updated_at=? WHERE id=?', [nowIso(),id]); return { success: true }; }

  if (resource === 'reports' && method === 'GET') { archiveReports(); return all('SELECT * FROM weekly_reports ORDER BY week_start DESC'); }
  if (resource === 'reports' && id && method === 'POST' && action === 'recalculate') { const report = get('SELECT * FROM weekly_reports WHERE id=?', [id]); if (!report) fail('گزارش پیدا نشد.', 'unknown', 404); const start=report.week_start,end=report.week_end; const revenue=Number(get('SELECT COALESCE(SUM(grand_total_minor),0) AS v FROM bills WHERE deleted_at IS NULL AND bill_date BETWEEN ? AND ?', [start,end]).v); const expenses=Number(get('SELECT COALESCE(SUM(amount_minor),0) AS v FROM expenses WHERE deleted_at IS NULL AND expense_date BETWEEN ? AND ?', [start,end]).v); run('UPDATE weekly_reports SET revenue_minor=?,expenses_minor=?,profit_minor=?,updated_at=? WHERE id=?',[revenue,expenses,revenue-expenses,nowIso(),id]); audit(user,'recalculated','report',id); return { success:true }; }
  if (resource === 'reports' && id && method === 'PATCH') {
    const report = get('SELECT id FROM weekly_reports WHERE id=?',[id]);
    if (!report) fail('گزارش پیدا نشد.','unknown',404);
    run('UPDATE weekly_reports SET adjustments_note=?,updated_at=? WHERE id=?',[String(body.note || ''),nowIso(),id]);
    audit(user,'updated','report',id);
    return {success:true};
  }
  if (resource === 'reports' && id && method === 'DELETE') { run('DELETE FROM weekly_reports WHERE id=?',[id]); audit(user,'deleted','report',id); return {success:true}; }

  if (resource === 'permissions' && method === 'GET') {
    return { roles: all('SELECT id,key,name,grants_all FROM roles ORDER BY id'), permissions: all('SELECT id,key,group_name,sort_order FROM permissions ORDER BY sort_order'), grants: all('SELECT role_id,permission_id FROM role_permissions') };
  }
  if (resource === 'permissions' && method === 'PUT') {
    const role = get('SELECT id,grants_all FROM roles WHERE id=?',[Number(body.roleId)]);
    if (!role || role.grants_all) fail('این نقش مجوزهای ثابت دارد.','authorization',403);
    const permissionIds = Array.isArray(body.permissionIds) ? body.permissionIds.map(Number).filter(Number.isInteger) : [];
    tx(() => {
      run('DELETE FROM role_permissions WHERE role_id=?',[role.id]);
      for (const permissionId of permissionIds) run('INSERT OR IGNORE INTO role_permissions (role_id,permission_id) VALUES (?,?)',[role.id,permissionId]);
    });
    audit(user,'updated','permissions',role.id);
    return {success:true};
  }

  if (resource === 'notifications' && method === 'GET') return all('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100');
  if (resource === 'notifications' && id && method === 'PATCH') { await requireUser(); run('UPDATE notifications SET is_read=1 WHERE id=?',[id]); return { success:true }; }

  if (resource === 'settings' && method === 'GET') return getAppConfig();
  if (resource === 'settings' && method === 'PUT') { const allowed = ['company.name','company.address','company.phone','company.email','company.website','company.footer','bill.prefix','bill.start','bill.pad','customer.prefix','customer.start','customer.pad','payment.prefix','payment.start','expense.prefix','expense.start','expense.pad','report.prefix','report.start','report.pad','currency.code','currency.decimals','language','theme','timezone','print.show_logo','print.company_label','print.customer_label','print.footer','print.font_scale']; const entries = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key))); setManySettings(entries); audit(user,'updated','settings'); return getAppConfig(); }

  if (resource === 'users' && method === 'GET') return all('SELECT u.id,u.username,u.full_name,u.role_id,u.is_active,u.is_owner,u.created_at,r.name AS role_name FROM users u JOIN roles r ON r.id=u.role_id WHERE u.deleted_at IS NULL ORDER BY u.created_at');
  if (resource === 'users' && method === 'POST') { const username=String(body.username||'').trim(); const password=String(body.password||''); if (!username || password.length<6) fail('نام کاربری و رمز حداقل ۶ حرفی لازم است.'); const role=get('SELECT id FROM roles WHERE key=?',[body.role || 'user']); if (!role) fail('نقش پیدا نشد.'); const {hash,salt}=hashPassword(password); const now=nowIso(); const result=run('INSERT INTO users (username,full_name,password_hash,password_salt,role_id,is_active,is_owner,created_at,updated_at) VALUES (?,?,?,?,?,1,0,?,?)',[username,String(body.fullName||username),hash,salt,role.id,now,now]); audit(user,'created','user',result.lastInsertRowid,username); return {id:result.lastInsertRowid}; }
  if (resource === 'users' && id && method === 'PATCH') { const target=get('SELECT * FROM users WHERE id=? AND deleted_at IS NULL',[id]); if (!target) fail('کاربر پیدا نشد.','unknown',404); if (target.is_owner) fail('حساب مالک قابل تغییر از این بخش نیست.','authorization',403); if (body.active !== undefined) run('UPDATE users SET is_active=?,updated_at=? WHERE id=?',[body.active?1:0,nowIso(),id]); if (body.fullName !== undefined) run('UPDATE users SET full_name=?,updated_at=? WHERE id=?',[String(body.fullName),nowIso(),id]); if (body.password) { if (String(body.password).length<6) fail('رمز باید حداقل ۶ حرف باشد.'); const {hash,salt}=hashPassword(body.password); run('UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?',[hash,salt,nowIso(),id]); } if (body.role) { const role=get('SELECT id FROM roles WHERE key=?',[body.role]); if (role) run('UPDATE users SET role_id=?,updated_at=? WHERE id=?',[role.id,nowIso(),id]); } audit(user,'updated','user',id,target.username); return {success:true}; }
  if (resource === 'users' && id && method === 'DELETE') { const target=get('SELECT is_owner,username FROM users WHERE id=?',[id]); if (target?.is_owner) fail('حساب مالک قابل حذف نیست.','authorization',403); run('UPDATE users SET deleted_at=?,is_active=0 WHERE id=?',[nowIso(),id]); audit(user,'deleted','user',id,target?.username); return {success:true}; }

  if (resource === 'backup' && method === 'GET') { const tables=['roles','permissions','role_permissions','users','user_permissions','sessions','counters','customers','services','bills','bill_items','payments','expense_types','expenses','weekly_reports','settings','notifications','audit_logs','offline_queue','backups']; const payload={format:'companymanager-backup-v1',createdAt:nowIso(),tables:Object.fromEntries(tables.map((table)=>[table,all(`SELECT * FROM ${table}`)]))}; const fileName=`backup-${nowIso().replaceAll(':','-')}.json`; const filePath='vercel-blob:companymanager/database-v2.json'; run('INSERT INTO backups (kind,file_name,file_path,size_bytes,note,user_id,created_at) VALUES (?,?,?,?,?,?,?)',['json',fileName,filePath,Buffer.byteLength(JSON.stringify(payload),'utf8'),'Manual JSON export',user.id,nowIso()]); audit(user,'created','backup','',fileName); return payload; }
  if (resource === 'backup' && method === 'POST') return restoreBackup(body,user);
  if (resource === 'audit' && method === 'GET') return all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300');

  fail('مسیر API پیدا نشد.', 'unknown', 404);
}

export function publicApiError(error) {
  const classified = classifyError(error);
  logError('api', classified.message, { kind: classified.kind, code: classified.code });
  if (classified instanceof AppError) return Response.json(classified.toResponse(), { status: classified.status });
  return Response.json({ error: { kind: classified.kind, code: classified.code, message: 'عملیات انجام نشد.' } }, { status: classified.status });
}