// ---------------------------------------------------------------------------
// ClientsController.cs
// Clients, plus what belongs to a client: deployments and their environments.
// Also hosts GET /api/dashboard, because those counts come mostly from here.
//
// Security: reads = any signed-in user; writes = Editor or Admin only.
// All SQL is parameterised. Environments never hold a secret - only pointers.
// ---------------------------------------------------------------------------

using Backend;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly Db _db;
    public ClientsController(Db db) => _db = db;

    private IActionResult ServerError() =>
        StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unexpected error occurred." });

    // =========================== CLIENTS ====================================

    // GET /api/clients?search=bank&status=Active&country=Lebanon
    [HttpGet("/api/clients")]
    public async Task<IActionResult> GetClients(
        [FromQuery] string? search, [FromQuery] string? status, [FromQuery] string? country)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Client>(
                @"SELECT * FROM Clients
                  WHERE (@Search  IS NULL OR CompanyName LIKE @Search)
                    AND (@Status  IS NULL OR Status  = @Status)
                    AND (@Country IS NULL OR Country = @Country)
                  ORDER BY CompanyName",
                new
                {
                    Search  = string.IsNullOrWhiteSpace(search)  ? null : $"%{search}%",
                    Status  = string.IsNullOrWhiteSpace(status)  ? null : status,
                    Country = string.IsNullOrWhiteSpace(country) ? null : country
                });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/clients/5
    [HttpGet("/api/clients/{id:int}")]
    public async Task<IActionResult> GetClient(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var client = await conn.QuerySingleOrDefaultAsync<Client>(
                "SELECT * FROM Clients WHERE Id = @Id", new { Id = id });
            return client is null
                ? NotFound(new { message = "Client was not found." })
                : Ok(client);
        }
        catch (Exception) { return ServerError(); }
    }

    // POST /api/clients
    [HttpPost("/api/clients")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> CreateClient([FromBody] Client input)
    {
        if (string.IsNullOrWhiteSpace(input.CompanyName))
            return BadRequest(new { message = "Company name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO Clients (CompanyName, Country, ContactInfo, Status, Notes)
                  VALUES (@CompanyName, @Country, @ContactInfo, @Status, @Notes);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", input);
            var created = await conn.QuerySingleAsync<Client>(
                "SELECT * FROM Clients WHERE Id = @Id", new { Id = newId });
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception) { return ServerError(); }
    }

    // PUT /api/clients/5
    [HttpPut("/api/clients/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> UpdateClient(int id, [FromBody] Client input)
    {
        if (string.IsNullOrWhiteSpace(input.CompanyName))
            return BadRequest(new { message = "Company name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                @"UPDATE Clients SET
                    CompanyName = @CompanyName, Country = @Country, ContactInfo = @ContactInfo,
                    Status = @Status, Notes = @Notes
                  WHERE Id = @Id",
                new { input.CompanyName, input.Country, input.ContactInfo, input.Status, input.Notes, Id = id });

            if (affected == 0) return NotFound(new { message = "Client was not found." });
            var updated = await conn.QuerySingleAsync<Client>(
                "SELECT * FROM Clients WHERE Id = @Id", new { Id = id });
            return Ok(updated);
        }
        catch (Exception) { return ServerError(); }
    }

    // DELETE /api/clients/5  (cascades to deployments and environments)
    [HttpDelete("/api/clients/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> DeleteClient(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM Clients WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "Client was not found." })
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/clients/5/deployments  - every product this client runs.
    [HttpGet("/api/clients/{id:int}/deployments")]
    public async Task<IActionResult> GetClientDeployments(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Deployment>(
                "SELECT * FROM Deployments WHERE ClientId = @Id", new { Id = id });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // ========================= DEPLOYMENTS ==================================

    // GET /api/deployments?clientId=1&productId=2&status=Live
    [HttpGet("/api/deployments")]
    public async Task<IActionResult> GetDeployments(
        [FromQuery] int? clientId, [FromQuery] int? productId, [FromQuery] string? status)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Deployment>(
                @"SELECT * FROM Deployments
                  WHERE (@ClientId  IS NULL OR ClientId  = @ClientId)
                    AND (@ProductId IS NULL OR ProductId = @ProductId)
                    AND (@Status    IS NULL OR Status    = @Status)",
                new
                {
                    ClientId = clientId,
                    ProductId = productId,
                    Status = string.IsNullOrWhiteSpace(status) ? null : status
                });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/deployments/5
    [HttpGet("/api/deployments/{id:int}")]
    public async Task<IActionResult> GetDeployment(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var d = await conn.QuerySingleOrDefaultAsync<Deployment>(
                "SELECT * FROM Deployments WHERE Id = @Id", new { Id = id });
            return d is null
                ? NotFound(new { message = "Deployment was not found." })
                : Ok(d);
        }
        catch (Exception) { return ServerError(); }
    }

    // POST /api/deployments
    [HttpPost("/api/deployments")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> CreateDeployment([FromBody] Deployment input)
    {
        if (input.ClientId <= 0 || input.ProductId <= 0)
            return BadRequest(new { message = "A client and a product are required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO Deployments
                    (ClientId, ProductId, ProductVersion, EnabledModules, GoLiveDate, Status, SupportTier, Notes)
                  VALUES
                    (@ClientId, @ProductId, @ProductVersion, @EnabledModules, @GoLiveDate, @Status, @SupportTier, @Notes);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", input);
            var created = await conn.QuerySingleAsync<Deployment>(
                "SELECT * FROM Deployments WHERE Id = @Id", new { Id = newId });
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception) { return ServerError(); }
    }

    // PUT /api/deployments/5
    [HttpPut("/api/deployments/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> UpdateDeployment(int id, [FromBody] Deployment input)
    {
        if (input.ClientId <= 0 || input.ProductId <= 0)
            return BadRequest(new { message = "A client and a product are required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                @"UPDATE Deployments SET
                    ClientId = @ClientId, ProductId = @ProductId, ProductVersion = @ProductVersion,
                    EnabledModules = @EnabledModules, GoLiveDate = @GoLiveDate, Status = @Status,
                    SupportTier = @SupportTier, Notes = @Notes
                  WHERE Id = @Id",
                new
                {
                    input.ClientId, input.ProductId, input.ProductVersion, input.EnabledModules,
                    input.GoLiveDate, input.Status, input.SupportTier, input.Notes, Id = id
                });
            if (affected == 0) return NotFound(new { message = "Deployment was not found." });
            var updated = await conn.QuerySingleAsync<Deployment>(
                "SELECT * FROM Deployments WHERE Id = @Id", new { Id = id });
            return Ok(updated);
        }
        catch (Exception) { return ServerError(); }
    }

    // DELETE /api/deployments/5  (cascades to its environments)
    [HttpDelete("/api/deployments/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> DeleteDeployment(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM Deployments WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "Deployment was not found." })
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }

    // ========================= ENVIRONMENTS =================================
    // Read-only here. Environments store only an AccessReference pointer,
    // never a password, key or connection secret.

    // GET /api/environments
    [HttpGet("/api/environments")]
    public async Task<IActionResult> GetEnvironments()
    {
        try
        {
            using var conn = await _db.OpenAsync();
            return Ok(await conn.QueryAsync<Backend.Environment>("SELECT * FROM Environments ORDER BY Name"));
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/deployments/5/environments
    [HttpGet("/api/deployments/{id:int}/environments")]
    public async Task<IActionResult> GetDeploymentEnvironments(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Backend.Environment>(
                "SELECT * FROM Environments WHERE DeploymentId = @Id ORDER BY Name", new { Id = id });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // =========================== DASHBOARD ==================================

    // GET /api/dashboard  - the counts the dashboard shows, in one call.
    [HttpGet("/api/dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        try
        {
            using var conn = await _db.OpenAsync();
            // One round-trip returns several single-number results in order.
            using var multi = await conn.QueryMultipleAsync(
                @"SELECT COUNT(*) FROM Products;
                  SELECT COUNT(*) FROM Products WHERE LifecycleStatus = 'Active';
                  SELECT COUNT(*) FROM Clients;
                  SELECT COUNT(*) FROM Clients  WHERE Status = 'Active';
                  SELECT COUNT(*) FROM Deployments;
                  SELECT COUNT(*) FROM Deployments WHERE Status = 'Live';
                  SELECT COUNT(*) FROM Environments;
                  SELECT COUNT(*) FROM Environments WHERE EnvironmentType = 'Production';");

            var result = new
            {
                products               = await multi.ReadSingleAsync<int>(),
                activeProducts         = await multi.ReadSingleAsync<int>(),
                clients                = await multi.ReadSingleAsync<int>(),
                activeClients          = await multi.ReadSingleAsync<int>(),
                deployments            = await multi.ReadSingleAsync<int>(),
                liveDeployments        = await multi.ReadSingleAsync<int>(),
                environments           = await multi.ReadSingleAsync<int>(),
                productionEnvironments = await multi.ReadSingleAsync<int>()
            };
            return Ok(result);
        }
        catch (Exception) { return ServerError(); }
    }
}
