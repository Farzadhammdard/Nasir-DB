'use server';

import { cookies } from 'next/headers';
import { getCurrentUser, hashPassword, createSession, setSessionCookie, clearSessionCookie, authenticate, destroySession, SESSION_COOKIE } from '@/lib/auth';
import { getSetting, setSetting, isInitialized } from '@/lib/settings';
import { get, run, tx } from '@/lib/db';
import { nowIso } from '@/lib/dates';
import { withJsonStore } from '@/lib/json-store';

export async function getMe() {
  return withJsonStore(() => getCurrentUser());
}

export async function checkInitialized() {
  return withJsonStore(() => isInitialized());
}

export async function initializeSystem(formData) {
  const session = await withJsonStore(() => {
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '');
    const fullName = String(formData.get('fullName') || '').trim();
    const companyName = String(formData.get('companyName') || '').trim();

    if (!username || !password || !companyName) throw new Error('errors.validation.required');
    if (password.length < 6) throw new Error('errors.validation.password_min');

    tx(() => {
      if (isInitialized()) throw new Error('errors.system.already_initialized');
      if (get('SELECT id FROM users WHERE username=? AND deleted_at IS NULL', [username])) throw new Error('errors.auth.username_taken');
      const role = get('SELECT id FROM roles WHERE key = ?', ['admin']);
      if (!role) throw new Error('errors.system.role_missing');
      const { hash, salt } = hashPassword(password);
      const now = nowIso();
      run(
        'INSERT INTO users (username, full_name, password_hash, password_salt, role_id, is_active, is_owner, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)',
        [username, fullName || username, hash, salt, role.id, now, now]
      );
      setSetting('company.name', companyName);
      setSetting('currency.code', String(formData.get('currency') || 'AFN'));
      setSetting('language', String(formData.get('language') || 'fa'));
      setSetting('bill.prefix', String(formData.get('billPrefix') || 'INV-'));
      setSetting('bill.start', String(formData.get('billStart') || '1'));
      setSetting('customer.prefix', String(formData.get('customerPrefix') || 'CUS-'));
      setSetting('customer.start', String(formData.get('customerStart') || '1'));
      setSetting('initialized', '1');
    });

    const user = get('SELECT * FROM users WHERE username = ?', [username]);
    const { token, expires } = createSession(user.id, 'setup');
    return { token, expires };
  });

  await setSessionCookie(session.token, session.expires);
  return { success: true };
}

export async function login(formData) {
  const session = await withJsonStore(() => {
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '');
    const user = authenticate(username, password);
    if (!user) throw new Error('errors.auth.invalid');
    const result = createSession(user.id);
    if (user.is_owner && !isInitialized()) setSetting('initialized', '1');
    return result;
  });
  await setSessionCookie(session.token, session.expires);
  return { success: true };
}

export async function logout() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  await withJsonStore(() => {
    if (token) destroySession(token);
  });
  await clearSessionCookie();
  return { success: true };
}
