// The people at IDS and the products each of them is responsible for.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TeamMember, ProductResponsibility, Product } from '../types';
import { getTeamMembers, getProductResponsibilities, getProducts } from '../api';

export default function TeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [responsibilities, setResponsibilities] = useState<ProductResponsibility[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');

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

  // Every product this person looks after, with what they do on it.
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
      </div>

      {error && <div className="error-box">{error}</div>}

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

      <div className="card">
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
    </>
  );
}
