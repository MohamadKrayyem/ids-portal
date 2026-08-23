// ---------------------------------------------------------------------------
// UsersController.cs
// Managing login accounts. ADMIN ONLY - the whole controller is locked with
// [Authorize(Roles = "Admin")], so an Editor or Viewer never reaches any action.
//
// Safety rules enforced here on the server:
//   - Passwords are hashed with BCrypt. The plain password is never stored.
//   - PasswordHash is never returned (the User model hides it with [JsonIgnore]).
//   - An admin cannot demote, deactivate, or delete their OWN account, so the
//     system can never be locked out of all its admins by accident.
// ---------------------------------------------------------------------------

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

    // The valid roles. Used to reject anything mistyped.
    private static readonly string[] ValidRoles = { "Admin", "Editor", "Viewer" };

    private IActionResult ServerError() =>
        StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unexpected error occurred." });

    // The id of the admin making the request, read from their JWT.
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/users
    // We SELECT only safe columns - the password hash is never even fetched.
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

    // GET /api/users/5
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

    // POST /api/users  - create a new login account.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest input)
    {
        // --- validate ---
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

            // Friendly duplicate check (the DB also enforces this with a UNIQUE index).
            var exists = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM Users WHERE Email = @Email", new { Email = input.Email.Trim() });
            if (exists > 0)
                return BadRequest(new { message = "A user with that email already exists." });

            // Hash the password. The plain text is used here and then forgotten.
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

    // PUT /api/users/5  - change name, email, role, or active state.
    // This covers "change role" and "activate/deactivate" in one place.
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] User input)
    {
        if (string.IsNullOrWhiteSpace(input.FullName) || string.IsNullOrWhiteSpace(input.Email))
            return BadRequest(new { message = "Full name and email are required." });

        if (!ValidRoles.Contains(input.Role))
            return BadRequest(new { message = "Role must be Admin, Editor or Viewer." });

        // Self-protection: you cannot demote or deactivate yourself.
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

    // DELETE /api/users/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        // Self-protection: you cannot delete your own account.
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
