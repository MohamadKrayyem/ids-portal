// Every client-product deployment, with search, filters and editing.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, Client, Deployment, Environment } from '../types';
import {
  getProducts,
  getClients,
  getDeployments,
  getEnvironments,
  createDeployment,
  updateDeployment,
  deleteDeployment,
} from '../api';
import { useAuth } from '../auth';

const ENVIRONMENT_TYPE_ORDER = ['Development', 'Testing', 'UAT', 'Production'] as const;

// The API sends dates as ISO strings; <input type="date"> wants just YYYY-MM-DD.
function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

export default function Deployments() {
  const { canEdit } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [productId, setProductId] = useState('');
  const [envType, setEnvType] = useState('');
  const [onlyBehind, setOnlyBehind] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formClientId, setFormClientId] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formModules, setFormModules] = useState('');
  const [formGoLive, setFormGoLive] = useState('');
  const [formStatus, setFormStatus] = useState('Live');
  const [formSupportTier, setFormSupportTier] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Deployment | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [p, c, d, e] = await Promise.all([
        getProducts(),
        getClients(),
        getDeployments(),
        getEnvironments(),
      ]);
      setProducts(p);
      setClients(c);
      setDeployments(d);
      setEnvironments(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load deployments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function productOf(id: number) {
    return products.find((p) => p.id === id);
  }

  function clientOf(id: number) {
    return clients.find((c) => c.id === id);
  }

  function resetForm() {
    setFormClientId('');
    setFormProductId('');
    setFormVersion('');
    setFormModules('');
    setFormGoLive('');
    setFormStatus('Live');
    setFormSupportTier('');
    setFormNotes('');
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

  function startEdit(d: Deployment) {
    setFormClientId(String(d.clientId));
    setFormProductId(String(d.productId));
    setFormVersion(d.productVersion || '');
    setFormModules(d.enabledModules || '');
    setFormGoLive(toDateInput(d.goLiveDate));
    setFormStatus(d.status || 'Live');
    setFormSupportTier(d.supportTier || '');
    setFormNotes(d.notes || '');
    setProblems({});
    setEditingId(d.id);
    setShowForm(true);
  }

  function validate() {
    const found: Record<string, string> = {};
    if (!formClientId) found.clientId = 'A client is required.';
    if (!formProductId) found.productId = 'A product is required.';
    setProblems(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!validate()) return;

    const data = {
      clientId: Number(formClientId),
      productId: Number(formProductId),
      productVersion: formVersion.trim() || null,
      enabledModules: formModules.trim() || null,
      goLiveDate: formGoLive || null,
      status: formStatus,
      supportTier: formSupportTier.trim() || null,
      notes: formNotes.trim() || null,
    };

    try {
      setSaving(true);
      if (editingId === null) {
        const created = await createDeployment(data);
        setDeployments([...deployments, created]);
        setMessage('Deployment created.');
      } else {
        const updated = await updateDeployment(editingId, data);
        setDeployments(deployments.map((d) => (d.id === updated.id ? updated : d)));
        setMessage('Deployment saved.');
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the deployment.');
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
      await deleteDeployment(toDelete.id);
      setDeployments(deployments.filter((d) => d.id !== toDelete.id));
      // The database removes the deployment's environments with it.
      setEnvironments(environments.filter((e) => e.deploymentId !== toDelete.id));
      setMessage('Deployment deleted.');
      if (editingId === toDelete.id) closeForm();
      setToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the deployment.');
    } finally {
      setDeleting(false);
    }
  }

  const text = search.trim().toLowerCase();
  const visible = deployments.filter((d) => {
    const p = productOf(d.productId);
    const c = clientOf(d.clientId);
    const matchesText =
      text === '' ||
      (c ? c.companyName.toLowerCase().includes(text) : false) ||
      (p ? p.name.toLowerCase().includes(text) : false) ||
      (d.productVersion || '').toLowerCase().includes(text);
    const matchesStatus = status === '' || d.status === status;
    const matchesProduct = productId === '' || d.productId === Number(productId);
    const matchesEnvType =
      envType === '' ||
      environments.some((e) => e.deploymentId === d.id && e.environmentType === envType);
    const isBehind = p && d.productVersion ? d.productVersion !== p.currentVersion : false;
    return (
      matchesText &&
      matchesStatus &&
      matchesProduct &&
      matchesEnvType &&
      (!onlyBehind || isBehind)
    );
  });

  const deleteLabel = toDelete
    ? (clientOf(toDelete.clientId)?.companyName || 'this client') +
      ' - ' +
      (productOf(toDelete.productId)?.name || 'this product')
    : '';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Deployments</h1>
          <p>Which client runs which product, and at what version.</p>
        </div>
        {canEdit && (
          <button
            className="btn btn-primary"
            onClick={() => (showForm ? closeForm() : startCreate())}
          >
            {showForm ? 'Cancel' : 'New deployment'}
          </button>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <p className="small muted">{message}</p>}

      {canEdit && showForm && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="clientId">Client *</label>
              <select
                id="clientId"
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
              >
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              {problems.clientId && <div className="error-text">{problems.clientId}</div>}
            </div>
            <div className="field">
              <label htmlFor="formProductId">Product *</label>
              <select
                id="formProductId"
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {problems.productId && <div className="error-text">{problems.productId}</div>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="version">Product version</label>
              <input
                id="version"
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="1.0.0"
              />
            </div>
            <div className="field">
              <label htmlFor="enabledModules">Enabled modules</label>
              <input
                id="enabledModules"
                value={formModules}
                onChange={(e) => setFormModules(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="goLive">Go-live date</label>
              <input
                id="goLive"
                type="date"
                value={formGoLive}
                onChange={(e) => setFormGoLive(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="formStatus">Deployment status</label>
              <select
                id="formStatus"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="Live">Live</option>
                <option value="Pilot">Pilot</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="supportTier">Support tier</label>
              <input
                id="supportTier"
                value={formSupportTier}
                onChange={(e) => setFormSupportTier(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId === null
                  ? 'Create deployment'
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
          placeholder="Search by client, product or version"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Live">Live</option>
          <option value="Pilot">Pilot</option>
          <option value="Suspended">Suspended</option>
        </select>
        <select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={envType} onChange={(e) => setEnvType(e.target.value)}>
          <option value="">All environment types</option>
          {ENVIRONMENT_TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <label
          className="small"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}
        >
          <input
            type="checkbox"
            checked={onlyBehind}
            onChange={(e) => setOnlyBehind(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Behind latest only
        </label>
      </div>

      <div className="card panel-fill">
        {loading ? (
          <div className="loading">Loading deployments...</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            {deployments.length === 0
              ? 'No deployments yet.'
              : 'No deployments match your search.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Product</th>
                  <th>Version</th>
                  <th>Latest</th>
                  <th>Status</th>
                  <th>Support tier</th>
                  <th className="col-num">Environments</th>
                  <th>Go live</th>
                  {canEdit && <th className="col-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => {
                  const p = productOf(d.productId);
                  const c = clientOf(d.clientId);
                  const behind =
                    p && d.productVersion ? d.productVersion !== p.currentVersion : false;
                  return (
                    <tr key={d.id}>
                      <td>
                        <Link to={'/clients/' + d.clientId}>
                          {c ? c.companyName : 'Unknown client'}
                        </Link>
                      </td>
                      <td>
                        <Link to={'/products/' + d.productId}>
                          {p ? p.name : 'Unknown product'}
                        </Link>
                      </td>
                      <td>
                        {d.productVersion || '-'}
                        {behind && <span className="status-warn"> behind</span>}
                      </td>
                      <td className="muted">{p ? p.currentVersion : '-'}</td>
                      <td
                        className={
                          d.status === 'Suspended' ? 'status status-bad' : 'status'
                        }
                      >
                        {d.status || '-'}
                      </td>
                      <td className="muted">{d.supportTier || '-'}</td>
                      <td className="col-num">
                        {environments.filter((e) => e.deploymentId === d.id).length}
                      </td>
                      <td className="muted">{toDateInput(d.goLiveDate) || '-'}</td>
                      {canEdit && (
                        <td className="col-actions">
                          <button
                            className="btn btn-small"
                            onClick={() => startEdit(d)}
                            disabled={saving}
                          >
                            Edit
                          </button>{' '}
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => setToDelete(d)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && visible.length > 0 && (
        <p className="muted small">
          Showing {visible.length} of {deployments.length} deployments.
        </p>
      )}

      {toDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {deleteLabel}?</h2>
            <p>
              This also removes every environment recorded for this deployment. This
              cannot be undone.
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
