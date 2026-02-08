'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t, type Locale } from '@/lib/i18n';

interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
  icalToken: string;
  createdAt: string;
}

export function UserManagement({ users, locale }: { users: User[]; locale: Locale }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function copyIcalUrl(user: User) {
    const url = `${window.location.origin}/api/ical/${user.icalToken}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for non-HTTPS contexts where clipboard API is unavailable
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
      >
        + {t(locale, 'addUser')}
      </button>

      {showForm && (
        <AddUserForm locale={locale} onDone={() => { setShowForm(false); router.refresh(); }} />
      )}

      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{user.displayName}</div>
                <div className="text-sm text-gray-500">@{user.username} &middot; {t(locale, user.role)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyIcalUrl(user)}
                  className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded border"
                >
                  {copiedId === user.id ? t(locale, 'copied') : t(locale, 'copyIcalUrl')}
                </button>
                <EditUserButton user={user} locale={locale} onDone={() => router.refresh()} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddUserForm({ locale, onDone }: { locale: Locale; onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('teacher');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName, role }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setLoading(false);
      return;
    }
    setLoading(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder={t(locale, 'username')} required
          className="border rounded px-3 py-2 text-sm" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={t(locale, 'password')} required
          className="border rounded px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t(locale, 'displayName')} required
          className="border rounded px-3 py-2 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="border rounded px-3 py-2 text-sm">
          <option value="teacher">{t(locale, 'teacher')}</option>
          <option value="owner">{t(locale, 'owner')}</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
          {t(locale, 'create')}
        </button>
        <button type="button" onClick={onDone}
          className="text-gray-500 px-4 py-1.5 rounded text-sm border hover:bg-gray-50">
          {t(locale, 'cancel')}
        </button>
      </div>
    </form>
  );
}

function EditUserButton({ user, locale, onDone }: { user: User; locale: Locale; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [newPassword, setNewPassword] = useState('');

  async function handleSave() {
    const body: Record<string, string> = { displayName };
    if (newPassword) body.password = newPassword;
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setEditing(false);
    setNewPassword('');
    onDone();
  }

  async function handleDelete() {
    if (!confirm(`Delete user ${user.displayName}?`)) return;
    await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    onDone();
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
        {t(locale, 'edit')}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
        className="border rounded px-2 py-1 text-xs w-24" />
      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
        placeholder={t(locale, 'newPassword')}
        className="border rounded px-2 py-1 text-xs w-24" />
      <button onClick={handleSave} className="text-xs text-blue-600">{t(locale, 'save')}</button>
      <button onClick={() => setEditing(false)} className="text-xs text-gray-400">{t(locale, 'cancel')}</button>
      {user.role !== 'owner' && (
        <button onClick={handleDelete} className="text-xs text-red-500">{t(locale, 'delete')}</button>
      )}
    </div>
  );
}
