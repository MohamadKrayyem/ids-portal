// Portal login accounts. Admin only - App.tsx sends everyone else home.
// New accounts are created here; roles and the active switch are changed
// straight in the table.

import { useEffect, useState } from 'react';
import type { User, Role } from '../types';
import { getUsers, createUser, updateUser, deleteUser } from '../api';
import { useAuth } from '../auth';

export default function Users() {
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  // Id of the row we are currently saving, so only that row is disabled.
  const [savingId, setSavingId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  // --- new user form ---
  const [showCreate, setShowCreate] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('Viewer');
  const [createProblems, setCreateProblems] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Sends the whole user back with one field changed. The API expects the
  // complete record, so we spread the old one and override what changed.
  async function save(user: User, changes: Partial<User>) {
    try {
      setSavingId(user.id);
      setError('');
      setMessage('');
      const { id, ...rest } = { ...user, ...changes };
      const updated = await updateUser(id, rest);
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      setMessage('Saved ' + updated.fullName + '.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the user.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      setDeleting(true);
      setError('');
      await deleteUser(toDelete.id);
      setUsers(users.filter((u) => u.id !== toDelete.id));
      setMessage('Deleted ' + toDelete.fullName + '.');
      setToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the user.');
    } finally {
      setDeleting(false);
    }
  }

  function validateCreate() {
    const found: Record<string, string> = {};
    if (!newFullName.trim()) found.newFullName = 'Full name is required.';
    if (!newEmail.trim()) {
      found.newEmail = 'Email is required.';
    } else if (!newEmail.includes('@')) {
      found.newEmail = 'That does not look like an email address.';
    }
    if (newPassword.length < 8) found.newPassword = 'Password must be at least 8 characters.';
    setCreateProblems(found);
    return Object.keys(found).length === 0;
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!validateCreate()) return;

    try {
      setCreating(true);
      const created = await createUser({
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setUsers([...users, created]);
      setMessage('Created ' + created.fullName + '.');
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('Viewer');
      setCreateProblems({});
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the user.');
    } finally {
      setCreating(false);
    }
  }

  const text = search.trim().toLowerCase();
  const visible = users.filter((u) => {
    const matchesText =
      text === '' ||
      u.fullName.toLowerCase().includes(text) ||
      u.email.toLowerCase().includes(text);
    const matchesRole = role === '' || u.role === role;
    return matchesText && matchesRole;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Who can sign in to this portal, and what they are allowed to do.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'New user'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <p className="small muted">{message}</p>}

      {showCreate && (
        <form className="card" onSubmit={handleCreate}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="newFullName">Full name *</label>
              <input
                id="newFullName"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
              {createProblems.newFullName && (
                <div className="error-text">{createProblems.newFullName}</div>
              )}
            </div>
            <div className="field">
              <label htmlFor="newEmail">Email *</label>
              <input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              {createProblems.newEmail && (
                <div className="error-text">{createProblems.newEmail}</div>
              )}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="newPassword">Temporary password *</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {createProblems.newPassword && (
                <div className="error-text">{createProblems.newPassword}</div>
              )}
            </div>
            <div className="field">
              <label htmlFor="newRole">Role</label>
              <select
                id="newRole"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
              >
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create user'}
            </button>
          </div>
        </form>
      )}

      <div className="filters">
        <input
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="Admin">Admin</option>
          <option value="Editor">Editor</option>
          <option value="Viewer">Viewer</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading users...</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            {users.length === 0 ? 'No users yet.' : 'No users match your search.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  // An admin must not lock themselves out of their own portal.
                  const isMe = currentUser !== null && currentUser.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        {u.fullName}
                        {isMe && <span className="muted"> (you)</span>}
                      </td>
                      <td className="muted">{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          disabled={isMe || savingId === u.id}
                          onChange={(e) => save(u, { role: e.target.value as Role })}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Editor">Editor</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-small"
                          disabled={isMe || savingId === u.id}
                          onClick={() => save(u, { isActive: !u.isActive })}
                        >
                          {u.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="col-actions">
                        <button
                          className="btn btn-small btn-danger"
                          disabled={isMe || savingId === u.id}
                          onClick={() => setToDelete(u)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="muted small">
        Admins manage everything. Editors can create and edit products, clients and
        deployments. Viewers can only read.
      </p>

      {toDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {toDelete.fullName}?</h2>
            <p>
              They will lose access to the portal immediately. This cannot be undone.
            </p>
            <div className="btn-row">
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button className="btn" onClick={() => setToDelete(null)} disabled={deleting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
