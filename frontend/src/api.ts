// ---------------------------------------------------------------------------
// api.ts
// Every call to the backend lives in this one file. Pages never use fetch
// directly - they only call the functions below.
//
// This now talks to the REAL .NET API. There is no more mock data. Each
// function throws an Error when something goes wrong; pages catch it and show
// the message to the user.
// ---------------------------------------------------------------------------

import type {
  User,
  Product,
  Module,
  Client,
  Deployment,
  Environment,
  TeamMember,
  ProductResponsibility,
  Repository,
  DocumentLink,
  LoginResponse,
  ProductInput,
  ClientInput,
  CreateUserRequest,
  DashboardStats,
} from './types';

// ------------------------------- settings -----------------------------------

// Where the backend lives. Must match the "Urls" value in the backend's
// appsettings.json, plus "/api".
const BASE_URL = 'http://localhost:5000/api';

// The JWT. auth.tsx owns it and hands it to us with setAuthToken().
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// --------------------------- the one real caller -----------------------------
// Every HTTP request goes through here, so the JWT header and the error
// handling are written once instead of in twenty places.

async function request<T>(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // "Bearer <token>" is the standard way to send a JWT.
  if (authToken) {
    headers.Authorization = 'Bearer ' + authToken;
  }

  let response: Response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects when the network/server is unreachable.
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  // 204 means "done, nothing to send back" - used by delete.
  if (response.status === 204) {
    return undefined as T;
  }

  // Read the body once, as text, then try to turn it into JSON. The server
  // sends errors as { "message": "..." }, which we surface to the user.
  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        messageOf(data) || 'Your session has expired. Please sign in again.'
      );
    }
    if (response.status === 403) {
      throw new Error(messageOf(data) || 'You do not have permission to do that.');
    }
    throw new Error(
      messageOf(data) || 'The server returned an error (' + response.status + ').'
    );
  }

  return data as T;
}

// Turn text into JSON without throwing if the body is not JSON.
function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Pull the "message" field out of an error body, if there is one.
function messageOf(data: unknown): string | null {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message?: unknown }).message;
    return typeof m === 'string' ? m : null;
  }
  return null;
}

// --------------------------------- auth --------------------------------------

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', 'POST', { email, password });
}

// -------------------------------- products -----------------------------------

export async function getProducts(): Promise<Product[]> {
  return request<Product[]>('/products');
}

export async function getProduct(id: number): Promise<Product> {
  return request<Product>('/products/' + id);
}

export async function createProduct(data: ProductInput): Promise<Product> {
  return request<Product>('/products', 'POST', data);
}

export async function updateProduct(id: number, data: ProductInput): Promise<Product> {
  return request<Product>('/products/' + id, 'PUT', data);
}

export async function deleteProduct(id: number): Promise<void> {
  return request<void>('/products/' + id, 'DELETE');
}

// -------------------------------- clients ------------------------------------

export async function getClients(): Promise<Client[]> {
  return request<Client[]>('/clients');
}

export async function getClient(id: number): Promise<Client> {
  return request<Client>('/clients/' + id);
}

export async function createClient(data: ClientInput): Promise<Client> {
  return request<Client>('/clients', 'POST', data);
}

export async function updateClient(id: number, data: ClientInput): Promise<Client> {
  return request<Client>('/clients/' + id, 'PUT', data);
}

export async function deleteClient(id: number): Promise<void> {
  return request<void>('/clients/' + id, 'DELETE');
}

// ---------------------- lists the detail pages load --------------------------
// Pages load the whole list and filter it in the browser.

export async function getModules(): Promise<Module[]> {
  return request<Module[]>('/modules');
}

export async function getDeployments(): Promise<Deployment[]> {
  return request<Deployment[]>('/deployments');
}

export async function getEnvironments(): Promise<Environment[]> {
  return request<Environment[]>('/environments');
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  return request<TeamMember[]>('/teammembers');
}

export async function getProductResponsibilities(): Promise<ProductResponsibility[]> {
  return request<ProductResponsibility[]>('/responsibilities');
}

export async function getRepositories(): Promise<Repository[]> {
  return request<Repository[]>('/repositories');
}

export async function getDocumentLinks(): Promise<DocumentLink[]> {
  return request<DocumentLink[]>('/documents');
}

// --------------------------------- users --------------------------------------
// Admin only. The server enforces that too - hiding buttons is not security.

export async function getUsers(): Promise<User[]> {
  return request<User[]>('/users');
}

export async function createUser(data: CreateUserRequest): Promise<User> {
  return request<User>('/users', 'POST', data);
}

export async function updateUser(id: number, data: Omit<User, 'id'>): Promise<User> {
  return request<User>('/users/' + id, 'PUT', data);
}

export async function deleteUser(id: number): Promise<void> {
  return request<void>('/users/' + id, 'DELETE');
}

// -------------------------------- dashboard -----------------------------------

export async function getDashboard(): Promise<DashboardStats> {
  return request<DashboardStats>('/dashboard');
}
