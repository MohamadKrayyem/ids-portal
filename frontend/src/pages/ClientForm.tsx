// Create or edit a client (an id in the URL means edit).
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { ClientStatus } from '../types';
import { getClient, createClient, updateClient } from '../api';

export default function ClientForm() {
  const params = useParams();
  const navigate = useNavigate();
  const isEdit = params.id !== undefined;
  const clientId = Number(params.id);

  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [status, setStatus] = useState<ClientStatus>('Active');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<Record<string, string>>({});

  async function load() {
    try {
      setLoading(true);
      setError('');
      const c = await getClient(clientId);
      setCompanyName(c.companyName);
      setCountry(c.country || '');
      setContactInfo(c.contactInfo || '');
      setStatus((c.status as ClientStatus) || 'Active');
      setNotes(c.notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this client.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isEdit) {
      load();
    }
  }, [clientId]);

  function validate() {
    const found: Record<string, string> = {};
    if (!companyName.trim()) found.companyName = 'Company name is required.';
    setProblems(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    const data = {
      companyName: companyName.trim(),
      country: country.trim() || null,
      contactInfo: contactInfo.trim() || null,
      status,
      notes: notes.trim() || null,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await updateClient(clientId, data);
        navigate('/clients/' + clientId);
      } else {
        const created = await createClient(data);
        navigate('/clients/' + created.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the client.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading client...</div>;

  return (
    <>
      <p className="small">
        <Link to="/clients">Clients</Link>{' '}
        <span className="muted">/ {isEdit ? 'Edit' : 'New client'}</span>
      </p>

      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit client' : 'New client'}</h1>
          <p>Fields marked with * are required.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="companyName">Company name *</label>
            <input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            {problems.companyName && (
              <div className="error-text">{problems.companyName}</div>
            )}
          </div>
          <div className="field">
            <label htmlFor="country">Country</label>
            <input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
            >
              <option value="Active">Active</option>
              <option value="Prospect">Prospect</option>
              <option value="Former">Former</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="contactInfo">Contact info</label>
            <input
              id="contactInfo"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Name, email, phone"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Internal notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create client'}
          </button>
          <Link to={isEdit ? '/clients/' + clientId : '/clients'} className="btn">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
