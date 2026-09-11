// Create or edit a product (an id in the URL means edit).
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { ProductLifecycle } from '../types';
import { getProduct, createProduct, updateProduct } from '../api';

export default function ProductForm() {
  const params = useParams();
  const navigate = useNavigate();
  const isEdit = params.id !== undefined;
  const productId = Number(params.id);

  const [name, setName] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState<ProductLifecycle>('Active');
  const [currentVersion, setCurrentVersion] = useState('');
  const [criticality, setCriticality] = useState('');
  const [supportedMarkets, setSupportedMarkets] = useState('');
  const [technologies, setTechnologies] = useState('');
  const [description, setDescription] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<Record<string, string>>({});

  async function load() {
    try {
      setLoading(true);
      setError('');
      const p = await getProduct(productId);
      setName(p.name);
      setLifecycleStatus(p.lifecycleStatus as ProductLifecycle);
      setCurrentVersion(p.currentVersion || '');
      setCriticality(p.criticality || '');
      setSupportedMarkets(p.supportedMarkets || '');
      setTechnologies(p.technologies || '');
      setDescription(p.description || '');
      setBusinessPurpose(p.businessPurpose || '');
      setNotes(p.notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this product.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isEdit) {
      load();
    }
  }, [productId]);

  function validate() {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = 'Name is required.';
    if (!lifecycleStatus) found.lifecycleStatus = 'Lifecycle status is required.';
    setProblems(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    const data = {
      name: name.trim(),
      lifecycleStatus,
      currentVersion: currentVersion.trim() || null,
      criticality: criticality.trim() || null,
      supportedMarkets: supportedMarkets.trim() || null,
      technologies: technologies.trim() || null,
      description: description.trim() || null,
      businessPurpose: businessPurpose.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await updateProduct(productId, data);
        navigate('/products/' + productId);
      } else {
        const created = await createProduct(data);
        navigate('/products/' + created.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading product...</div>;

  return (
    <>
      <p className="small">
        <Link to="/products">Products</Link>{' '}
        <span className="muted">/ {isEdit ? 'Edit' : 'New product'}</span>
      </p>

      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit product' : 'New product'}</h1>
          <p>Fields marked with * are required.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="name">Name *</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            {problems.name && <div className="error-text">{problems.name}</div>}
          </div>
          <div className="field">
            <label htmlFor="status">Lifecycle status *</label>
            <select
              id="status"
              value={lifecycleStatus}
              onChange={(e) => setLifecycleStatus(e.target.value as ProductLifecycle)}
            >
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Planned">Planned</option>
              <option value="Deprecated">Deprecated</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="version">Current version</label>
            <input
              id="version"
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
              placeholder="1.0.0"
            />
          </div>
          <div className="field">
            <label htmlFor="criticality">Criticality</label>
            <input
              id="criticality"
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
              placeholder="Low, Medium, High, Critical"
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="markets">Supported markets</label>
            <input
              id="markets"
              value={supportedMarkets}
              onChange={(e) => setSupportedMarkets(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="technologies">Technologies</label>
            <input
              id="technologies"
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="businessPurpose">Business purpose</label>
          <textarea
            id="businessPurpose"
            value={businessPurpose}
            onChange={(e) => setBusinessPurpose(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="notes">Internal notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          <Link
            to={isEdit ? '/products/' + productId : '/products'}
            className="btn"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
