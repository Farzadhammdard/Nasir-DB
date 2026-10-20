'use client';

import { useState } from 'react';
import { Check, Shield, UserRound, UserRoundX } from 'lucide-react';

export default function UserAccessPanel({ users, permissions, selectedRoleId, onRoleChange, selectedPermissionIds, onPermissionChange, onSaved, onError }) {
  const [saving, setSaving] = useState(false);
  const role = permissions?.roles.find((item) => String(item.id) === String(selectedRoleId));
  const grants = permissions?.grants || [];
  const rolePermissionIds = grants.filter((item) => item.role_id === Number(selectedRoleId)).map((item) => item.permission_id);

  async function savePermissions() {
    setSaving(true);
    try {
      const response = await fetch('/api/permissions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId: Number(selectedRoleId), permissionIds: selectedPermissionIds }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'ذخیره دسترسی انجام نشد.');
      onSaved();
    } catch (error) {
      onError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleUser(user) {
    const response = await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !user.is_active }) });
    const result = await response.json();
    if (!response.ok) onError(result.error?.message || 'تغییر وضعیت انجام نشد.');
    else onSaved();
  }

  return <section className="access-panel-grid"><div className="content-panel"><div className="panel-heading"><div><h2><UserRound size={17}/> کاربران</h2><p>حساب‌ها را فعال یا غیرفعال کنید.</p></div></div>{users.length ? <div className="user-list">{users.map((user)=><div className="user-row" key={user.id}><span className="avatar user-avatar"><UserRound size={16}/></span><span className="user-identity"><strong>{user.full_name || user.username}</strong><small>{user.username} · {user.role_name}</small></span><span className={user.is_active?'status-active':'status-disabled'}>{user.is_active?'فعال':'غیرفعال'}</span><button className="icon-button" disabled={user.is_owner} title={user.is_active?'غیرفعال‌کردن':'فعال‌کردن'} onClick={()=>toggleUser(user)}>{user.is_active?<UserRoundX size={17}/>:<Check size={17}/>}</button></div>)}</div> : <div className="empty-state">هنوز کاربری ایجاد نشده است.</div>}</div><div className="content-panel"><div className="panel-heading"><div><h2><Shield size={17}/> دسترسی نقش‌ها</h2><p>مجوزها برای همه‌ی کاربران این نقش اعمال می‌شود.</p></div></div><label className="form-field"><span>نقش</span><select className="field-control" value={selectedRoleId} onChange={(event)=>onRoleChange(event.target.value)}>{permissions?.roles.filter((item)=>!item.grants_all).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{role?.grants_all ? <p className="muted-note">این نقش دسترسی کامل دارد و ثابت است.</p> : <><div className="permission-list">{permissions?.permissions.map((permission)=>{const checked=selectedPermissionIds.includes(permission.id);return <label className="permission-option" key={permission.id}><input type="checkbox" checked={checked} onChange={(event)=>onPermissionChange(permission.id,event.target.checked)}/><span>{permission.key}</span></label>;})}</div><button className="button-primary" disabled={saving} onClick={savePermissions}>{saving?'در حال ذخیره...':'ذخیره دسترسی‌ها'}</button></>}</div></section>;
}