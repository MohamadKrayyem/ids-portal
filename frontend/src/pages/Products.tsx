// Products list, with search and a lifecycle status filter.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, Deployment } from '../types';
import { getProducts, getDeployments } from '../api';
import { useAuth } from '../auth';

export default function Products() {
  const { canEdit } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [p, d] = await Promise.all([getProducts(), getDeployments()]);
      setProducts(p);
      setDeployments(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const text = search.trim().toLowerCase();
  const visible = products.filter((p) => {
    const matchesText =
      text === '' ||
      p.name.toLowerCase().includes(text) ||
      (p.description || '').toLowerCase().includes(text) ||
      (p.technologies || '').toLowerCase().includes(text);
    const matchesStatus = status === '' || p.lifecycleStatus === status;
    return matchesText && matchesStatus;
  });

  function statusClass(value: string) {
    return value === 'Deprecated' ? 'status status-bad' : 'status';
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>Every product we build, and who runs it.</p>
        </div>
        {canEdit && (
          <Link to="/products/new" className="btn btn-primary">
            New product
          </Link>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="filters">
        <input
          type="search"
          placeholder="Search by name, description or technology"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Planned">Planned</option>
          <option value="Deprecated">Deprecated</option>
        </select>
      </div>

      <div className="card panel-fill">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            {products.length === 0
              ? 'No products yet.'
              : 'No products match your search.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Criticality</th>
                  <th>Current version</th>
                  <th className="col-num">Clients</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={'/products/' + p.id}>{p.name}</Link>
                    </td>
                    <td className={statusClass(p.lifecycleStatus)}>{p.lifecycleStatus}</td>
                    <td className="muted">{p.criticality || '-'}</td>
                    <td>{p.currentVersion || '-'}</td>
                    <td className="col-num">
                      {deployments.filter((d) => d.productId === p.id).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && visible.length > 0 && (
        <p className="muted small">
          Showing {visible.length} of {products.length} products.
        </p>
      )}
    </>
  );
}
