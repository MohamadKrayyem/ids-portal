// ---------------------------------------------------------------------------
// types.ts
// Every data shape used in the portal. These now mirror the REAL SQL Server
// tables and the JSON the .NET API returns (camelCase), so what you see here is
// exactly what the backend sends and accepts.
//
// Dates are plain strings (JSON has no date type). A field typed "string | null"
// mirrors a database column that is allowed to be empty (NULL).
// ---------------------------------------------------------------------------

// ----------------------------- small choices -------------------------------
// The value must be one of the listed words. Used to drive dropdowns.

export type Role = 'Admin' | 'Editor' | 'Viewer';

export type ProductLifecycle = 'Active' | 'Maintenance' | 'Planned' | 'Deprecated';

export type ClientStatus = 'Active' | 'Prospect' | 'Former';

export type DeploymentStatus = 'Live' | 'Pilot' | 'Suspended';

export type EnvironmentType = 'Development' | 'Testing' | 'UAT' | 'Production';

// -------------------------------- User -------------------------------------
// A login account for the portal. No password field ever reaches the browser.

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

// ------------------------------- Product -----------------------------------

export interface Product {
  id: number;
  name: string;
  description: string | null;
  businessPurpose: string | null;
  lifecycleStatus: string; // one of ProductLifecycle
  currentVersion: string | null;
  supportedMarkets: string | null;
  criticality: string | null;
  technologies: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------- Module ------------------------------------

export interface Module {
  id: number;
  productId: number;
  name: string;
  description: string | null;
  status: string | null;
}

// ------------------------------- Client ------------------------------------

export interface Client {
  id: number;
  companyName: string;
  country: string | null;
  contactInfo: string | null; // free text: name / email / phone together
  status: string | null; // one of ClientStatus
  notes: string | null;
  createdAt: string;
}

// ----------------------------- Deployment ----------------------------------
// Links ONE client to ONE product.

export interface Deployment {
  id: number;
  clientId: number;
  productId: number;
  productVersion: string | null;
  enabledModules: string | null;
  goLiveDate: string | null;
  status: string | null; // one of DeploymentStatus
  supportTier: string | null;
  notes: string | null;
}

// ----------------------------- Environment ---------------------------------
// A running copy of a deployment. SECURITY: never a password, key or token -
// accessReference is only a pointer to where access is requested.

export interface Environment {
  id: number;
  deploymentId: number;
  name: string;
  environmentType: string | null; // one of EnvironmentType
  purpose: string | null;
  serverName: string | null;
  operatingSystem: string | null;
  applicationUrl: string | null;
  databaseInfo: string | null;
  monitoringLink: string | null;
  accessReference: string | null;
  notes: string | null;
}

// ------------------------------ TeamMember ---------------------------------

export interface TeamMember {
  id: number;
  fullName: string;
  jobTitle: string | null;
  department: string | null;
  email: string | null;
  status: string | null;
}

// ------------------------- ProductResponsibility ----------------------------
// Links a Product to a TeamMember and says what they do on it.

export interface ProductResponsibility {
  id: number;
  productId: number;
  teamMemberId: number;
  responsibility: string;
  description: string | null;
}

// ----------------------------- Repository ----------------------------------

export interface Repository {
  id: number;
  productId: number;
  name: string;
  githubUrl: string | null;
  mainBranch: string | null;
  description: string | null;
}

// ---------------------------- DocumentLink ----------------------------------
// Maps to the Documents table. We store the link, not the file.

export interface DocumentLink {
  id: number;
  productId: number;
  name: string;
  documentType: string | null;
  url: string | null;
  description: string | null;
  lastUpdated: string | null;
}

// -------------------------------- Auth --------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Admin-only: the body for creating a new login account.
export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}

// ------------------------------ Input shapes --------------------------------
// What the create/update forms send. The server owns id and the timestamps,
// so those are left out here.

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type ClientInput = Omit<Client, 'id' | 'createdAt'>;

// ----------------------------- Dashboard -------------------------------------
// Matches the shape returned by GET /api/dashboard.

export interface DashboardStats {
  products: number;
  activeProducts: number;
  clients: number;
  activeClients: number;
  deployments: number;
  liveDeployments: number;
  environments: number;
  productionEnvironments: number;
}
