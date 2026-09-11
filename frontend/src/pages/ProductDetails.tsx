// One product: details, modules, clients, team, repositories and documents.
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type {
  Product,
  Module,
  Client,
  Deployment,
  TeamMember,
  ProductResponsibility,
  Repository,
  DocumentLink,
} from '../types';
import {
  getProduct,
  getModules,
  getClients,
  getDeployments,
  getTeamMembers,
  getProductResponsibilities,
  getRepositories,
  getDocumentLinks,
  deleteProduct,
  createModule,
  updateModule,
  deleteModule,
  createRepository,
  updateRepository,
  deleteRepository,
  createDocumentLink,
  updateDocumentLink,
  deleteDocumentLink,
  createResponsibility,
  deleteResponsibility,
} from '../api';
import { useAuth } from '../auth';

const DEPLOYMENT_STATUS_ORDER = ['Live', 'Pilot', 'Suspended'] as const;

export default function ProductDetails() {
  const { canEdit } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const productId = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [responsibilities, setResponsibilities] = useState<ProductResponsibility[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [documents, setDocuments] = useState<DocumentLink[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [rowDeleting, setRowDeleting] = useState(false);

  // Modules
  const [modForm, setModForm] = useState(false);
  const [modEditingId, setModEditingId] = useState<number | null>(null);
  const [modName, setModName] = useState('');
  const [modDescription, setModDescription] = useState('');
  const [modStatus, setModStatus] = useState('Active');
  const [modProblem, setModProblem] = useState('');
  const [modToDelete, setModToDelete] = useState<Module | null>(null);

  // Repositories
  const [repoForm, setRepoForm] = useState(false);
  const [repoEditingId, setRepoEditingId] = useState<number | null>(null);
  const [repoName, setRepoName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoBranch, setRepoBranch] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [repoProblem, setRepoProblem] = useState('');
  const [repoToDelete, setRepoToDelete] = useState<Repository | null>(null);

  // Documents
  const [docForm, setDocForm] = useState(false);
  const [docEditingId, setDocEditingId] = useState<number | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docLastUpdated, setDocLastUpdated] = useState('');
  const [docProblem, setDocProblem] = useState('');
  const [docToDelete, setDocToDelete] = useState<DocumentLink | null>(null);

  // Responsibilities (assign a team member to this product)
  const [respForm, setRespForm] = useState(false);
  const [respMemberId, setRespMemberId] = useState('');
  const [respRole, setRespRole] = useState('');
  const [respDescription, setRespDescription] = useState('');
  const [respProblems, setRespProblems] = useState<Record<string, string>>({});
  const [respToDelete, setRespToDelete] = useState<ProductResponsibility | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [p, m, c, d, t, r, repos, docs] = await Promise.all([
        getProduct(productId),
        getModules(),
        getClients(),
        getDeployments(),
        getTeamMembers(),
        getProductResponsibilities(),
        getRepositories(),
        getDocumentLinks(),
      ]);
      setProduct(p);
      setModules(m.filter((x) => x.productId === productId));
      setClients(c);
      setDeployments(d.filter((x) => x.productId === productId));
      setTeam(t);
      setResponsibilities(r.filter((x) => x.productId === productId));
      setRepositories(repos.filter((x) => x.productId === productId));
      setDocuments(docs.filter((x) => x.productId === productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this product.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [productId]);

  async function handleDelete() {
    try {
      setDeleting(true);
      await deleteProduct(productId);
      navigate('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this product.');
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  function clientName(id: number) {
    const found = clients.find((c) => c.id === id);
    return found ? found.companyName : 'Unknown client';
  }

  function memberName(id: number) {
    const found = team.find((m) => m.id === id);
    return found ? found.fullName : 'Unknown member';
  }

  function memberEmail(id: number) {
    const found = team.find((m) => m.id === id);
    return found ? found.email || '' : '';
  }

  function byName<T extends { name: string }>(list: T[]) {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  // ----- modules -----------------------------------------------------------

  function closeModForm() {
    setModForm(false);
    setModEditingId(null);
    setModName('');
    setModDescription('');
    setModStatus('Active');
    setModProblem('');
  }

  function startModEdit(m: Module) {
    setModName(m.name);
    setModDescription(m.description || '');
    setModStatus(m.status || 'Active');
    setModProblem('');
    setModEditingId(m.id);
    setModForm(true);
  }

  async function handleModSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!modName.trim()) {
      setModProblem('Module name is required.');
      return;
    }
    setModProblem('');

    const data = {
      productId,
      name: modName.trim(),
      description: modDescription.trim() || null,
      status: modStatus,
    };

    try {
      setSaving(true);
      if (modEditingId === null) {
        const created = await createModule(data);
        setModules(byName([...modules, created]));
        setMessage('Module created.');
      } else {
        const updated = await updateModule(modEditingId, data);
        setModules(byName(modules.map((m) => (m.id === updated.id ? updated : m))));
        setMessage('Module saved.');
      }
      closeModForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the module.');
    } finally {
      setSaving(false);
    }
  }

  async function handleModDelete() {
    if (!modToDelete) return;
    try {
      setRowDeleting(true);
      setError('');
      setMessage('');
      await deleteModule(modToDelete.id);
      setModules(modules.filter((m) => m.id !== modToDelete.id));
      setMessage('Module deleted.');
      if (modEditingId === modToDelete.id) closeModForm();
      setModToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the module.');
    } finally {
      setRowDeleting(false);
    }
  }

  // ----- repositories ------------------------------------------------------

  function closeRepoForm() {
    setRepoForm(false);
    setRepoEditingId(null);
    setRepoName('');
    setRepoUrl('');
    setRepoBranch('');
    setRepoDescription('');
    setRepoProblem('');
  }

  function startRepoEdit(r: Repository) {
    setRepoName(r.name);
    setRepoUrl(r.githubUrl || '');
    setRepoBranch(r.mainBranch || '');
    setRepoDescription(r.description || '');
    setRepoProblem('');
    setRepoEditingId(r.id);
    setRepoForm(true);
  }

  async function handleRepoSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!repoName.trim()) {
      setRepoProblem('Repository name is required.');
      return;
    }
    setRepoProblem('');

    const data = {
      productId,
      name: repoName.trim(),
      githubUrl: repoUrl.trim() || null,
      mainBranch: repoBranch.trim() || null,
      description: repoDescription.trim() || null,
    };

    try {
      setSaving(true);
      if (repoEditingId === null) {
        const created = await createRepository(data);
        setRepositories(byName([...repositories, created]));
        setMessage('Repository created.');
      } else {
        const updated = await updateRepository(repoEditingId, data);
        setRepositories(
          byName(repositories.map((r) => (r.id === updated.id ? updated : r)))
        );
        setMessage('Repository saved.');
      }
      closeRepoForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the repository.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRepoDelete() {
    if (!repoToDelete) return;
    try {
      setRowDeleting(true);
      setError('');
      setMessage('');
      await deleteRepository(repoToDelete.id);
      setRepositories(repositories.filter((r) => r.id !== repoToDelete.id));
      setMessage('Repository deleted.');
      if (repoEditingId === repoToDelete.id) closeRepoForm();
      setRepoToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the repository.');
    } finally {
      setRowDeleting(false);
    }
  }

  // ----- documents ---------------------------------------------------------

  function closeDocForm() {
    setDocForm(false);
    setDocEditingId(null);
    setDocName('');
    setDocType('');
    setDocUrl('');
    setDocDescription('');
    setDocLastUpdated('');
    setDocProblem('');
  }

  function startDocEdit(d: DocumentLink) {
    setDocName(d.name);
    setDocType(d.documentType || '');
    setDocUrl(d.url || '');
    setDocDescription(d.description || '');
    setDocLastUpdated(d.lastUpdated ? d.lastUpdated.slice(0, 10) : '');
    setDocProblem('');
    setDocEditingId(d.id);
    setDocForm(true);
  }

  async function handleDocSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!docName.trim()) {
      setDocProblem('Document name is required.');
      return;
    }
    setDocProblem('');

    const data = {
      productId,
      name: docName.trim(),
      documentType: docType.trim() || null,
      url: docUrl.trim() || null,
      description: docDescription.trim() || null,
      lastUpdated: docLastUpdated || null,
    };

    try {
      setSaving(true);
      if (docEditingId === null) {
        const created = await createDocumentLink(data);
        setDocuments(byName([...documents, created]));
        setMessage('Document created.');
      } else {
        const updated = await updateDocumentLink(docEditingId, data);
        setDocuments(byName(documents.map((d) => (d.id === updated.id ? updated : d))));
        setMessage('Document saved.');
      }
      closeDocForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the document.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDocDelete() {
    if (!docToDelete) return;
    try {
      setRowDeleting(true);
      setError('');
      setMessage('');
      await deleteDocumentLink(docToDelete.id);
      setDocuments(documents.filter((d) => d.id !== docToDelete.id));
      setMessage('Document deleted.');
      if (docEditingId === docToDelete.id) closeDocForm();
      setDocToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the document.');
    } finally {
      setRowDeleting(false);
    }
  }

  // ----- responsibilities --------------------------------------------------

  function closeRespForm() {
    setRespForm(false);
    setRespMemberId('');
    setRespRole('');
    setRespDescription('');
    setRespProblems({});
  }

  async function handleRespSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    const found: Record<string, string> = {};
    if (!respMemberId) found.member = 'Pick a team member.';
    if (!respRole.trim()) found.role = 'A responsibility is required.';
    setRespProblems(found);
    if (Object.keys(found).length > 0) return;

    try {
      setSaving(true);
      const created = await createResponsibility({
        productId,
        teamMemberId: Number(respMemberId),
        responsibility: respRole.trim(),
        description: respDescription.trim() || null,
      });
      setResponsibilities([...responsibilities, created]);
      setMessage('Team member assigned.');
      closeRespForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign the team member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRespDelete() {
    if (!respToDelete) return;
    try {
      setRowDeleting(true);
      setError('');
      setMessage('');
      await deleteResponsibility(respToDelete.id);
      setResponsibilities(responsibilities.filter((r) => r.id !== respToDelete.id));
      setMessage('Team member unassigned.');
      setRespToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unassign the team member.');
    } finally {
      setRowDeleting(false);
    }
  }

  if (loading) return <div className="loading">Loading product...</div>;

  if (!product) {
    return (
      <>
        <div className="error-box">{error || 'Product was not found.'}</div>
        <Link to="/products" className="btn">
          Back to products
        </Link>
      </>
    );
  }

  const deploymentStatusCounts = DEPLOYMENT_STATUS_ORDER.map((status) => ({
    label: status as string,
    count: deployments.filter((d) => d.status === status).length,
  }));
  const deploymentStatusMax = Math.max(1, ...deploymentStatusCounts.map((c) => c.count));

  return (
    <>
      <p className="small">
        <Link to="/products">Products</Link> <span className="muted">/ {product.name}</span>
      </p>

      <div className="page-head">
        <div>
          <h1>{product.name}</h1>
          <p>{product.criticality ? product.criticality + ' criticality' : ''}</p>
        </div>
        {canEdit && (
          <div className="btn-row">
            <Link to={'/products/' + product.id + '/edit'} className="btn">
              Edit
            </Link>
            <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
              Delete
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <p className="small muted">{message}</p>}

      <div className="card">
        <div className="kv">
          <div>
            <div className="kv-label">Status</div>
            <span
              className={
                product.lifecycleStatus === 'Active'
                  ? 'badge badge-ok'
                  : product.lifecycleStatus === 'Maintenance'
                    ? 'badge badge-warn'
                    : product.lifecycleStatus === 'Planned'
                      ? 'badge badge-accent'
                      : 'badge badge-off'
              }
            >
              {product.lifecycleStatus}
            </span>
          </div>
          <div>
            <div className="kv-label">Current version</div>
            <div>{product.currentVersion || '-'}</div>
          </div>
          <div>
            <div className="kv-label">Supported markets</div>
            <div>{product.supportedMarkets || '-'}</div>
          </div>
          <div>
            <div className="kv-label">Clients</div>
            <div>{deployments.length}</div>
          </div>
          <div>
            <div className="kv-label">Technologies</div>
            <div>{product.technologies || '-'}</div>
          </div>
        </div>

        {product.businessPurpose && (
          <div style={{ marginTop: 20 }}>
            <div className="kv-label">Business purpose</div>
            <div>{product.businessPurpose}</div>
          </div>
        )}

        {product.description && (
          <div style={{ marginTop: 16 }}>
            <div className="kv-label">Description</div>
            <div>{product.description}</div>
          </div>
        )}

        {product.notes && (
          <div style={{ marginTop: 16 }}>
            <div className="kv-label">Notes</div>
            <div className="muted">{product.notes}</div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Modules ({modules.length})</h2>
          {canEdit && (
            <button
              className="btn btn-small"
              onClick={() => (modForm ? closeModForm() : setModForm(true))}
            >
              {modForm ? 'Cancel' : 'New module'}
            </button>
          )}
        </div>

        {canEdit && modForm && (
          <form className="card" style={{ marginBottom: 16 }} onSubmit={handleModSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="modName">Module name *</label>
                <input
                  id="modName"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                />
                {modProblem && <div className="error-text">{modProblem}</div>}
              </div>
              <div className="field">
                <label htmlFor="modStatus">Status</label>
                <select
                  id="modStatus"
                  value={modStatus}
                  onChange={(e) => setModStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Planned">Planned</option>
                  <option value="Deprecated">Deprecated</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="modDescription">Description</label>
              <textarea
                id="modDescription"
                value={modDescription}
                onChange={(e) => setModDescription(e.target.value)}
              />
            </div>

            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : modEditingId === null
                    ? 'Create module'
                    : 'Save changes'}
              </button>
              <button type="button" className="btn" onClick={closeModForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {modules.length === 0 ? (
          <div className="empty">No modules recorded for this product.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Description</th>
                  <th>Status</th>
                  {canEdit && <th className="col-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td className="muted">{m.description || '-'}</td>
                    <td className="status">{m.status || '-'}</td>
                    {canEdit && (
                      <td className="col-actions">
                        <button
                          className="btn btn-small"
                          onClick={() => startModEdit(m)}
                          disabled={saving}
                        >
                          Edit
                        </button>{' '}
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => setModToDelete(m)}
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

      <div className="card">
        <div className="card-head">
          <h2>Clients running this product ({deployments.length})</h2>
        </div>
        {deployments.length > 0 && (
          <div className="hbar-chart hbar-chart-compact">
            {deploymentStatusCounts.map((c) => (
              <div className="hbar-row" key={c.label}>
                <span className="hbar-label">{c.label}</span>
                <span className="hbar-track">
                  <span
                    className="hbar-fill"
                    style={{ width: (c.count / deploymentStatusMax) * 100 + '%' }}
                  />
                </span>
                <span className="hbar-count">{c.count}</span>
              </div>
            ))}
          </div>
        )}
        {deployments.length === 0 ? (
          <div className="empty">No client is running this product yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Go live</th>
                  <th>Support tier</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link to={'/clients/' + d.clientId}>{clientName(d.clientId)}</Link>
                    </td>
                    <td>
                      {d.productVersion || '-'}
                      {d.productVersion &&
                        product.currentVersion &&
                        d.productVersion !== product.currentVersion && (
                          <span className="status-warn"> behind</span>
                        )}
                    </td>
                    <td
                      className={
                        d.status === 'Suspended' ? 'status status-bad' : 'status'
                      }
                    >
                      {d.status || '-'}
                    </td>
                    <td>{d.goLiveDate || '-'}</td>
                    <td className="muted">{d.supportTier || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Responsible team ({responsibilities.length})</h2>
          {canEdit && (
            <button
              className="btn btn-small"
              onClick={() => (respForm ? closeRespForm() : setRespForm(true))}
            >
              {respForm ? 'Cancel' : 'Assign team member'}
            </button>
          )}
        </div>

        {canEdit && respForm && (
          <form className="card" style={{ marginBottom: 16 }} onSubmit={handleRespSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="respMember">Team member *</label>
                <select
                  id="respMember"
                  value={respMemberId}
                  onChange={(e) => setRespMemberId(e.target.value)}
                >
                  <option value="">Select a team member</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
                {respProblems.member && (
                  <div className="error-text">{respProblems.member}</div>
                )}
              </div>
              <div className="field">
                <label htmlFor="respRole">Responsibility *</label>
                <input
                  id="respRole"
                  value={respRole}
                  onChange={(e) => setRespRole(e.target.value)}
                  placeholder="Product owner, Tech lead, Support"
                />
                {respProblems.role && <div className="error-text">{respProblems.role}</div>}
              </div>
            </div>

            <div className="field">
              <label htmlFor="respDescription">Description</label>
              <textarea
                id="respDescription"
                value={respDescription}
                onChange={(e) => setRespDescription(e.target.value)}
              />
            </div>

            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Assign'}
              </button>
              <button type="button" className="btn" onClick={closeRespForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {responsibilities.length === 0 ? (
          <div className="empty">Nobody is assigned to this product yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Responsibility</th>
                  <th>Contact</th>
                  {canEdit && <th className="col-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {responsibilities.map((r) => (
                  <tr key={r.id}>
                    <td>{memberName(r.teamMemberId)}</td>
                    <td>
                      {r.responsibility}
                      {r.description && <div className="muted small">{r.description}</div>}
                    </td>
                    <td>
                      {memberEmail(r.teamMemberId) ? (
                        <a href={'mailto:' + memberEmail(r.teamMemberId)}>
                          {memberEmail(r.teamMemberId)}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    {canEdit && (
                      <td className="col-actions">
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => setRespToDelete(r)}
                          disabled={saving}
                        >
                          Unassign
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

      <div className="card">
        <div className="card-head">
          <h2>Repositories ({repositories.length})</h2>
          {canEdit && (
            <button
              className="btn btn-small"
              onClick={() => (repoForm ? closeRepoForm() : setRepoForm(true))}
            >
              {repoForm ? 'Cancel' : 'New repository'}
            </button>
          )}
        </div>

        {canEdit && repoForm && (
          <form className="card" style={{ marginBottom: 16 }} onSubmit={handleRepoSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="repoName">Repository name *</label>
                <input
                  id="repoName"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                />
                {repoProblem && <div className="error-text">{repoProblem}</div>}
              </div>
              <div className="field">
                <label htmlFor="repoBranch">Main branch</label>
                <input
                  id="repoBranch"
                  value={repoBranch}
                  onChange={(e) => setRepoBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="repoUrl">Repository URL</label>
              <input
                id="repoUrl"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="repoDescription">Description</label>
              <textarea
                id="repoDescription"
                value={repoDescription}
                onChange={(e) => setRepoDescription(e.target.value)}
              />
            </div>

            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : repoEditingId === null
                    ? 'Create repository'
                    : 'Save changes'}
              </button>
              <button type="button" className="btn" onClick={closeRepoForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {repositories.length === 0 ? (
          <div className="empty">No repository linked.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Main branch</th>
                  <th>Link</th>
                  {canEdit && <th className="col-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {repositories.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.name}
                      {r.description && <div className="muted small">{r.description}</div>}
                    </td>
                    <td className="muted">{r.mainBranch || '-'}</td>
                    <td>
                      {r.githubUrl ? (
                        <a href={r.githubUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    {canEdit && (
                      <td className="col-actions">
                        <button
                          className="btn btn-small"
                          onClick={() => startRepoEdit(r)}
                          disabled={saving}
                        >
                          Edit
                        </button>{' '}
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => setRepoToDelete(r)}
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

      <div className="card">
        <div className="card-head">
          <h2>Documents ({documents.length})</h2>
          {canEdit && (
            <button
              className="btn btn-small"
              onClick={() => (docForm ? closeDocForm() : setDocForm(true))}
            >
              {docForm ? 'Cancel' : 'New document'}
            </button>
          )}
        </div>

        {canEdit && docForm && (
          <form className="card" style={{ marginBottom: 16 }} onSubmit={handleDocSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="docName">Document name *</label>
                <input
                  id="docName"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                />
                {docProblem && <div className="error-text">{docProblem}</div>}
              </div>
              <div className="field">
                <label htmlFor="docType">Document type</label>
                <input
                  id="docType"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="Specification, Runbook, Manual"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="docUrl">Link</label>
                <input
                  id="docUrl"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="docLastUpdated">Last updated</label>
                <input
                  id="docLastUpdated"
                  type="date"
                  value={docLastUpdated}
                  onChange={(e) => setDocLastUpdated(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="docDescription">Description</label>
              <textarea
                id="docDescription"
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
              />
            </div>

            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : docEditingId === null
                    ? 'Create document'
                    : 'Save changes'}
              </button>
              <button type="button" className="btn" onClick={closeDocForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {documents.length === 0 ? (
          <div className="empty">No documents linked.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Updated</th>
                  <th>Link</th>
                  {canEdit && <th className="col-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.documentType || '-'}</td>
                    <td className="muted">
                      {d.lastUpdated ? d.lastUpdated.slice(0, 10) : '-'}
                    </td>
                    <td>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    {canEdit && (
                      <td className="col-actions">
                        <button
                          className="btn btn-small"
                          onClick={() => startDocEdit(d)}
                          disabled={saving}
                        >
                          Edit
                        </button>{' '}
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => setDocToDelete(d)}
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

      {modToDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {modToDelete.name}?</h2>
            <p>This module will be removed from the product. This cannot be undone.</p>
            <div className="btn-row">
              <button
                className="btn btn-danger"
                onClick={handleModDelete}
                disabled={rowDeleting}
              >
                {rowDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                className="btn"
                onClick={() => setModToDelete(null)}
                disabled={rowDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {respToDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Unassign {memberName(respToDelete.teamMemberId)}?</h2>
            <p>
              They stay on the team, but will no longer be listed as responsible for
              this product.
            </p>
            <div className="btn-row">
              <button
                className="btn btn-danger"
                onClick={handleRespDelete}
                disabled={rowDeleting}
              >
                {rowDeleting ? 'Removing...' : 'Yes, unassign'}
              </button>
              <button
                className="btn"
                onClick={() => setRespToDelete(null)}
                disabled={rowDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {repoToDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {repoToDelete.name}?</h2>
            <p>
              This unlinks the repository from the product. The repository itself is not
              touched. This cannot be undone.
            </p>
            <div className="btn-row">
              <button
                className="btn btn-danger"
                onClick={handleRepoDelete}
                disabled={rowDeleting}
              >
                {rowDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                className="btn"
                onClick={() => setRepoToDelete(null)}
                disabled={rowDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {docToDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {docToDelete.name}?</h2>
            <p>
              This removes the link from the product. The document itself is not touched.
              This cannot be undone.
            </p>
            <div className="btn-row">
              <button
                className="btn btn-danger"
                onClick={handleDocDelete}
                disabled={rowDeleting}
              >
                {rowDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                className="btn"
                onClick={() => setDocToDelete(null)}
                disabled={rowDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {product.name}?</h2>
            <p>
              This also removes its modules, repositories, documents and every
              deployment of it. This cannot be undone.
            </p>
            <div className="btn-row">
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button className="btn" onClick={() => setConfirmOpen(false)} disabled={deleting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
