// ---------------------------------------------------------------------------
// TeamController.cs
// Team members and the responsibilities that link a member to a product.
// Reads = any signed-in user; writes = Editor or Admin. All SQL parameterised.
// ---------------------------------------------------------------------------

using Backend;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize]
public class TeamController : ControllerBase
{
    private readonly Db _db;
    public TeamController(Db db) => _db = db;

    private IActionResult ServerError() =>
        StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unexpected error occurred." });

    // ========================= TEAM MEMBERS =================================

    // GET /api/teammembers?search=maya
    [HttpGet("/api/teammembers")]
    public async Task<IActionResult> GetMembers([FromQuery] string? search)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<TeamMember>(
                @"SELECT * FROM TeamMembers
                  WHERE (@Search IS NULL OR FullName LIKE @Search OR Email LIKE @Search)
                  ORDER BY FullName",
                new { Search = string.IsNullOrWhiteSpace(search) ? null : $"%{search}%" });
            return Ok(rows);
        }
        catch (Exception) { return ServerError(); }
    }

    // GET /api/teammembers/5
    [HttpGet("/api/teammembers/{id:int}")]
    public async Task<IActionResult> GetMember(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var m = await conn.QuerySingleOrDefaultAsync<TeamMember>(
                "SELECT * FROM TeamMembers WHERE Id = @Id", new { Id = id });
            return m is null
                ? NotFound(new { message = "Team member was not found." })
                : Ok(m);
        }
        catch (Exception) { return ServerError(); }
    }

    // POST /api/teammembers
    [HttpPost("/api/teammembers")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> CreateMember([FromBody] TeamMember input)
    {
        if (string.IsNullOrWhiteSpace(input.FullName))
            return BadRequest(new { message = "Full name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO TeamMembers (FullName, JobTitle, Department, Email, Status)
                  VALUES (@FullName, @JobTitle, @Department, @Email, @Status);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", input);
            var created = await conn.QuerySingleAsync<TeamMember>(
                "SELECT * FROM TeamMembers WHERE Id = @Id", new { Id = newId });
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception) { return ServerError(); }
    }

    // PUT /api/teammembers/5
    [HttpPut("/api/teammembers/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> UpdateMember(int id, [FromBody] TeamMember input)
    {
        if (string.IsNullOrWhiteSpace(input.FullName))
            return BadRequest(new { message = "Full name is required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                @"UPDATE TeamMembers SET
                    FullName = @FullName, JobTitle = @JobTitle, Department = @Department,
                    Email = @Email, Status = @Status
                  WHERE Id = @Id",
                new { input.FullName, input.JobTitle, input.Department, input.Email, input.Status, Id = id });
            if (affected == 0) return NotFound(new { message = "Team member was not found." });
            var updated = await conn.QuerySingleAsync<TeamMember>(
                "SELECT * FROM TeamMembers WHERE Id = @Id", new { Id = id });
            return Ok(updated);
        }
        catch (Exception) { return ServerError(); }
    }

    // DELETE /api/teammembers/5  (cascades to that member's responsibilities)
    [HttpDelete("/api/teammembers/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> DeleteMember(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM TeamMembers WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "Team member was not found." })
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }

    // ====================== RESPONSIBILITIES ================================

    // GET /api/responsibilities  - the flat list the product pages load.
    [HttpGet("/api/responsibilities")]
    public async Task<IActionResult> GetResponsibilities()
    {
        try
        {
            using var conn = await _db.OpenAsync();
            return Ok(await conn.QueryAsync<ProductResponsibility>(
                "SELECT * FROM ProductResponsibilities"));
        }
        catch (Exception) { return ServerError(); }
    }

    // POST /api/responsibilities  - assign a team member to a product.
    [HttpPost("/api/responsibilities")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> CreateResponsibility([FromBody] ProductResponsibility input)
    {
        if (input.ProductId <= 0 || input.TeamMemberId <= 0 || string.IsNullOrWhiteSpace(input.Responsibility))
            return BadRequest(new { message = "Product, team member and responsibility are required." });

        try
        {
            using var conn = await _db.OpenAsync();
            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO ProductResponsibilities (ProductId, TeamMemberId, Responsibility, Description)
                  VALUES (@ProductId, @TeamMemberId, @Responsibility, @Description);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);", input);
            var created = await conn.QuerySingleAsync<ProductResponsibility>(
                "SELECT * FROM ProductResponsibilities WHERE Id = @Id", new { Id = newId });
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception) { return ServerError(); }
    }

    // DELETE /api/responsibilities/5
    [HttpDelete("/api/responsibilities/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> DeleteResponsibility(int id)
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM ProductResponsibilities WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "Responsibility was not found." })
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }
}
