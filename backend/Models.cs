// The classes that mirror the database tables and the API request/response bodies.
using System.Text.Json.Serialization;

namespace Backend;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";

    [JsonIgnore]
    public string PasswordHash { get; set; } = "";

    public string Role { get; set; } = "";
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? BusinessPurpose { get; set; }
    public string LifecycleStatus { get; set; } = "";
    public string? CurrentVersion { get; set; }
    public string? SupportedMarkets { get; set; }
    public string? Criticality { get; set; }
    public string? Technologies { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Module
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Status { get; set; }
}

public class Client
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = "";
    public string? Country { get; set; }
    public string? ContactInfo { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Deployment
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public int ProductId { get; set; }
    public string? ProductVersion { get; set; }
    public string? EnabledModules { get; set; }
    public DateTime? GoLiveDate { get; set; }
    public string? Status { get; set; }
    public string? SupportTier { get; set; }
    public string? Notes { get; set; }
}

public class Environment
{
    public int Id { get; set; }
    public int DeploymentId { get; set; }
    public string Name { get; set; } = "";
    public string? EnvironmentType { get; set; }
    public string? Purpose { get; set; }
    public string? ServerName { get; set; }
    public string? OperatingSystem { get; set; }
    public string? ApplicationUrl { get; set; }
    public string? DatabaseInfo { get; set; }
    public string? MonitoringLink { get; set; }
    public string? AccessReference { get; set; }
    public string? Notes { get; set; }
}

public class TeamMember
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? Email { get; set; }
    public string? Status { get; set; }
}

public class ProductResponsibility
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int TeamMemberId { get; set; }
    public string Responsibility { get; set; } = "";
    public string? Description { get; set; }
}

public class ClientTeamMember
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string? JobTitle { get; set; }
    public string Responsibility { get; set; } = "";
}

public class Repository
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string Name { get; set; } = "";
    public string? GithubUrl { get; set; }
    public string? MainBranch { get; set; }
    public string? Description { get; set; }
}

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

public class RecentProduct
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string LifecycleStatus { get; set; } = "";
    public DateTime UpdatedAt { get; set; }
}

public class DashboardStats
{
    public int Products { get; set; }
    public int ActiveProducts { get; set; }
    public int Clients { get; set; }
    public int ActiveClients { get; set; }
    public int Deployments { get; set; }
    public int LiveDeployments { get; set; }
    public int Environments { get; set; }
    public int ProductionEnvironments { get; set; }
    public int TeamMembers { get; set; }

    public IEnumerable<RecentProduct> RecentProducts { get; set; } = new List<RecentProduct>();
}

public class LoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class LoginResponse
{
    public string Token { get; set; } = "";
    public User User { get; set; } = new();
}

public class CreateUserRequest
{
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string Role { get; set; } = "";
}
