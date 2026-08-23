// ---------------------------------------------------------------------------
// Models.cs
// Every C# class the API uses lives here, in one file, on purpose.
//
// Each class mirrors ONE database table. The PROPERTY NAMES match the COLUMN
// NAMES exactly, which is what lets Dapper fill these objects automatically:
// when we run "SELECT Name FROM Products", Dapper sees a "Name" column and a
// "Name" property and copies one into the other. No mapping code needed.
//
// Rules baked in here:
//   - "string?" / "DateTime?" means the column allows NULL (empty).
//   - A plain "string" means the column is required (NOT NULL).
//   - PasswordHash is marked [JsonIgnore] so it can NEVER be sent to the
//     browser, even by accident.
//
// We reuse these same classes as the request body for create/update. The
// client sends JSON, .NET fills one of these objects, and we read the fields
// we need. For creates we simply ignore the Id it sends.
// ---------------------------------------------------------------------------

using System.Text.Json.Serialization;

namespace Backend;

// ------------------------------- Users -------------------------------------
// Login accounts for the portal. Managed by Admins only.
public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";

    // The hashed password. [JsonIgnore] guarantees it is stripped out of every
    // JSON response, so it never reaches the browser. We only read it on the
    // server when checking a login.
    [JsonIgnore]
    public string PasswordHash { get; set; } = "";

    public string Role { get; set; } = "";        // Admin | Editor | Viewer
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ------------------------------ Products -----------------------------------
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? BusinessPurpose { get; set; }
    public string LifecycleStatus { get; set; } = ""; // Active | Maintenance | Planned | Deprecated
    public string? CurrentVersion { get; set; }
    public string? SupportedMarkets { get; set; }
    public string? Criticality { get; set; }
    public string? Technologies { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// ------------------------------- Modules -----------------------------------
// A part of a product. Belongs to one product (ProductId).
public class Module
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Status { get; set; }
}

// ------------------------------- Clients -----------------------------------
public class Client
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = "";
    public string? Country { get; set; }
    public string? ContactInfo { get; set; }
    public string? Status { get; set; }           // Active | Prospect | Former
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ----------------------------- Deployments ---------------------------------
// The bridge between a client and a product: "this client runs this product".
public class Deployment
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public int ProductId { get; set; }
    public string? ProductVersion { get; set; }
    public string? EnabledModules { get; set; }
    public DateTime? GoLiveDate { get; set; }
    public string? Status { get; set; }           // Live | Pilot | Suspended
    public string? SupportTier { get; set; }
    public string? Notes { get; set; }
}

// ----------------------------- Environments --------------------------------
// A running copy of a deployment (Production, UAT, Test, ...).
// SECURITY: never a password, key or token here. AccessReference is only a
// pointer to where a colleague requests access.
public class Environment
{
    public int Id { get; set; }
    public int DeploymentId { get; set; }
    public string Name { get; set; } = "";
    public string? EnvironmentType { get; set; }  // Development | Testing | UAT | Production
    public string? Purpose { get; set; }
    public string? ServerName { get; set; }
    public string? OperatingSystem { get; set; }
    public string? ApplicationUrl { get; set; }
    public string? DatabaseInfo { get; set; }
    public string? MonitoringLink { get; set; }
    public string? AccessReference { get; set; }
    public string? Notes { get; set; }
}

// ------------------------------ TeamMembers --------------------------------
public class TeamMember
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? Email { get; set; }
    public string? Status { get; set; }
}

// ------------------------- ProductResponsibilities -------------------------
// Links a team member to a product ("who looks after what").
public class ProductResponsibility
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int TeamMemberId { get; set; }
    public string Responsibility { get; set; } = "";
    public string? Description { get; set; }
}

// ----------------------------- Repositories --------------------------------
// Where a product's source code lives. A link only, no credentials.
public class Repository
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string Name { get; set; } = "";
    public string? GithubUrl { get; set; }
    public string? MainBranch { get; set; }
    public string? Description { get; set; }
}

// ------------------------------- Documents ---------------------------------
// A link to a document stored elsewhere. We store the link, not the file.
public class Document
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string Name { get; set; } = "";
    public string? DocumentType { get; set; }
    public string? Description { get; set; }
    public string? Url { get; set; }
    public DateTime? LastUpdated { get; set; }
}

// -------------------------------- Auth -------------------------------------
// What the login endpoint receives, and what it sends back.

public class LoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class LoginResponse
{
    public string Token { get; set; } = "";       // the JWT
    public User User { get; set; } = new();        // PasswordHash is hidden by [JsonIgnore]
}

// Admin-only: the body for creating a new login account. This is the ONLY place
// a plain password enters the system. We hash it immediately and never store or
// return the plain value.
public class CreateUserRequest
{
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string Role { get; set; } = "";        // Admin | Editor | Viewer
}
