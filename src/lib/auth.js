import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { all, get, run } from './db.js';
import { nowIso } from './dates.js';
import { authenticationError, authorizationError } from './errors.js';
import { ALL_GRANTED, hasPermission } from './permissions.js';

export const SESSION_COOKIE = 'cm_session';
const SESSION_TTL_HOURS = 12;

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  try {
    const stored = Buffer.from(String(hash), 'hex');
    const candidate = crypto.scryptSync(String(password ?? ''), String(salt), 64);
    return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
  } catch {
    return false;
  }
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    roleId: user.role_id,
    isActive: Boolean(user.is_active),
    isOwner: Boolean(user.is_owner),
    createdAt: user.created_at,
  };
}

export function resolvePermissions(user) {
  const role = get('SELECT * FROM roles WHERE id = ?', [user.role_id]);
  if (!role) return [];
  if (role.grants_all) return [ALL_GRANTED];

  const fromRole = all(
    `SELECT p.key FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ?`,
    [role.id]
  ).map((row) => row.key);

  const set = new Set(fromRole);
  const overrides = all(
    `SELECT p.key, up.granted FROM permissions p
       JOIN user_permissions up ON up.permission_id = p.id
      WHERE up.user_id = ?`,
    [user.id]
  );
  for (const override of overrides) {
    if (override.granted) set.add(override.key);
    else set.delete(override.key);
  }
  return [...set];
}

export function createSession(userId, userAgent = '') {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  run(
    `INSERT INTO sessions (token, user_id, created_at, expires_at, last_seen_at, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [token, userId, now.toISOString(), expires.toISOString(), now.toISOString(), String(userAgent).slice(0, 300)]
  );
  return { token, expires };
}

export async function setSessionCookie(token, expires) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // The desktop app serves over loopback http, so `secure` would drop the cookie.
    secure: false,
    path: '/',
    expires,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function destroySession(token) {
  if (!token) return;
  run('DELETE FROM sessions WHERE token = ?', [token]);
}

export function destroyUserSessions(userId) {
  run('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = get('SELECT * FROM sessions WHERE token = ?', [token]);
  if (!session) return null;

  if (session.expires_at <= nowIso()) {
    destroySession(token);
    return null;
  }

  const user = get('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [session.user_id]);
  if (!user || !user.is_active) {
    destroySession(token);
    return null;
  }

  run('UPDATE sessions SET last_seen_at = ? WHERE token = ?', [nowIso(), token]);

  const role = get('SELECT key, name FROM roles WHERE id = ?', [user.role_id]);
  return {
    ...publicUser(user),
    roleKey: role?.key ?? '',
    roleName: role?.name ?? '',
    permissions: resolvePermissions(user),
    sessionToken: token,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw authenticationError('errors.auth.required');
  return user;
}

export async function requirePermission(permission) {
  const user = await requireUser();
  if (permission && !hasPermission(user.permissions, permission)) {
    throw authorizationError('errors.auth.forbidden');
  }
  return user;
}

export function authenticate(username, password) {
  const user = get('SELECT * FROM users WHERE username = ? AND deleted_at IS NULL', [String(username ?? '').trim()]);
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash, user.password_salt)) return null;
  if (!user.is_active) return null;
  return user;
}
