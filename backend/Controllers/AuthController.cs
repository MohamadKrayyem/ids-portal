// Login: checks the password against its BCrypt hash and returns a signed JWT.
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
    private readonly ILogger<AuthController> _logger;

    public AuthController(Db db, IConfiguration config, ILogger<AuthController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        try
        {
            using var conn = await _db.OpenAsync();

            var user = await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT * FROM Users WHERE Email = @Email",
                new { Email = request.Email.Trim() });

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

            return Ok(new LoginResponse { Token = token, User = user });
        }
        catch (Exception ex)
        {
            // The client still gets a generic message, but the real cause is logged so a
            // broken connection string or database does not present as a silent 500.
            _logger.LogError(ex, "Login failed for {Email}.", request.Email);

            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred while signing in." });
        }
    }

    private string CreateToken(User user)
    {
        var jwt = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
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
