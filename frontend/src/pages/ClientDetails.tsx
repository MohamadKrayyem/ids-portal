// One client: their details, deployments, environments and responsible team.
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type {
  Client,
  Product,
  Deployment,
  Environment,
  ClientTeamMember,
} from '../types';
import {
  getClient,
  getProducts,
  getDeployments,
  getEnvironments,
  getClientTeam,
  deleteClient,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from '../api';
import { useAuth } from '../auth';

const ENVIRONMENT_TYPE_ORDER = ['Development', 'Testing', 'UAT', 'Production'] as const;

type ResponsiblePerson = {
  id: number;
  fullName: string;
  jobTitle: string | null;
  responsibilities: string[];
};

export default function ClientDetails() {
  const { canEdit } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const clientId = Number(params.id);

  const [client, setClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [team, setTeam] = useState<ClientTeamMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  // Environment editing. formDeploymentId is the deployment whose card holds the
  // open form; envEditingId is null while creating.
  const [formDeploymentId, setFormDeploymentId] = useState<number | null>(null);
  const [envEditingId, setEnvEditingId] = useState<number | null>(null);
  const [envName, setEnvName] = useState('');
  const [envType, setEnvType] = useState('Development');
  const [envPurpose, setEnvPurpose] = useState('');
  const [envServer, setEnvServer] = useState('');
  const [envOs, setEnvOs] = useState('');
  const [envUrl, setEnvUrl] = useState('');
  const [envDatabase, setEnvDatabase] = useState('');
  const [envMonitoring, setEnvMonitoring] = useState('');
  const [envAccess, setEnvAccess] = useState('');
  const [envNotes, setEnvNotes] = useState('');
  const [envProblems, setEnvProblems] = useState<Record<string, string>>({});
  const [envSaving, setEnvSaving] = useState(false);
  const [envToDelete, setEnvToDelete] = useState<Environment | null>(null);
  const [envDeleting, setEnvDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [c, p, d, e, t] = await Promise.all([
        getClient(clientId),
        getProducts(),
        getDeployments(),
        getEnvironments(),
        getClientTeam(clientId),
      ]);
      setClient(c);
      setProducts(p);
      setDeployments(d.filter((x) => x.clientId === clientId));
      setEnvironments(e);
      setTeam(t);
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

  function resetEnvForm() {
    setEnvName('');
    setEnvType('Development');
    setEnvPurpose('');
    setEnvServer('');
    setEnvOs('');
    setEnvUrl('');
    setEnvDatabase('');
    setEnvMonitoring('');
    setEnvAccess('');
    setEnvNotes('');
    setEnvProblems({});
  }

  function closeEnvForm() {
    setFormDeploymentId(null);
    setEnvEditingId(null);
    resetEnvForm();
  }

  function startEnvCreate(deploymentId: number) {
    resetEnvForm();
    setEnvEditingId(null);
    setFormDeploymentId(deploymentId);
  }

  function startEnvEdit(e: Environment) {
    setEnvName(e.name);
    setEnvType(e.environmentType || 'Development');
    setEnvPurpose(e.purpose || '');
    setEnvServer(e.serverName || '');
    setEnvOs(e.operatingSystem || '');
    setEnvUrl(e.applicationUrl || '');
    setEnvDatabase(e.databaseInfo || '');
    setEnvMonitoring(e.monitoringLink || '');
    setEnvAccess(e.accessReference || '');
    setEnvNotes(e.notes || '');
    setEnvProblems({});
    setEnvEditingId(e.id);
    setFormDeploymentId(e.deploymentId);
  }

  async function handleEnvSubmit(event: React.FormEvent, deploymentId: number) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!envName.trim()) {
      setEnvProblems({ name: 'Environment name is required.' });
      return;
    }
    setEnvProblems({});

    const data = {
      deploymentId,
      name: envName.trim(),
      environmentType: envType,
      purpose: envPurpose.trim() || null,
      serverName: envServer.trim() || null,
      operatingSystem: envOs.trim() || null,
      applicationUrl: envUrl.trim() || null,
      databaseInfo: envDatabase.trim() || null,
      monitoringLink: envMonitoring.trim() || null,
      accessReference: envAccess.trim() || null,
      notes: envNotes.trim() || null,
    };

    try {
      setEnvSaving(true);
      if (envEditingId === null) {
        const created = await createEnvironment(data);
        setEnvironments([...environments, created]);
        setMessage('Environment created.');
      } else {
        const updated = await updateEnvironment(envEditingId, data);
        setEnvironments(environments.map((e) => (e.id === updated.id ? updated : e)));
        setMessage('Environment saved.');
      }
      closeEnvForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the environment.');
    } finally {
      setEnvSaving(false);
    }
  }

  async function handleEnvDelete() {
    if (!envToDelete) return;
    try {
      setEnvDeleting(true);
      setError('');
      setMessage('');
      await deleteEnvironment(envToDelete.id);
      setEnvironments(environments.filter((e) => e.id !== envToDelete.id));
      setMessage('Environment deleted.');
      if (envEditingId === envToDelete.id) closeEnvForm();
      setEnvToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the environment.');
    } finally {
      setEnvDeleting(false);
    }
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

  const byPerson = new Map<number, ResponsiblePerson>();
  for (const row of team) {
    const already = byPerson.get(row.id);
    if (!already) {
      byPerson.set(row.id, {
        id: row.id,
        fullName: row.fullName,
        jobTitle: row.jobTitle,
        responsibilities: [row.responsibility],
      });
    } else if (!already.responsibilities.includes(row.responsibility)) {
      already.responsibilities.push(row.responsibility);
    }
  }
  const responsibleTeam = [...byPerson.values()];

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
      {message && <p className="small muted">{message}</p>}

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
                <div className="btn-row">
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
                  {canEdit && (
                    <button
                      className="btn btn-small"
                      onClick={() =>
                        formDeploymentId === d.id && envEditingId === null
                          ? closeEnvForm()
                          : startEnvCreate(d.id)
                      }
                    >
                      {formDeploymentId === d.id && envEditingId === null
                        ? 'Cancel'
                        : 'Add environment'}
                    </button>
                  )}
                </div>
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

              {canEdit && formDeploymentId === d.id && (
                <form
                  className="card"
                  style={{ marginBottom: 16 }}
                  onSubmit={(event) => handleEnvSubmit(event, d.id)}
                >
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor={'envName' + d.id}>Environment name *</label>
                      <input
                        id={'envName' + d.id}
                        value={envName}
                        onChange={(e) => setEnvName(e.target.value)}
                      />
                      {envProblems.name && (
                        <div className="error-text">{envProblems.name}</div>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor={'envType' + d.id}>Environment type</label>
                      <select
                        id={'envType' + d.id}
                        value={envType}
                        onChange={(e) => setEnvType(e.target.value)}
                      >
                        {ENVIRONMENT_TYPE_ORDER.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label htmlFor={'envPurpose' + d.id}>Purpose</label>
                      <input
                        id={'envPurpose' + d.id}
                        value={envPurpose}
                        onChange={(e) => setEnvPurpose(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={'envServer' + d.id}>Server name</label>
                      <input
                        id={'envServer' + d.id}
                        value={envServer}
                        onChange={(e) => setEnvServer(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label htmlFor={'envOs' + d.id}>Operating system</label>
                      <input
                        id={'envOs' + d.id}
                        value={envOs}
                        onChange={(e) => setEnvOs(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={'envUrl' + d.id}>Application URL</label>
                      <input
                        id={'envUrl' + d.id}
                        value={envUrl}
                        onChange={(e) => setEnvUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label htmlFor={'envDatabase' + d.id}>Database information</label>
                      <input
                        id={'envDatabase' + d.id}
                        value={envDatabase}
                        onChange={(e) => setEnvDatabase(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={'envMonitoring' + d.id}>Monitoring link</label>
                      <input
                        id={'envMonitoring' + d.id}
                        value={envMonitoring}
                        onChange={(e) => setEnvMonitoring(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor={'envAccess' + d.id}>Access reference</label>
                    <input
                      id={'envAccess' + d.id}
                      value={envAccess}
                      onChange={(e) => setEnvAccess(e.target.value)}
                      placeholder="Where access is requested - never a password or key"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={'envNotes' + d.id}>Notes</label>
                    <textarea
                      id={'envNotes' + d.id}
                      value={envNotes}
                      onChange={(e) => setEnvNotes(e.target.value)}
                    />
                  </div>

                  <div className="btn-row">
                    <button type="submit" className="btn btn-primary" disabled={envSaving}>
                      {envSaving
                        ? 'Saving...'
                        : envEditingId === null
                          ? 'Create environment'
                          : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={closeEnvForm}
                      disabled={envSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

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
                        {canEdit && <th className="col-actions">Actions</th>}
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

                          <td className="muted small">{e.accessReference || '-'}</td>
                          {canEdit && (
                            <td className="col-actions">
                              <button
                                className="btn btn-small"
                                onClick={() => startEnvEdit(e)}
                                disabled={envSaving}
                              >
                                Edit
                              </button>{' '}
                              <button
                                className="btn btn-small btn-danger"
                                onClick={() => setEnvToDelete(e)}
                                disabled={envSaving}
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
          );
        })
      )}

      <h2 style={{ margin: '26px 0 14px' }}>
        Responsible Team ({responsibleTeam.length})
      </h2>

      <div className="card">
        {responsibleTeam.length === 0 ? (
          <div className="empty">No responsible team members recorded.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Job title</th>
                  <th>Responsibility</th>
                </tr>
              </thead>
              <tbody>
                {responsibleTeam.map((person) => (
                  <tr key={person.id}>
                    <td>{person.fullName}</td>
                    <td className="muted">{person.jobTitle || '-'}</td>

                    <td>{person.responsibilities.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {envToDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {envToDelete.name}?</h2>
            <p>
              This environment will be removed from the deployment. This cannot be
              undone.
            </p>
            <div className="btn-row">
              <button
                className="btn btn-danger"
                onClick={handleEnvDelete}
                disabled={envDeleting}
              >
                {envDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                className="btn"
                onClick={() => setEnvToDelete(null)}
                disabled={envDeleting}
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
