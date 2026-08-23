CREATE DATABASE IdsPortal;
GO
USE IdsPortal;
GO

-- ── Users: login accounts for the portal ──
CREATE TABLE Users (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    FullName     NVARCHAR(120)  NOT NULL,
    Email        NVARCHAR(160)  NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255)  NOT NULL,   -- never the password itself
    Role         NVARCHAR(20)   NOT NULL,   -- Admin | Editor | Viewer
    IsActive     BIT            NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);

-- ── Products ──
CREATE TABLE Products (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    Name             NVARCHAR(150)  NOT NULL,
    Description      NVARCHAR(1000) NULL,
    BusinessPurpose  NVARCHAR(1000) NULL,
    LifecycleStatus  NVARCHAR(30)   NOT NULL,  -- Active | Maintenance | Planned | Deprecated
    CurrentVersion   NVARCHAR(40)   NULL,
    SupportedMarkets NVARCHAR(300)  NULL,
    Criticality      NVARCHAR(30)   NULL,
    Technologies     NVARCHAR(400)  NULL,
    Notes            NVARCHAR(1000) NULL,
    CreatedAt        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);

-- ── Modules: belong to a product ──
CREATE TABLE Modules (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    ProductId   INT            NOT NULL,
    Name        NVARCHAR(150)  NOT NULL,
    Description NVARCHAR(1000) NULL,
    Status      NVARCHAR(30)   NULL,
    CONSTRAINT FK_Modules_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE
);

-- ── Clients ──
CREATE TABLE Clients (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    CompanyName NVARCHAR(200)  NOT NULL,
    Country     NVARCHAR(100)  NULL,
    ContactInfo NVARCHAR(300)  NULL,
    Status      NVARCHAR(30)   NULL,
    Notes       NVARCHAR(1000) NULL,
    CreatedAt   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);

-- ── Deployments: the bridge between a Client and a Product ──
-- One row = "this client runs this product at this version"
CREATE TABLE Deployments (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    ClientId       INT            NOT NULL,
    ProductId      INT            NOT NULL,
    ProductVersion NVARCHAR(40)   NULL,
    EnabledModules NVARCHAR(500)  NULL,
    GoLiveDate     DATE           NULL,
    Status         NVARCHAR(30)   NULL,
    SupportTier    NVARCHAR(30)   NULL,
    Notes          NVARCHAR(1000) NULL,
    CONSTRAINT FK_Deployments_Clients  FOREIGN KEY (ClientId)
        REFERENCES Clients(Id)  ON DELETE CASCADE,
    CONSTRAINT FK_Deployments_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id)
);

-- ── Environments: belong to a deployment ──
-- NOTE: no passwords, no keys, no tokens. AccessReference is only a
-- pointer to where access is requested.
CREATE TABLE Environments (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    DeploymentId       INT            NOT NULL,
    Name               NVARCHAR(100)  NOT NULL,
    EnvironmentType    NVARCHAR(40)   NULL,   -- Development | Testing | UAT | Production
    Purpose            NVARCHAR(300)  NULL,
    ServerName         NVARCHAR(150)  NULL,
    OperatingSystem    NVARCHAR(100)  NULL,
    ApplicationUrl     NVARCHAR(300)  NULL,
    DatabaseInfo       NVARCHAR(300)  NULL,
    MonitoringLink     NVARCHAR(300)  NULL,
    AccessReference    NVARCHAR(300)  NULL,
    Notes              NVARCHAR(1000) NULL,
    CONSTRAINT FK_Environments_Deployments FOREIGN KEY (DeploymentId)
        REFERENCES Deployments(Id) ON DELETE CASCADE
);

-- ── Team members: staff involved with products ──
CREATE TABLE TeamMembers (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    FullName   NVARCHAR(120) NOT NULL,
    JobTitle   NVARCHAR(120) NULL,
    Department NVARCHAR(120) NULL,
    Email      NVARCHAR(160) NULL,
    Status     NVARCHAR(30)  NULL
);

-- ── Product responsibilities: links a team member to a product ──
CREATE TABLE ProductResponsibilities (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    ProductId      INT            NOT NULL,
    TeamMemberId   INT            NOT NULL,
    Responsibility NVARCHAR(120)  NOT NULL,
    Description    NVARCHAR(500)  NULL,
    CONSTRAINT FK_Resp_Products    FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Resp_TeamMembers FOREIGN KEY (TeamMemberId)
        REFERENCES TeamMembers(Id) ON DELETE CASCADE
);

-- ── Repositories: code repos per product ──
CREATE TABLE Repositories (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    ProductId   INT            NOT NULL,
    Name        NVARCHAR(150)  NOT NULL,
    GithubUrl   NVARCHAR(300)  NULL,
    MainBranch  NVARCHAR(80)   NULL,
    Description NVARCHAR(500)  NULL,
    CONSTRAINT FK_Repos_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE
);

-- ── Documents: doc links per product ──
CREATE TABLE Documents (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    ProductId    INT            NOT NULL,
    Name         NVARCHAR(200)  NOT NULL,
    DocumentType NVARCHAR(80)   NULL,
    Description  NVARCHAR(500)  NULL,
    Url          NVARCHAR(400)  NULL,
    LastUpdated  DATE           NULL,
    CONSTRAINT FK_Docs_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE
);
GO

-- ── Indexes for the searches the portal does most ──
CREATE INDEX IX_Products_Name       ON Products(Name);
CREATE INDEX IX_Clients_CompanyName ON Clients(CompanyName);
CREATE INDEX IX_Deployments_Client  ON Deployments(ClientId);
CREATE INDEX IX_Deployments_Product ON Deployments(ProductId);
GO