// Clients list, with search and status/country/product filters.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Client, Deployment, Product } from '../types';
import { getClients, getDeployments, getProducts } from '../api';
import { useAuth } from '../auth';

export default function Clients() {
  const { canEdit } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [productId, setProductId] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [c, d, p] = await Promise.all([
        getClients(),
        getDeployments(),
        getProducts(),
      ]);
      setClients(c);
      setDeployments(d);
      setProducts(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load clients.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const countries = [...new Set(clients.map((c) => c.country).filter((c): c is string => !!c))].sort();

  const text = search.trim().toLowerCase();
  const visible = clients.filter((c) => {
    const matchesText =
      text === '' ||
      c.companyName.toLowerCase().includes(text) ||
      (c.contactInfo || '').toLowerCase().includes(text) ||
      (c.country || '').toLowerCase().includes(text);
    const matchesStatus = status === '' || c.status === status;
    const matchesCountry = country === '' || c.country === country;
    const matchesProduct =
      productId === '' ||
      deployments.some(
        (d) => d.clientId === c.id && d.productId === Number(productId)
      );
    return matchesText && matchesStatus && matchesCountry && matchesProduct;
  });

  function statusClass(value: string | null) {
    return value === 'Former' ? 'status status-bad' : 'status';
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>Companies that use our products.</p>
        </div>
        {canEdit && (
          <Link to="/clients/new" className="btn btn-primary">
            New client
          </Link>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="filters">
        <input
          type="search"
          placeholder="Search by name, country or contact"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Prospect">Prospect</option>
          <option value="Former">Former</option>
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card panel-fill">
        {loading ? (
          <div className="loading">Loading clients...</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            {clients.length === 0 ? 'No clients yet.' : 'No clients match your search.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Country</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="col-num">Products</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={'/clients/' + c.id}>{c.companyName}</Link>
                    </td>
                    <td>{c.country || '-'}</td>
                    <td className="muted small">{c.contactInfo || '-'}</td>
                    <td className={statusClass(c.status)}>{c.status || '-'}</td>
                    <td className="col-num">
                      {deployments.filter((d) => d.clientId === c.id).length}
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
          Showing {visible.length} of {clients.length} clients.
        </p>
      )}
    </>
  );
}
