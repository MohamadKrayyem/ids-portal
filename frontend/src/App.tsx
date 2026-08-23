// ---------------------------------------------------------------------------
// App.tsx
// The shell of the portal: the top bar, the navigation links, and the list of
// routes (which URL shows which page). It holds no data of its own.
// ---------------------------------------------------------------------------

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

// AuthProvider must wrap everything, because every page may ask "who is
// logged in?". BrowserRouter must wrap everything that uses a URL.
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

  // Not signed in? Then the login screen is the only thing that exists.
  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          IDS <span>Portal</span>
        </div>

        {/* NavLink is like a normal link, but it knows when it is the page
            you are currently on, and adds the class "active" to itself. */}
        <nav className="nav">
          <div className="nav-group nav-group-overview">
            <div className="nav-group-label">Overview</div>
            {/* "end" means: only highlight this link on the exact path "/",
                otherwise it would stay highlighted on every page. */}
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
            {/* Only Admins are shown the user management link */}
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
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* "new" must come before ":id", otherwise the router would read
                the word "new" as an id. */}
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

            {/* Admin-only page. A Viewer who types the URL by hand is sent home. */}
            <Route
              path="/users"
              element={isAdmin ? <Users /> : <Navigate to="/" replace />}
            />

            {/* Anything else: back to the dashboard. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
