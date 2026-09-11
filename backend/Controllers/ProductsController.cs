// Products and what belongs to them: modules, repositories, documents and team.
using Backend;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly Db _db;
    public ProductsController(Db db) => _db = db;

    private IActionResult ServerError() =>
        StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unexpected error occurred." });

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
                    Search = string.IsNullOrWhiteSpace(search) ? null : $"%{search}%",
                    Status = string.IsNullOrWhiteSpace(status) ? null : status
                });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

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

    [HttpPost]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Create([FromBody] Product input)
    {
        if (string.IsNullOrWhiteSpace(input.Name) || string.IsNullOrWhiteSpace(input.LifecycleStatus))
            return BadRequest(new { message = "Name and lifecycle status are required." });

        try
        {
            using var conn = await _db.OpenAsync();
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

            return CreatedAtAction(nameof(GetOne), new { id = newId }, created);
        }
        catch (Exception) { return ServerError(); }
    }

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
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }

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

    [HttpPost("/api/modules")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> CreateModule([FromBody] Module input)
    {
        if (input.ProductId <= 0) return BadRequest(new { message = "A product is required." });
        if (string.IsNullOrWhiteSpace(input.Name))
            return BadRequest(new { message = "Module name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO Modules (ProductId, Name, Description, Status)
                  VALUES (@ProductId, @Name, @Description, @Status);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", input);
            var created = await conn.QuerySingleAsync<Module>(
                "SELECT * FROM Modules WHERE Id = @Id", new { Id = newId });
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpPut("/api/modules/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> UpdateModule(int id, [FromBody] Module input)
    {
        if (input.ProductId <= 0) return BadRequest(new { message = "A product is required." });
        if (string.IsNullOrWhiteSpace(input.Name))
            return BadRequest(new { message = "Module name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                @"UPDATE Modules SET
                    ProductId = @ProductId, Name = @Name,
                    Description = @Description, Status = @Status
                  WHERE Id = @Id",
                new { input.ProductId, input.Name, input.Description, input.Status, Id = id });
            if (affected == 0) return NotFound(new { message = "Module was not found." });
            var updated = await conn.QuerySingleAsync<Module>(
                "SELECT * FROM Modules WHERE Id = @Id", new { Id = id });
            return Ok(updated);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpDelete("/api/modules/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> DeleteModule(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM Modules WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "Module was not found." })
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpPost("/api/repositories")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> CreateRepository([FromBody] Repository input)
    {
        if (input.ProductId <= 0) return BadRequest(new { message = "A product is required." });
        if (string.IsNullOrWhiteSpace(input.Name))
            return BadRequest(new { message = "Repository name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO Repositories (ProductId, Name, GithubUrl, MainBranch, Description)
                  VALUES (@ProductId, @Name, @GithubUrl, @MainBranch, @Description);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", input);
            var created = await conn.QuerySingleAsync<Repository>(
                "SELECT * FROM Repositories WHERE Id = @Id", new { Id = newId });
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpPut("/api/repositories/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> UpdateRepository(int id, [FromBody] Repository input)
    {
        if (input.ProductId <= 0) return BadRequest(new { message = "A product is required." });
        if (string.IsNullOrWhiteSpace(input.Name))
            return BadRequest(new { message = "Repository name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                @"UPDATE Repositories SET
                    ProductId = @ProductId, Name = @Name, GithubUrl = @GithubUrl,
                    MainBranch = @MainBranch, Description = @Description
                  WHERE Id = @Id",
                new
                {
                    input.ProductId, input.Name, input.GithubUrl,
                    input.MainBranch, input.Description, Id = id
                });
            if (affected == 0) return NotFound(new { message = "Repository was not found." });
            var updated = await conn.QuerySingleAsync<Repository>(
                "SELECT * FROM Repositories WHERE Id = @Id", new { Id = id });
            return Ok(updated);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpDelete("/api/repositories/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> DeleteRepository(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM Repositories WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "Repository was not found." })
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpPost("/api/documents")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> CreateDocument([FromBody] Document input)
    {
        if (input.ProductId <= 0) return BadRequest(new { message = "A product is required." });
        if (string.IsNullOrWhiteSpace(input.Name))
            return BadRequest(new { message = "Document name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO Documents (ProductId, Name, DocumentType, Description, Url, LastUpdated)
                  VALUES (@ProductId, @Name, @DocumentType, @Description, @Url, @LastUpdated);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", input);
            var created = await conn.QuerySingleAsync<Document>(
                "SELECT * FROM Documents WHERE Id = @Id", new { Id = newId });
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpPut("/api/documents/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> UpdateDocument(int id, [FromBody] Document input)
    {
        if (input.ProductId <= 0) return BadRequest(new { message = "A product is required." });
        if (string.IsNullOrWhiteSpace(input.Name))
            return BadRequest(new { message = "Document name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                @"UPDATE Documents SET
                    ProductId = @ProductId, Name = @Name, DocumentType = @DocumentType,
                    Description = @Description, Url = @Url, LastUpdated = @LastUpdated
                  WHERE Id = @Id",
                new
                {
                    input.ProductId, input.Name, input.DocumentType,
                    input.Description, input.Url, input.LastUpdated, Id = id
                });
            if (affected == 0) return NotFound(new { message = "Document was not found." });
            var updated = await conn.QuerySingleAsync<Document>(
                "SELECT * FROM Documents WHERE Id = @Id", new { Id = id });
            return Ok(updated);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpDelete("/api/documents/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> DeleteDocument(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM Documents WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "Document was not found." })
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }
}
