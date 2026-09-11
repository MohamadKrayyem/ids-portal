// Every call to the backend API, with the JWT header and error handling in one place.
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
  ClientTeamMember,
  LoginResponse,
  ProductInput,
  ClientInput,
  TeamMemberInput,
  DeploymentInput,
  EnvironmentInput,
  ModuleInput,
  RepositoryInput,
  DocumentInput,
  ResponsibilityInput,
  CreateUserRequest,
  DashboardStats,
} from './types';

const BASE_URL = 'http://localhost:5000/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

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
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  if (response.status === 204) {
    return undefined as T;
  }

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

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function messageOf(data: unknown): string | null {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message?: unknown }).message;
    return typeof m === 'string' ? m : null;
  }
  return null;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', 'POST', { email, password });
}

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

export async function getClientTeam(id: number): Promise<ClientTeamMember[]> {
  return request<ClientTeamMember[]>('/clients/' + id + '/team');
}

export async function getModules(): Promise<Module[]> {
  return request<Module[]>('/modules');
}

export async function createModule(data: ModuleInput): Promise<Module> {
  return request<Module>('/modules', 'POST', data);
}

export async function updateModule(id: number, data: ModuleInput): Promise<Module> {
  return request<Module>('/modules/' + id, 'PUT', data);
}

export async function deleteModule(id: number): Promise<void> {
  return request<void>('/modules/' + id, 'DELETE');
}

export async function getDeployments(): Promise<Deployment[]> {
  return request<Deployment[]>('/deployments');
}

export async function createDeployment(data: DeploymentInput): Promise<Deployment> {
  return request<Deployment>('/deployments', 'POST', data);
}

export async function updateDeployment(
  id: number,
  data: DeploymentInput
): Promise<Deployment> {
  return request<Deployment>('/deployments/' + id, 'PUT', data);
}

export async function deleteDeployment(id: number): Promise<void> {
  return request<void>('/deployments/' + id, 'DELETE');
}

export async function getEnvironments(): Promise<Environment[]> {
  return request<Environment[]>('/environments');
}

export async function createEnvironment(data: EnvironmentInput): Promise<Environment> {
  return request<Environment>('/environments', 'POST', data);
}

export async function updateEnvironment(
  id: number,
  data: EnvironmentInput
): Promise<Environment> {
  return request<Environment>('/environments/' + id, 'PUT', data);
}

export async function deleteEnvironment(id: number): Promise<void> {
  return request<void>('/environments/' + id, 'DELETE');
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  return request<TeamMember[]>('/teammembers');
}

export async function createTeamMember(data: TeamMemberInput): Promise<TeamMember> {
  return request<TeamMember>('/teammembers', 'POST', data);
}

export async function updateTeamMember(
  id: number,
  data: TeamMemberInput
): Promise<TeamMember> {
  return request<TeamMember>('/teammembers/' + id, 'PUT', data);
}

export async function deleteTeamMember(id: number): Promise<void> {
  return request<void>('/teammembers/' + id, 'DELETE');
}

export async function getProductResponsibilities(): Promise<ProductResponsibility[]> {
  return request<ProductResponsibility[]>('/responsibilities');
}

export async function createResponsibility(
  data: ResponsibilityInput
): Promise<ProductResponsibility> {
  return request<ProductResponsibility>('/responsibilities', 'POST', data);
}

export async function deleteResponsibility(id: number): Promise<void> {
  return request<void>('/responsibilities/' + id, 'DELETE');
}

export async function getRepositories(): Promise<Repository[]> {
  return request<Repository[]>('/repositories');
}

export async function createRepository(data: RepositoryInput): Promise<Repository> {
  return request<Repository>('/repositories', 'POST', data);
}

export async function updateRepository(
  id: number,
  data: RepositoryInput
): Promise<Repository> {
  return request<Repository>('/repositories/' + id, 'PUT', data);
}

export async function deleteRepository(id: number): Promise<void> {
  return request<void>('/repositories/' + id, 'DELETE');
}

export async function getDocumentLinks(): Promise<DocumentLink[]> {
  return request<DocumentLink[]>('/documents');
}

export async function createDocumentLink(data: DocumentInput): Promise<DocumentLink> {
  return request<DocumentLink>('/documents', 'POST', data);
}

export async function updateDocumentLink(
  id: number,
  data: DocumentInput
): Promise<DocumentLink> {
  return request<DocumentLink>('/documents/' + id, 'PUT', data);
}

export async function deleteDocumentLink(id: number): Promise<void> {
  return request<void>('/documents/' + id, 'DELETE');
}

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

export async function getDashboard(): Promise<DashboardStats> {
  return request<DashboardStats>('/dashboard');
}
