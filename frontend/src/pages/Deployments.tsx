// Every client-product pair in one table, with search and filters.
// This is the read-only overview; deployments are edited from the client page.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, Client, Deployment, Environment } from '../types';
import { getProducts, getClients, getDeployments, getEnvironments } from '../api';

export default function Deployments() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [productId, setProductId] = useState('');
  const [onlyBehind, setOnlyBehind] = useState(false);

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
    const isBehind = p && d.productVersion ? d.productVersion !== p.currentVersion : false;
    return matchesText && matchesStatus && matchesProduct && (!onlyBehind || isBehind);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Deployments</h1>
          <p>Which client runs which product, and at what version.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

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

      <div className="card">
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
                      <td className="muted">{d.goLiveDate || '-'}</td>
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
    </>
  );
}
