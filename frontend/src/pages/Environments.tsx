// Environments list, with search and a type filter.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Environment, Deployment, Client, Product } from '../types';
import {
  getEnvironments,
  getDeployments,
  getClients,
  getProducts,
  deleteEnvironment,
} from '../api';
import { useAuth } from '../auth';

const ENVIRONMENT_TYPE_ORDER = ['Development', 'Testing', 'UAT', 'Production'] as const;

export default function Environments() {
  const { canEdit } = useAuth();

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const [toDelete, setToDelete] = useState<Environment | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [e, d, c, p] = await Promise.all([
        getEnvironments(),
        getDeployments(),
        getClients(),
        getProducts(),
      ]);
      setEnvironments(e);
      setDeployments(d);
      setClients(c);
      setProducts(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load environments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!toDelete) return;
    try {
      setDeleting(true);
      setError('');
      setMessage('');
      await deleteEnvironment(toDelete.id);
      setEnvironments(environments.filter((e) => e.id !== toDelete.id));
      setMessage('Environment deleted.');
      setToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the environment.');
    } finally {
      setDeleting(false);
    }
  }

  // Each environment belongs to a deployment, which links one client to one product.
  function rowOf(e: Environment) {
    const d = deployments.find((x) => x.id === e.deploymentId);
    return {
      env: e,
      client: d ? clients.find((c) => c.id === d.clientId) : undefined,
      product: d ? products.find((p) => p.id === d.productId) : undefined,
    };
  }

  const text = search.trim().toLowerCase();
  const visible = environments.map(rowOf).filter(({ env, client, product }) => {
    const matchesText =
      text === '' ||
      env.name.toLowerCase().includes(text) ||
      (env.serverName || '').toLowerCase().includes(text) ||
      (client?.companyName || '').toLowerCase().includes(text) ||
      (product?.name || '').toLowerCase().includes(text);
    const matchesType = type === '' || env.environmentType === type;
    return matchesText && matchesType;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Environments</h1>
          <p>Every running copy of a product at a client.</p>
        </div>
        {canEdit && (
          <Link to="/environments/new" className="btn btn-primary">
            New environment
          </Link>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <p className="small muted">{message}</p>}

      <div className="filters">
        <input
          type="search"
          placeholder="Search by client, product, name or server"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {ENVIRONMENT_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="card panel-fill">
        {loading ? (
          <div className="loading">Loading environments...</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            {environments.length === 0
              ? 'No environments yet.'
              : 'No environments match your search.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Server</th>
                  <th>URL</th>
                  {canEdit && <th className="col-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map(({ env, client, product }) => (
                  <tr key={env.id}>
                    <td>
                      {client ? (
                        <Link to={'/clients/' + client.id}>{client.companyName}</Link>
                      ) : (
                        'Unknown client'
                      )}
                    </td>
                    <td>
                      {product ? (
                        <Link to={'/products/' + product.id}>{product.name}</Link>
                      ) : (
                        'Unknown product'
                      )}
                    </td>
                    <td className="status">{env.environmentType || '-'}</td>
                    <td>{env.name}</td>
                    <td className="muted">{env.serverName || '-'}</td>
                    <td>
                      {env.applicationUrl ? (
                        <a href={env.applicationUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    {canEdit && (
                      <td className="col-actions">
                        <Link
                          to={'/environments/' + env.id + '/edit'}
                          className="btn btn-small"
                        >
                          Edit
                        </Link>{' '}
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => setToDelete(env)}
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
          Showing {visible.length} of {environments.length} environments.
        </p>
      )}

      {toDelete && (
        <div className="overlay">
          <div className="dialog">
            <h2>Delete {toDelete.name}?</h2>
            <p>
              This environment will be removed from the deployment. This cannot be
              undone.
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
