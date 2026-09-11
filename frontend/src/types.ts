// The data shapes the portal uses, mirroring the JSON the API returns.
export type Role = 'Admin' | 'Editor' | 'Viewer';

export type ProductLifecycle = 'Active' | 'Maintenance' | 'Planned' | 'Deprecated';

export type ClientStatus = 'Active' | 'Prospect' | 'Former';

export type DeploymentStatus = 'Live' | 'Pilot' | 'Suspended';

export type EnvironmentType = 'Development' | 'Testing' | 'UAT' | 'Production';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  businessPurpose: string | null;
  lifecycleStatus: string;
  currentVersion: string | null;
  supportedMarkets: string | null;
  criticality: string | null;
  technologies: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: number;
  productId: number;
  name: string;
  description: string | null;
  status: string | null;
}

export interface Client {
  id: number;
  companyName: string;
  country: string | null;
  contactInfo: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Deployment {
  id: number;
  clientId: number;
  productId: number;
  productVersion: string | null;
  enabledModules: string | null;
  goLiveDate: string | null;
  status: string | null;
  supportTier: string | null;
  notes: string | null;
}

export interface Environment {
  id: number;
  deploymentId: number;
  name: string;
  environmentType: string | null;
  purpose: string | null;
  serverName: string | null;
  operatingSystem: string | null;
  applicationUrl: string | null;
  databaseInfo: string | null;
  monitoringLink: string | null;
  accessReference: string | null;
  notes: string | null;
}

export interface TeamMember {
  id: number;
  fullName: string;
  jobTitle: string | null;
  department: string | null;
  email: string | null;
  status: string | null;
}

export interface ProductResponsibility {
  id: number;
  productId: number;
  teamMemberId: number;
  responsibility: string;
  description: string | null;
}

export interface ClientTeamMember {
  id: number;
  fullName: string;
  jobTitle: string | null;
  responsibility: string;
}

export interface Repository {
  id: number;
  productId: number;
  name: string;
  githubUrl: string | null;
  mainBranch: string | null;
  description: string | null;
}

export interface DocumentLink {
  id: number;
  productId: number;
  name: string;
  documentType: string | null;
  url: string | null;
  description: string | null;
  lastUpdated: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type ClientInput = Omit<Client, 'id' | 'createdAt'>;
export type TeamMemberInput = Omit<TeamMember, 'id'>;
export type DeploymentInput = Omit<Deployment, 'id'>;
export type EnvironmentInput = Omit<Environment, 'id'>;
export type ModuleInput = Omit<Module, 'id'>;
export type RepositoryInput = Omit<Repository, 'id'>;
export type DocumentInput = Omit<DocumentLink, 'id'>;
export type ResponsibilityInput = Omit<ProductResponsibility, 'id'>;

export interface RecentProduct {
  id: number;
  name: string;
  lifecycleStatus: string;
  updatedAt: string;
}

export interface DashboardStats {
  products: number;
  activeProducts: number;
  clients: number;
  activeClients: number;
  deployments: number;
  liveDeployments: number;
  environments: number;
  productionEnvironments: number;
  teamMembers: number;

  recentProducts: RecentProduct[];
}
