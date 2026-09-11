// The IDS team and the products each person is responsible for.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TeamMember, ProductResponsibility, Product } from '../types';
import {
  getTeamMembers,
  getProductResponsibilities,
  getProducts,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../api';
import { useAuth } from '../auth';

export default function TeamMembers() {
  const { canEdit } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [responsibilities, setResponsibilities] = useState<ProductResponsibility[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formFullName, setFormFullName] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [m, r, p] = await Promise.all([
        getTeamMembers(),
        getProductResponsibilities(),
        getProducts(),
      ]);
      setMembers(m);
      setResponsibilities(r);
      setProducts(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the team.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // The list arrives ordered by name, so keep that order after a create or rename.
  function sortByName(list: TeamMember[]) {
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  function resetForm() {
    setFormFullName('');
    setFormJobTitle('');
    setFormDepartment('');
    setFormEmail('');
    setFormStatus('Active');
    setProblems({});
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  }

  function startCreate() {
    resetForm();
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(member: TeamMember) {
    setFormFullName(member.fullName);
    setFormJobTitle(member.jobTitle || '');
    setFormDepartment(member.department || '');
    setFormEmail(member.email || '');
    setFormStatus(member.status || 'Active');
    setProblems({});
    setEditingId(member.id);
    setShowForm(true);
  }

  function validate() {
    const found: Record<string, string> = {};
    if (!formFullName.trim()) found.fullName = 'Full name is required.';
    if (formEmail.trim() && !formEmail.includes('@')) {
      found.email = 'That does not look like an email address.';
    }
    setProblems(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!validate()) return;

    const data = {
      fullName: formFullName.trim(),
      jobTitle: formJobTitle.trim() || null,
      department: formDepartment.trim() || null,
      email: formEmail.trim() || null,
      status: formStatus,
    };

    try {
      setSaving(true);
      if (editingId === null) {
        const created = await createTeamMember(data);
        setMembers(sortByName([...members, created]));
        setMessage('Created ' + created.fullName + '.');
      } else {
        const updated = await updateTeamMember(editingId, data);
        setMembers(sortByName(members.map((m) => (m.id === updated.id ? updated : m))));
        setMessage('Saved ' + updated.fullName + '.');
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the team member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      setDeleting(true);
      setError('');
      setMessage('');
      await deleteTeamMember(toDelete.id);
      setMembers(members.filter((m) => m.id !== toDelete.id));
      // The database removes their responsibilities with them.
      setResponsibilities(responsibilities.filter((r) => r.teamMemberId !== toDelete.id));
      setMessage('Deleted ' + toDelete.fullName + '.');
      if (editingId === toDelete.id) closeForm();
      setToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the team member.');
    } finally {
      setDeleting(false);
    }
  }

  const departments = [
    ...new Set(members.map((m) => m.department).filter((d): d is string => !!d)),
  ].sort();

  const text = search.trim().toLowerCase();
  const visible = members.filter((m) => {
    const matchesText =
      text === '' ||
      m.fullName.toLowerCase().includes(text) ||
      (m.email || '').toLowerCase().includes(text) ||
      (m.jobTitle || '').toLowerCase().includes(text);
    const matchesDepartment = department === '' || m.department === department;
    return matchesText && matchesDepartment;
  });

  function responsibilitiesOf(memberId: number) {
    return responsibilities
      .filter((r) => r.teamMemberId === memberId)
      .map((r) => ({
        responsibility: r,
        product: products.find((p) => p.id === r.productId),
      }));
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Team</h1>
          <p>Who to ask about which product.</p>
        </div>
        {canEdit && (
          <button
            className="btn btn-primary"
            onClick={() => (showForm ? closeForm() : startCreate())}
          >
            {showForm ? 'Cancel' : 'New team member'}
          </button>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <p className="small muted">{message}</p>}

      {canEdit && showForm && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="fullName">Full name *</label>
              <input
                id="fullName"
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
              />
              {problems.fullName && <div className="error-text">{problems.fullName}</div>}
            </div>
            <div className="field">
              <label htmlFor="jobTitle">Job title</label>
              <input
                id="jobTitle"
                value={formJobTitle}
                onChange={(e) => setFormJobTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="department">Department</label>
              <input
                id="department"
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
              {problems.email && <div className="error-text">{problems.email}</div>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId === null
                  ? 'Create team member'
                  : 'Save changes'}
            </button>
            <button type="button" className="btn" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="filters">
        <input
          type="search"
          placeholder="Search by name, email or job title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="card panel-fill">
        {loading ? (
          <div className="loading">Loading team...</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            {members.length === 0
              ? 'No team members yet.'
              : 'No team members match your search.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Job title</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Responsible for</th>
                  {canEdit && <th className="col-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.id}>
                    <td>{m.fullName}</td>
                    <td>{m.jobTitle || '-'}</td>
                    <td>{m.department || '-'}</td>
                    <td>
                      {m.email ? (
                        <a href={'mailto:' + m.email}>{m.email}</a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={m.status === 'Active' ? 'status' : 'status status-bad'}>
                      {m.status || '-'}
                    </td>
                    <td>
                      {responsibilitiesOf(m.id).length === 0 ? (
                        <span className="muted">-</span>
                      ) : (
                        responsibilitiesOf(m.id).map((item) => (
                          <div key={item.responsibility.id} className="small">
                            {item.product ? (
                              <Link to={'/products/' + item.product.id}>
                                {item.product.name}
                              </Link>
                            ) : (
                              'Unknown product'
                            )}
                            <span className="muted"> - {item.responsibility.responsibility}</span>
                          </div>
                        ))
                      )}
                    </td>
                    {canEdit && (
                      <td className="col-actions">
                        <button
                          className="btn btn-small"
                          onClick={() => startEdit(m)}
                          disabled={saving}
                        >
                          Edit
                        </button>{' '}
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => setToDelete(m)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && visible.length > 0 && (
        <p className="muted small">
          Showing {visible.length} of {members.length} team members.
        </p>
      )}

      {toDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {toDelete.fullName}?</h2>
            <p>
              They will be removed from the team, along with any product
              responsibilities assigned to them. This cannot be undone.
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
