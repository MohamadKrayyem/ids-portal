-- Full SQL Server schema for the IDS Portal database: tables, keys and indexes.

CREATE DATABASE IdsPortal;
GO
USE IdsPortal;
GO

CREATE TABLE Users (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    FullName     NVARCHAR(120)  NOT NULL,
    Email        NVARCHAR(160)  NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255)  NOT NULL,
    Role         NVARCHAR(20)   NOT NULL,
    IsActive     BIT            NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Products (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    Name             NVARCHAR(150)  NOT NULL,
    Description      NVARCHAR(1000) NULL,
    BusinessPurpose  NVARCHAR(1000) NULL,
    LifecycleStatus  NVARCHAR(30)   NOT NULL,
    CurrentVersion   NVARCHAR(40)   NULL,
    SupportedMarkets NVARCHAR(300)  NULL,
    Criticality      NVARCHAR(30)   NULL,
    Technologies     NVARCHAR(400)  NULL,
    Notes            NVARCHAR(1000) NULL,
    CreatedAt        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Modules (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    ProductId   INT            NOT NULL,
    Name        NVARCHAR(150)  NOT NULL,
    Description NVARCHAR(1000) NULL,
    Status      NVARCHAR(30)   NULL,
    CONSTRAINT FK_Modules_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE
);

CREATE TABLE Clients (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    CompanyName NVARCHAR(200)  NOT NULL,
    Country     NVARCHAR(100)  NULL,
    ContactInfo NVARCHAR(300)  NULL,
    Status      NVARCHAR(30)   NULL,
    Notes       NVARCHAR(1000) NULL,
    CreatedAt   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);

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

CREATE TABLE Environments (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    DeploymentId       INT            NOT NULL,
    Name               NVARCHAR(100)  NOT NULL,
    EnvironmentType    NVARCHAR(40)   NULL,
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

CREATE TABLE TeamMembers (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    FullName   NVARCHAR(120) NOT NULL,
    JobTitle   NVARCHAR(120) NULL,
    Department NVARCHAR(120) NULL,
    Email      NVARCHAR(160) NULL,
    Status     NVARCHAR(30)  NULL
);

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

CREATE INDEX IX_Products_Name       ON Products(Name);
CREATE INDEX IX_Clients_CompanyName ON Clients(CompanyName);
CREATE INDEX IX_Deployments_Client  ON Deployments(ClientId);
CREATE INDEX IX_Deployments_Product ON Deployments(ProductId);
GO
