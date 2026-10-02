// App startup: services, JWT auth, CORS, the request pipeline and the first-admin seed.
using System.Text;
using Backend;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddSingleton<Db>();

var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = RequireSetting(jwt["Key"], "Jwt:Key");
var jwtIssuer = RequireSetting(jwt["Issuer"], "Jwt:Issuer");
var jwtAudience = RequireSetting(jwt["Audience"], "Jwt:Audience");
RequireSetting(builder.Configuration.GetConnectionString("Default"), "ConnectionStrings:Default");

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// CORS is only needed when the frontend runs on its own origin (the Vite dev server).
// In Azure the API serves the built frontend itself, so the setting can be left out.
var frontendOrigin = builder.Configuration["Cors:FrontendOrigin"];
if (!string.IsNullOrWhiteSpace(frontendOrigin))
{
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(frontendOrigin)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
    });
}

var app = builder.Build();

// Serves the built React app from wwwroot (Vite writes its output there).
app.UseDefaultFiles();
app.UseStaticFiles();

if (!string.IsNullOrWhiteSpace(frontendOrigin)) app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Any non-API, non-file route belongs to the React router.
app.MapFallbackToFile("index.html");

await SeedAdminAsync(app);

app.Run();

// Fails fast with an actionable message when a required setting is absent, instead of
// letting a null value surface later as an opaque NullReferenceException or a 500.
static string RequireSetting(string? value, string key)
{
    if (!string.IsNullOrWhiteSpace(value)) return value;

    throw new InvalidOperationException(
        $"Required configuration '{key}' is missing. Copy backend/appsettings.Example.json " +
        "to backend/appsettings.json and fill in the values.");
}

// Creates the first Admin from Seed:AdminEmail / Seed:AdminPassword when no Admin exists yet.
// If either setting is missing, seeding is skipped.
static async Task SeedAdminAsync(WebApplication app)
{
    var seedEmail = app.Configuration["Seed:AdminEmail"];
    var seedPassword = app.Configuration["Seed:AdminPassword"];

    if (string.IsNullOrWhiteSpace(seedEmail) || string.IsNullOrWhiteSpace(seedPassword))
    {
        app.Logger.LogInformation("Seed:AdminEmail / Seed:AdminPassword not set - skipping Admin seed.");
        return;
    }

    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Db>();
        using var conn = await db.OpenAsync();

        var adminCount = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM Users WHERE Role = 'Admin'");
        if (adminCount > 0) return;

        var hash = BCrypt.Net.BCrypt.HashPassword(seedPassword);
        await conn.ExecuteAsync(
            @"INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive)
              VALUES (@FullName, @Email, @PasswordHash, 'Admin', 1)",
            new { FullName = "System Admin", Email = seedEmail, PasswordHash = hash });

        app.Logger.LogInformation(
            "Seeded first Admin account: {Email} - change this password after logging in.", seedEmail);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not seed the Admin account. Has the database been created?");
    }
}
