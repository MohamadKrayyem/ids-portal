// The app shell: top bar, navigation links and the routes.
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import ProductForm from './pages/ProductForm';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import ClientForm from './pages/ClientForm';
import Deployments from './pages/Deployments';
import TeamMembers from './pages/TeamMembers';
import Users from './pages/Users';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Portal />
      </BrowserRouter>
    </AuthProvider>
  );
}

function Portal() {
  const { currentUser, logout, isAdmin } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          IDS <span>Fintech</span>
        </div>

        <nav className="nav">
          <div className="nav-group nav-group-overview">
            <div className="nav-group-label">Overview</div>

            <NavLink to="/" end>Dashboard</NavLink>
          </div>

          <div className="nav-group nav-group-catalogue">
            <div className="nav-group-label">Catalogue</div>
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/clients">Clients</NavLink>
            <NavLink to="/deployments">Deployments</NavLink>
          </div>

          <div className="nav-group nav-group-organisation">
            <div className="nav-group-label">Organisation</div>
            <NavLink to="/team">Team</NavLink>

            {isAdmin && <NavLink to="/users">Users</NavLink>}
          </div>
        </nav>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="who">
            <span>
              {currentUser.fullName} &middot; {currentUser.role}
            </span>
            <button className="btn btn-small" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        <main className="main">

          <div className="page">
            <Routes>
              <Route path="/" element={<Dashboard />} />

              <Route path="/products" element={<Products />} />
              <Route path="/products/new" element={<ProductForm />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/products/:id/edit" element={<ProductForm />} />

              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/new" element={<ClientForm />} />
              <Route path="/clients/:id" element={<ClientDetails />} />
              <Route path="/clients/:id/edit" element={<ClientForm />} />

              <Route path="/deployments" element={<Deployments />} />
              <Route path="/team" element={<TeamMembers />} />

              <Route
                path="/users"
                element={isAdmin ? <Users /> : <Navigate to="/" replace />}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
