// Admin-only management of the portal login accounts.
using System.Security.Claims;
using Backend;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly Db _db;
    public UsersController(Db db) => _db = db;

    private static readonly string[] ValidRoles = { "Admin", "Editor", "Viewer" };

    private IActionResult ServerError() =>
        StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unexpected error occurred." });

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            using var conn = await _db.OpenAsync();
            var rows = await conn.QueryAsync<User>(
                "SELECT Id, FullName, Email, Role, IsActive, CreatedAt FROM Users ORDER BY FullName");
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
            var user = await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT Id, FullName, Email, Role, IsActive, CreatedAt FROM Users WHERE Id = @Id",
                new { Id = id });
            return user is null
                ? NotFound(new { message = "User was not found." })
                : Ok(user);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.FullName) ||
            string.IsNullOrWhiteSpace(input.Email) ||
            string.IsNullOrWhiteSpace(input.Password))
            return BadRequest(new { message = "Full name, email and password are required." });

        if (!ValidRoles.Contains(input.Role))
            return BadRequest(new { message = "Role must be Admin, Editor or Viewer." });

        if (input.Password.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });

        try
        {
            using var conn = await _db.OpenAsync();

            var exists = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM Users WHERE Email = @Email", new { Email = input.Email.Trim() });
            if (exists > 0)
                return BadRequest(new { message = "A user with that email already exists." });

            var hash = BCrypt.Net.BCrypt.HashPassword(input.Password);

            var newId = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive)
                  VALUES (@FullName, @Email, @PasswordHash, @Role, 1);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);",
                new { input.FullName, Email = input.Email.Trim(), PasswordHash = hash, input.Role });

            var created = await conn.QuerySingleAsync<User>(
                "SELECT Id, FullName, Email, Role, IsActive, CreatedAt FROM Users WHERE Id = @Id",
                new { Id = newId });
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] User input)
    {
        if (string.IsNullOrWhiteSpace(input.FullName) || string.IsNullOrWhiteSpace(input.Email))
            return BadRequest(new { message = "Full name and email are required." });

        if (!ValidRoles.Contains(input.Role))
            return BadRequest(new { message = "Role must be Admin, Editor or Viewer." });

        if (id == CurrentUserId && (input.Role != "Admin" || !input.IsActive))
            return BadRequest(new
            {
                message = "You cannot change your own role or deactivate your own account."
            });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                @"UPDATE Users SET
                    FullName = @FullName, Email = @Email, Role = @Role, IsActive = @IsActive
                  WHERE Id = @Id",
                new { input.FullName, Email = input.Email.Trim(), input.Role, input.IsActive, Id = id });

            if (affected == 0) return NotFound(new { message = "User was not found." });

            var updated = await conn.QuerySingleAsync<User>(
                "SELECT Id, FullName, Email, Role, IsActive, CreatedAt FROM Users WHERE Id = @Id",
                new { Id = id });
            return Ok(updated);
        }
        catch (Exception) { return ServerError(); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (id == CurrentUserId)
            return BadRequest(new { message = "You cannot delete your own account." });

        try
        {
            using var conn = await _db.OpenAsync();
            var affected = await conn.ExecuteAsync(
                "DELETE FROM Users WHERE Id = @Id", new { Id = id });
            return affected == 0
                ? NotFound(new { message = "User was not found." })
                : NoContent();
        }
        catch (Exception) { return ServerError(); }
    }
}
