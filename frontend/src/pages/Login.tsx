// Login page, shown whenever nobody is signed in.
import { useState } from 'react';
import { useAuth } from '../auth';

export default function Login() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setBusy(true);
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={handleSubmit}>
        <h1>
          IDS <span style={{ color: 'var(--accent)' }}>Fintech</span>
        </h1>
        <p className="muted small" style={{ marginBottom: 24 }}>
          Internal product directory. Staff only.
        </p>

        {error && <div className="error-box">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@idsfintech.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
