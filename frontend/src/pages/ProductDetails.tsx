// Everything about one product: details, modules, the clients running it,
// the team responsible, its repositories and its documents.

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
} from '../api';
import { useAuth } from '../auth';

const DEPLOYMENT_STATUS_ORDER = ['Live', 'Pilot', 'Suspended'] as const;

export default function ProductDetails() {
  const { canEdit } = useAuth();
  const params = useParams(); // reads the ":id" out of the URL
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
    // Run again if the user opens a different product without leaving the page.
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
        </div>
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
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td className="muted">{m.description || '-'}</td>
                    <td className="status">{m.status || '-'}</td>
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
        </div>
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
        </div>
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
        </div>
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
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.documentType || '-'}</td>
                    <td className="muted">{d.lastUpdated || '-'}</td>
                    <td>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm dialog. It only exists in the page while confirmOpen is true. */}
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
