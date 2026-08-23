// ---------------------------------------------------------------------------
// AuthController.cs
// One job: log a user in.
//   1. Find the user by email.
//   2. Check the typed password against the stored BCrypt hash.
//   3. If good, hand back a signed JWT that proves who they are.
//
// The JWT carries the user's id, email and role. Every other controller trusts
// that token instead of hitting the database to ask "who is this?" again.
// ---------------------------------------------------------------------------

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly Db _db;
    private readonly IConfiguration _config;

    public AuthController(Db db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // POST /api/auth/login
    // [AllowAnonymous] because you obviously cannot be logged in yet when you log in.
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // --- validate input ---
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        try
        {
            using var conn = await _db.OpenAsync();

            // Parameterised: the email is a @parameter, never glued into the SQL text.
            var user = await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT * FROM Users WHERE Email = @Email",
                new { Email = request.Email.Trim() });

            // Same vague message whether the email is unknown or the password is
            // wrong, so an attacker cannot learn which emails exist.
            if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Email or password is not correct." });
            }

            if (!user.IsActive)
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { message = "This account has been deactivated." });
            }

            var token = CreateToken(user);

            // user.PasswordHash is [JsonIgnore], so it is stripped from this response.
            return Ok(new LoginResponse { Token = token, User = user });
        }
        catch (Exception)
        {
            // Never send the raw exception to the client.
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred while signing in." });
        }
    }

    // Builds and signs the JWT. The three claims are what protected routes read.
    private string CreateToken(User user)
    {
        var jwt = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            // The user's id. We read this back later to enforce "not your own account".
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            // The role drives every [Authorize(Roles = ...)] check in the app.
            new Claim(ClaimTypes.Role, user.Role),
        };

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(int.Parse(jwt["ExpiryHours"]!)),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
