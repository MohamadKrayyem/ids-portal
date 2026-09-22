// Create or edit an environment (an id in the URL means edit). The user picks a
// client and a product; the deployment linking the two is found for them.
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Client, Product, Deployment, Environment } from '../types';
import {
  getEnvironment,
  getEnvironments,
  getDeployments,
  getClients,
  getProducts,
  createEnvironment,
  updateEnvironment,
} from '../api';

const ENVIRONMENT_TYPE_ORDER = ['Development', 'Testing', 'UAT', 'Production'] as const;
const DEFAULT_ACCESS_REFERENCE = 'Ask the Infrastructure team';

export default function EnvironmentForm() {
  const params = useParams();
  const navigate = useNavigate();
  const isEdit = params.id !== undefined;
  const environmentId = Number(params.id);

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  const [clientId, setClientId] = useState('');
  const [productId, setProductId] = useState('');
  const [environmentType, setEnvironmentType] = useState('Development');
  const [name, setName] = useState('');
  // Once the user types their own name, stop filling it in for them.
  const [nameTouched, setNameTouched] = useState(false);
  const [serverName, setServerName] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [accessReference, setAccessReference] = useState(DEFAULT_ACCESS_REFERENCE);
  const [purpose, setPurpose] = useState('');
  const [operatingSystem, setOperatingSystem] = useState('');
  const [databaseInfo, setDatabaseInfo] = useState('');
  const [monitoringLink, setMonitoringLink] = useState('');
  const [notes, setNotes] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<Record<string, string>>({});

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [c, p, d, e] = await Promise.all([
        getClients(),
        getProducts(),
        getDeployments(),
        getEnvironments(),
      ]);
      setClients(c);
      setProducts(p);
      setDeployments(d);
      setEnvironments(e);

      if (isEdit) {
        const env = await getEnvironment(environmentId);
        const dep = d.find((x) => x.id === env.deploymentId);
        const cl = dep ? c.find((x) => x.id === dep.clientId) : undefined;
        const pr = dep ? p.find((x) => x.id === dep.productId) : undefined;
        setClientId(dep ? String(dep.clientId) : '');
        setProductId(dep ? String(dep.productId) : '');
        setEnvironmentType(env.environmentType || 'Development');
        setName(env.name);
        setNameTouched(
          env.name !== suggestName(cl, pr, env.environmentType || 'Development'),
        );
        setServerName(env.serverName || '');
        setApplicationUrl(env.applicationUrl || '');
        setAccessReference(env.accessReference || '');
        setPurpose(env.purpose || '');
        setOperatingSystem(env.operatingSystem || '');
        setDatabaseInfo(env.databaseInfo || '');
        setMonitoringLink(env.monitoringLink || '');
        setNotes(env.notes || '');
        // Show "More details" when it already holds data, so nothing is hidden.
        setMoreOpen(
          [env.purpose, env.operatingSystem, env.databaseInfo, env.monitoringLink, env.notes]
            .some((v) => !!v && v.trim() !== ''),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this environment.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [environmentId]);

  const client = clients.find((c) => String(c.id) === clientId);
  const product = products.find((p) => String(p.id) === productId);

  // Only products this client already has a deployment for.
  const clientDeployments = deployments.filter((d) => String(d.clientId) === clientId);
  const clientProducts = products.filter((p) =>
    clientDeployments.some((d) => d.productId === p.id),
  );
  const deployment = clientDeployments.find((d) => String(d.productId) === productId);

  // Types this client already has for this product, ignoring the one being edited.
  const usedTypes = new Set(
    environments
      .filter((e) => deployment && e.deploymentId === deployment.id)
      .filter((e) => !isEdit || e.id !== environmentId)
      .map((e) => e.environmentType)
      .filter(Boolean),
  );

  // Keep the suggested name in step with the choices until the user edits it.
  useEffect(() => {
    if (!nameTouched) setName(suggestName(client, product, environmentType));
  }, [clientId, productId, environmentType, clients, products]);

  function changeClient(value: string) {
    setClientId(value);
    const available = deployments.filter((d) => String(d.clientId) === value);
    // A client with a single product gets it picked automatically.
    const next =
      available.length === 1
        ? String(available[0].productId)
        : available.some((d) => String(d.productId) === productId)
          ? productId
          : '';
    changeProduct(value, next);
  }

  function changeProduct(forClientId: string, value: string) {
    setProductId(value);
    // On a new environment, move off a type this pair already has.
    if (isEdit) return;
    const dep = deployments.find(
      (d) => String(d.clientId) === forClientId && String(d.productId) === value,
    );
    if (!dep) return;
    const taken = new Set(
      environments.filter((e) => e.deploymentId === dep.id).map((e) => e.environmentType),
    );
    if (taken.has(environmentType)) {
      const free = ENVIRONMENT_TYPE_ORDER.find((t) => !taken.has(t));
      if (free) setEnvironmentType(free);
    }
  }

  function validate() {
    const found: Record<string, string> = {};
    if (!clientId) found.clientId = 'Choose a client.';
    if (!productId) found.productId = 'Choose a product.';
    else if (!deployment) found.productId = 'This client does not use that product.';
    if (!environmentType) found.environmentType = 'Choose a type.';
    else if (usedTypes.has(environmentType))
      found.environmentType =
        'This client already has a ' + environmentType + ' environment for this product.';
    if (!name.trim()) found.name = 'Name is required.';
    else if (name.trim().length > 100) found.name = 'Name must be 100 characters or fewer.';
    setProblems(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate() || !deployment) return;

    const data = {
      deploymentId: deployment.id,
      name: name.trim(),
      environmentType,
      purpose: purpose.trim() || null,
      serverName: serverName.trim() || null,
      operatingSystem: operatingSystem.trim() || null,
      applicationUrl: applicationUrl.trim() || null,
      databaseInfo: databaseInfo.trim() || null,
      monitoringLink: monitoringLink.trim() || null,
      accessReference: accessReference.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await updateEnvironment(environmentId, data);
      } else {
        await createEnvironment(data);
      }
      navigate('/environments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the environment.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading environment...</div>;

  return (
    <>
      <p className="small">
        <Link to="/environments">Environments</Link>{' '}
        <span className="muted">/ {isEdit ? 'Edit' : 'New environment'}</span>
      </p>

      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit environment' : 'New environment'}</h1>
          <p>
            An environment is one running copy of a product at a client. Fields marked
            with * are required.
          </p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="clientId">Client *</label>
            <select
              id="clientId"
              value={clientId}
              onChange={(e) => changeClient(e.target.value)}
              aria-describedby="clientIdHelp"
            >
              <option value="">Choose a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
            <div id="clientIdHelp" className="field-help">
              Which company is this for?
            </div>
            {problems.clientId && <div className="error-text">{problems.clientId}</div>}
          </div>
          <div className="field">
            <label htmlFor="productId">Product *</label>
            {clientId && clientProducts.length === 0 ? (
              <div className="field-help">
                This client has no products yet.{' '}
                <Link to="/deployments">Add a deployment first.</Link>
              </div>
            ) : (
              <>
                <select
                  id="productId"
                  value={productId}
                  onChange={(e) => changeProduct(clientId, e.target.value)}
                  disabled={!clientId}
                  aria-describedby="productIdHelp"
                >
                  <option value="">
                    {clientId ? 'Choose a product' : 'Choose a client first'}
                  </option>
                  {clientProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div id="productIdHelp" className="field-help">
                  Which system is installed?
                </div>
              </>
            )}
            {problems.productId && <div className="error-text">{problems.productId}</div>}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="environmentType">Type *</label>
            <select
              id="environmentType"
              value={environmentType}
              onChange={(e) => setEnvironmentType(e.target.value)}
              aria-describedby="environmentTypeHelp"
            >
              {ENVIRONMENT_TYPE_ORDER.map((t) => (
                <option key={t} value={t} disabled={usedTypes.has(t)}>
                  {usedTypes.has(t) ? t + ' (already added)' : t}
                </option>
              ))}
            </select>
            <div id="environmentTypeHelp" className="field-help">
              Development and Testing are for us. UAT is where the client tests.
              Production is the live system.
            </div>
            {problems.environmentType && (
              <div className="error-text">{problems.environmentType}</div>
            )}
          </div>
          <div className="field">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Clearing the box hands it back to the auto-fill.
                setNameTouched(e.target.value.trim() !== '');
              }}
              aria-describedby="nameHelp"
            />
            <div id="nameHelp" className="field-help">
              Filled in for you. You can change it.
            </div>
            {problems.name && <div className="error-text">{problems.name}</div>}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="serverName">Server name</label>
            <input
              id="serverName"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              aria-describedby="serverNameHelp"
            />
            <div id="serverNameHelp" className="field-help">
              Which computer it runs on
            </div>
          </div>
          <div className="field">
            <label htmlFor="applicationUrl">Application URL</label>
            <input
              id="applicationUrl"
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              aria-describedby="applicationUrlHelp"
            />
            <div id="applicationUrlHelp" className="field-help">
              The web address to open it
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="accessReference">Access reference</label>
          <input
            id="accessReference"
            value={accessReference}
            onChange={(e) => setAccessReference(e.target.value)}
            aria-describedby="accessReferenceHelp"
          />
          <div id="accessReferenceHelp" className="field-help">
            Where to request access. Never write a password here.
          </div>
        </div>

        <button
          type="button"
          className="more-toggle"
          aria-expanded={moreOpen}
          aria-controls="moreDetails"
          onClick={() => setMoreOpen(!moreOpen)}
        >
          {moreOpen ? '▾' : '▸'} More details
        </button>

        {moreOpen && (
          <div id="moreDetails" className="more-details">
            <div className="field-row">
              <div className="field">
                <label htmlFor="purpose">Purpose</label>
                <input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  aria-describedby="purposeHelp"
                />
                <div id="purposeHelp" className="field-help">
                  What this copy is used for
                </div>
              </div>
              <div className="field">
                <label htmlFor="operatingSystem">Operating system</label>
                <input
                  id="operatingSystem"
                  value={operatingSystem}
                  onChange={(e) => setOperatingSystem(e.target.value)}
                  aria-describedby="operatingSystemHelp"
                />
                <div id="operatingSystemHelp" className="field-help">
                  For example Windows Server 2022
                </div>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="databaseInfo">Database information</label>
                <input
                  id="databaseInfo"
                  value={databaseInfo}
                  onChange={(e) => setDatabaseInfo(e.target.value)}
                  aria-describedby="databaseInfoHelp"
                />
                <div id="databaseInfoHelp" className="field-help">
                  Database server and name. Never a password.
                </div>
              </div>
              <div className="field">
                <label htmlFor="monitoringLink">Monitoring link</label>
                <input
                  id="monitoringLink"
                  value={monitoringLink}
                  onChange={(e) => setMonitoringLink(e.target.value)}
                  aria-describedby="monitoringLinkHelp"
                />
                <div id="monitoringLinkHelp" className="field-help">
                  Where to check that it is healthy
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                aria-describedby="notesHelp"
              />
              <div id="notesHelp" className="field-help">
                Anything else worth knowing
              </div>
            </div>
          </div>
        )}

        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create environment'}
          </button>
          <Link to="/environments" className="btn">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

// "<Client> - <Product> - <Type>", once both client and product are chosen.
function suggestName(client: Client | undefined, product: Product | undefined, type: string) {
  if (!client || !product) return '';
  return [client.companyName, product.name, type].join(' - ');
}
