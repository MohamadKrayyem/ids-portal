// ---------------------------------------------------------------------------
// ProductsController.cs
// Everything about products AND the things that belong to a product:
// its modules, repositories and documents. Related data shares this controller
// on purpose, so a reader finds it all in one place.
//
// Security:
//   - Reading  = any signed-in user (Viewer, Editor, Admin).  [Authorize]
//   - Writing  = Editor or Admin only.  [Authorize(Roles = "Admin,Editor")]
//   - All SQL uses @parameters. User values are never glued into the SQL text.
// ---------------------------------------------------------------------------

using Backend;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/products")]
[Authorize] // must be signed in for every action below unless overridden
public class ProductsController : ControllerBase
{
    private readonly Db _db;
    public ProductsController(Db db) => _db = db;

    // A single spot for the "something broke" answer, so we never leak details.
    private IActionResult ServerError() =>
        StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unexpected error occurred." });

    // GET /api/products?search=trad&status=Active
    // Both filters are optional. The "(@x IS NULL OR ...)" trick means an unset
    // filter simply does nothing - no dynamic SQL building required.
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Product>(
                @"SELECT * FROM Products
                  WHERE (@Search IS NULL OR Name LIKE @Search OR Description LIKE @Search)
                    AND (@Status IS NULL OR LifecycleStatus = @Status)
                  ORDER BY Name",
                new
                {
                    // The % wildcards are added to the VALUE in C#, so the SQL stays fixed.
                    Search = string.IsNullOrWhiteSpace(search) ? null : $"%{search}%",
                    Status = string.IsNullOrWhiteSpace(status) ? null : status
                });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/products/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetOne(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var product = await conn.QuerySingleOrDefaultAsync<Product>(
                "SELECT * FROM Products WHERE Id = @Id", new { Id = id });
            return product is null
                ? NotFound(new { message = "Product was not found." })
                : Ok(product);
        }
        catch (Exception) { return ServerError(); }
    }

    // POST /api/products
    [HttpPost]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Create([FromBody] Product input)
    {
        if (string.IsNullOrWhiteSpace(input.Name) || string.IsNullOrWhiteSpace(input.LifecycleStatus))
            return BadRequest(new { message = "Name and lifecycle status are required." });

        try
        {
            using var conn = await _db.OpenAsync();
            // INSERT then read the new Id back, then return the whole fresh row.
            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO Products
                    (Name, Description, BusinessPurpose, LifecycleStatus, CurrentVersion,
                     SupportedMarkets, Criticality, Technologies, Notes)
                  VALUES
                    (@Name, @Description, @BusinessPurpose, @LifecycleStatus, @CurrentVersion,
                     @SupportedMarkets, @Criticality, @Technologies, @Notes);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", input);

            var created = await conn.QuerySingleAsync<Product>(
                "SELECT * FROM Products WHERE Id = @Id", new { Id = newId });

            // 201 Created is the correct status for "made a new thing".
            return CreatedAtAction(nameof(GetOne), new { id = newId }, created);
        }
        catch (Exception) { return ServerError(); }
    }

    // PUT /api/products/5
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Update(int id, [FromBody] Product input)
    {
        if (string.IsNullOrWhiteSpace(input.Name) || string.IsNullOrWhiteSpace(input.LifecycleStatus))
            return BadRequest(new { message = "Name and lifecycle status are required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                @"UPDATE Products SET
                    Name = @Name, Description = @Description, BusinessPurpose = @BusinessPurpose,
                    LifecycleStatus = @LifecycleStatus, CurrentVersion = @CurrentVersion,
                    SupportedMarkets = @SupportedMarkets, Criticality = @Criticality,
                    Technologies = @Technologies, Notes = @Notes, UpdatedAt = SYSUTCDATETIME()
                  WHERE Id = @Id",
                new
                {
                    input.Name, input.Description, input.BusinessPurpose, input.LifecycleStatus,
                    input.CurrentVersion, input.SupportedMarkets, input.Criticality,
                    input.Technologies, input.Notes, Id = id
                });

            if (affected == 0) return NotFound(new { message = "Product was not found." });

            var updated = await conn.QuerySingleAsync<Product>(
                "SELECT * FROM Products WHERE Id = @Id", new { Id = id });
            return Ok(updated);
        }
        catch (Exception) { return ServerError(); }
    }

    // DELETE /api/products/5
    // The database cascades: deleting a product also removes its modules,
    // repositories, documents, responsibilities, deployments and environments.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM Products WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "Product was not found." })
                : NoContent(); // 204: done, nothing to send back
        }
        catch (Exception) { return ServerError(); }
    }

    // ----------------------- nested reads for one product -------------------

    // GET /api/products/5/modules
    [HttpGet("{id:int}/modules")]
    public async Task<IActionResult> GetModules(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Module>(
                "SELECT * FROM Modules WHERE ProductId = @Id ORDER BY Name", new { Id = id });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/products/5/repositories
    [HttpGet("{id:int}/repositories")]
    public async Task<IActionResult> GetRepositories(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Repository>(
                "SELECT * FROM Repositories WHERE ProductId = @Id ORDER BY Name", new { Id = id });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/products/5/documents
    [HttpGet("{id:int}/documents")]
    public async Task<IActionResult> GetDocuments(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Document>(
                "SELECT * FROM Documents WHERE ProductId = @Id ORDER BY Name", new { Id = id });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/products/5/team
    // The people responsible for this product, with each person's details joined in.
    [HttpGet("{id:int}/team")]
    public async Task<IActionResult> GetTeam(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync(
                @"SELECT r.Id, r.ProductId, r.TeamMemberId, r.Responsibility, r.Description,
                         t.FullName, t.Email, t.JobTitle, t.Department
                  FROM ProductResponsibilities r
                  JOIN TeamMembers t ON t.Id = r.TeamMemberId
                  WHERE r.ProductId = @Id
                  ORDER BY t.FullName", new { Id = id });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/products/5/clients  - every client that runs this product.
    [HttpGet("{id:int}/clients")]
    public async Task<IActionResult> GetClients(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<Client>(
                @"SELECT DISTINCT c.* FROM Clients c
                  JOIN Deployments d ON d.ClientId = c.Id
                  WHERE d.ProductId = @Id
                  ORDER BY c.CompanyName", new { Id = id });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // ----------------- flat lists the frontend loads once -------------------
    // The detail pages load a whole list and filter it in the browser, so these
    // "get everything" endpoints exist alongside the nested reads above.

    // GET /api/modules
    [HttpGet("/api/modules")]
    public async Task<IActionResult> AllModules()
    {
        try
        {
            using var conn = await _db.OpenAsync();
            return Ok(await conn.QueryAsync<Module>("SELECT * FROM Modules ORDER BY Name"));
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/repositories
    [HttpGet("/api/repositories")]
    public async Task<IActionResult> AllRepositories()
    {
        try
        {
            using var conn = await _db.OpenAsync();
            return Ok(await conn.QueryAsync<Repository>("SELECT * FROM Repositories ORDER BY Name"));
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/documents
    [HttpGet("/api/documents")]
    public async Task<IActionResult> AllDocuments()
    {
        try
        {
            using var conn = await _db.OpenAsync();
            return Ok(await conn.QueryAsync<Document>("SELECT * FROM Documents ORDER BY Name"));
        }
        catch (Exception) { return ServerError(); }
    }
}
