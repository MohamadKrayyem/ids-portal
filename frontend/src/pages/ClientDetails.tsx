// One client: their details, every product they run (deployments), and the
// environments inside each deployment.

import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Client, Product, Deployment, Environment } from '../types';
import {
  getClient,
  getProducts,
  getDeployments,
  getEnvironments,
  deleteClient,
} from '../api';
import { useAuth } from '../auth';

const ENVIRONMENT_TYPE_ORDER = ['Development', 'Testing', 'UAT', 'Production'] as const;

export default function ClientDetails() {
  const { canEdit } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const clientId = Number(params.id);

  const [client, setClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [c, p, d, e] = await Promise.all([
        getClient(clientId),
        getProducts(),
        getDeployments(),
        getEnvironments(),
      ]);
      setClient(c);
      setProducts(p);
      setDeployments(d.filter((x) => x.clientId === clientId));
      setEnvironments(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this client.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function handleDelete() {
    try {
      setDeleting(true);
      await deleteClient(clientId);
      navigate('/clients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this client.');
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  function product(id: number) {
    return products.find((p) => p.id === id);
  }

  if (loading) return <div className="loading">Loading client...</div>;

  if (!client) {
    return (
      <>
        <div className="error-box">{error || 'Client was not found.'}</div>
        <Link to="/clients" className="btn">
          Back to clients
        </Link>
      </>
    );
  }

  const deploymentIds = new Set(deployments.map((d) => d.id));
  const clientEnvironments = environments.filter((e) => deploymentIds.has(e.deploymentId));
  const envTypeCounts = ENVIRONMENT_TYPE_ORDER.map((type) => ({
    label: type as string,
    count: clientEnvironments.filter((e) => e.environmentType === type).length,
  }));
  const envTypeTotal = envTypeCounts.reduce((sum, c) => sum + c.count, 0);
  const envTypeMax = Math.max(1, ...envTypeCounts.map((c) => c.count));

  return (
    <>
      <p className="small">
        <Link to="/clients">Clients</Link> <span className="muted">/ {client.companyName}</span>
      </p>

      <div className="page-head">
        <div>
          <h1>{client.companyName}</h1>
          <p>{client.country || '-'}</p>
        </div>
        {canEdit && (
          <div className="btn-row">
            <Link to={'/clients/' + client.id + '/edit'} className="btn">
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
                client.status === 'Active'
                  ? 'badge badge-ok'
                  : client.status === 'Prospect'
                    ? 'badge badge-accent'
                    : 'badge badge-off'
              }
            >
              {client.status || '-'}
            </span>
          </div>
          <div>
            <div className="kv-label">Country</div>
            <div>{client.country || '-'}</div>
          </div>
          <div>
            <div className="kv-label">Products in use</div>
            <div>{deployments.length}</div>
          </div>
          <div>
            <div className="kv-label">Contact</div>
            <div>{client.contactInfo || '-'}</div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="kv-label">Environments by type</div>
          {envTypeTotal === 0 ? (
            <div className="chart-empty">No environments recorded yet.</div>
          ) : (
            <div className="hbar-chart hbar-chart-compact" style={{ marginTop: 8 }}>
              {envTypeCounts.map((c) => (
                <div className="hbar-row" key={c.label}>
                  <span className="hbar-label">{c.label}</span>
                  <span className="hbar-track">
                    <span
                      className="hbar-fill"
                      style={{ width: (c.count / envTypeMax) * 100 + '%' }}
                    />
                  </span>
                  <span className="hbar-count">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {client.notes && (
          <div style={{ marginTop: 20 }}>
            <div className="kv-label">Notes</div>
            <div className="muted">{client.notes}</div>
          </div>
        )}
      </div>

      <h2 style={{ margin: '26px 0 14px' }}>Deployments ({deployments.length})</h2>

      {deployments.length === 0 ? (
        <div className="card">
          <div className="empty">This client does not run any product yet.</div>
        </div>
      ) : (
        // One card per deployment, with its environments inside it.
        deployments.map((d) => {
          const p = product(d.productId);
          const mine = environments.filter((e) => e.deploymentId === d.id);
          return (
            <div className="card" key={d.id}>
              <div className="card-head">
                <div>
                  <h3>
                    {p ? (
                      <Link to={'/products/' + p.id}>{p.name}</Link>
                    ) : (
                      'Unknown product'
                    )}
                  </h3>
                  <div className="muted small">
                    Version {d.productVersion || '-'}
                    {p && d.productVersion && d.productVersion !== p.currentVersion
                      ? ' (latest is ' + p.currentVersion + ')'
                      : ''}
                  </div>
                </div>
                <span
                  className={
                    d.status === 'Live'
                      ? 'badge badge-ok'
                      : d.status === 'Pilot'
                        ? 'badge badge-accent'
                        : 'badge badge-off'
                  }
                >
                  {d.status || '-'}
                </span>
              </div>

              <div className="kv" style={{ marginBottom: 16 }}>
                <div>
                  <div className="kv-label">Go live</div>
                  <div>{d.goLiveDate || '-'}</div>
                </div>
                <div>
                  <div className="kv-label">Support tier</div>
                  <div>{d.supportTier || '-'}</div>
                </div>
                <div>
                  <div className="kv-label">Enabled modules</div>
                  <div>{d.enabledModules || '-'}</div>
                </div>
              </div>

              {d.notes && <p className="muted small">{d.notes}</p>}

              {mine.length === 0 ? (
                <div className="empty">No environment recorded for this deployment.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Environment</th>
                        <th>Type</th>
                        <th>Server</th>
                        <th>Application</th>
                        <th>Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mine.map((e) => (
                        <tr key={e.id}>
                          <td>{e.name}</td>
                          <td className="status">{e.environmentType || '-'}</td>
                          <td className="muted">{e.serverName || '-'}</td>
                          <td>
                            {e.applicationUrl ? (
                              <a href={e.applicationUrl} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          {/* Where to request access. Never a password or key. */}
                          <td className="muted small">{e.accessReference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}

      {confirmOpen && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {client.companyName}?</h2>
            <p>
              This also removes their deployments and environments. This cannot be
              undone.
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
