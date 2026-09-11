// Dashboard: the summary counts and the deployments behind the latest version.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, Client, Deployment, DashboardStats } from '../types';
import { getDashboard, getProducts, getClients, getDeployments } from '../api';
import { useAuth } from '../auth';

const LIFECYCLE_ORDER = ['Active', 'Maintenance', 'Planned', 'Deprecated'] as const;
const LIFECYCLE_SHADES = ['#CBD5E1', '#94A3B8', '#475569', '#1E3A8A'];
const DEPLOYMENT_STATUS_ORDER = ['Live', 'Pilot', 'Suspended'] as const;

const DONUT_CIRCUMFERENCE = 2 * Math.PI * 45;

function updatedOn(value: string) {
  return value ? value.slice(0, 10) : '-';
}

export default function Dashboard() {
  const { currentUser } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [s, p, c, d] = await Promise.all([
        getDashboard(),
        getProducts(),
        getClients(),
        getDeployments(),
      ]);
      setStats(s);
      setProducts(p);
      setClients(c);
      setDeployments(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function productName(id: number) {
    const found = products.find((p) => p.id === id);
    return found ? found.name : 'Unknown product';
  }

  function clientName(id: number) {
    const found = clients.find((c) => c.id === id);
    return found ? found.companyName : 'Unknown client';
  }

  const behind = deployments.filter((d) => {
    const product = products.find((p) => p.id === d.productId);
    return (
      product &&
      d.status !== 'Suspended' &&
      d.productVersion &&
      d.productVersion !== product.currentVersion
    );
  });

  if (loading || !stats) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const lifecycleCounts = LIFECYCLE_ORDER.map((status) => ({
    label: status as string,
    count: products.filter((p) => p.lifecycleStatus === status).length,
  }));
  const lifecycleTotal = products.length;
  let cumulative = 0;
  const donutSegments = lifecycleCounts.map((c, i) => {
    const length = lifecycleTotal > 0 ? (c.count / lifecycleTotal) * DONUT_CIRCUMFERENCE : 0;
    const segment = { ...c, length, offset: -cumulative, color: LIFECYCLE_SHADES[i] };
    cumulative += length;
    return segment;
  });

  const recentProducts = stats.recentProducts ?? [];

  const deploymentStatusCounts = DEPLOYMENT_STATUS_ORDER.map((status) => ({
    label: status as string,
    count: deployments.filter((d) => d.status === status).length,
  }));
  const deploymentStatusTotal = deploymentStatusCounts.reduce((sum, c) => sum + c.count, 0);
  const deploymentStatusMax = Math.max(1, ...deploymentStatusCounts.map((c) => c.count));

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">
            Welcome back, {currentUser ? currentUser.fullName.split(' ')[0] : ''}.
            Here is where things stand today.
          </p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="stat-group">
        <div className="stat-card">
          <div className="stat-label">Products</div>
          <div className="stat-value">{stats.products}</div>
          <div className="stat-qualifier">{stats.activeProducts} active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Clients</div>
          <div className="stat-value">{stats.clients}</div>
          <div className="stat-qualifier">{stats.activeClients} active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Deployments</div>
          <div className="stat-value">{stats.deployments}</div>
          <div className="stat-qualifier">{stats.liveDeployments} live</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Environments</div>
          <div className="stat-value">{stats.environments}</div>
          <div className="stat-qualifier">{stats.productionEnvironments} production</div>
        </div>

        <Link to="/team" className="stat-card stat-card-link">
          <div className="stat-label">Team members</div>
          <div className="stat-value">{stats.teamMembers}</div>
          <div className="stat-qualifier">View team</div>
        </Link>
      </div>

      <div className="section-label">Breakdown</div>

      <div className="chart-row">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Products by lifecycle</h2>
          </div>
          <div className="dash-panel-body">
            {lifecycleTotal === 0 ? (
              <div className="chart-empty">No products recorded yet.</div>
            ) : (
              <div className="donut-chart">
                <svg className="donut-svg" viewBox="0 0 120 120">
                  <g transform="rotate(-90 60 60)">
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.label}
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="18"
                        strokeDasharray={`${seg.length} ${DONUT_CIRCUMFERENCE - seg.length}`}
                        strokeDashoffset={seg.offset}
                      />
                    ))}
                  </g>
                  <text x="60" y="57" textAnchor="middle" className="donut-total-value">
                    {lifecycleTotal}
                  </text>
                  <text x="60" y="72" textAnchor="middle" className="donut-total-label">
                    products
                  </text>
                </svg>
                <div className="donut-legend">
                  {donutSegments.map((seg) => (
                    <div className="donut-legend-item" key={seg.label}>
                      <span className="donut-legend-swatch" style={{ background: seg.color }} />
                      <span className="donut-legend-label">{seg.label}</span>
                      <span className="donut-legend-count">{seg.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Deployments by status</h2>
          </div>
          <div className="dash-panel-body">
            {deploymentStatusTotal === 0 ? (
              <div className="chart-empty">No deployments recorded yet.</div>
            ) : (
              <div className="hbar-chart">
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
          </div>
        </div>
      </div>

      <div className="section-label">Detail</div>

      <div className="dash-detail">
        <div className="dash-panel panel-fill">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Not on the latest version</h2>
            <div className="dash-chip-row">
              <Link to="/deployments" className="dash-chip dash-chip-outline">
                All deployments
              </Link>
            </div>
          </div>

          {behind.length === 0 ? (
            <div className="empty">Every deployment is on the latest version.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Product</th>
                    <th className="col-num">Version</th>
                  </tr>
                </thead>
                <tbody>
                  {behind.map((d) => {
                    const product = products.find((p) => p.id === d.productId);
                    return (
                      <tr key={d.id}>
                        <td>
                          <Link to={'/clients/' + d.clientId}>{clientName(d.clientId)}</Link>
                        </td>
                        <td>
                          <Link to={'/products/' + d.productId}>{productName(d.productId)}</Link>
                        </td>
                        <td className="col-num">
                          {d.productVersion} &rarr; {product ? product.currentVersion : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dash-panel panel-fill">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Products by client count</h2>
            <div className="dash-chip-row">
              <Link to="/products" className="dash-chip dash-chip-outline">
                All products
              </Link>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Latest version</th>
                  <th className="col-num">Clients</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={'/products/' + p.id}>{p.name}</Link>
                    </td>
                    <td className={p.lifecycleStatus === 'Deprecated' ? 'status status-bad' : 'status'}>
                      {p.lifecycleStatus}
                    </td>
                    <td>{p.currentVersion || '-'}</td>
                    <td className="col-num">
                      {deployments.filter((d) => d.productId === p.id).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-panel panel-fill">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Recently updated products</h2>
          </div>

          {recentProducts.length === 0 ? (
            <div className="empty">No products recorded yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={'/products/' + p.id}>{p.name}</Link>
                      </td>
                      <td
                        className={
                          p.lifecycleStatus === 'Deprecated' ? 'status status-bad' : 'status'
                        }
                      >
                        {p.lifecycleStatus}
                      </td>
                      <td className="muted">{updatedOn(p.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
