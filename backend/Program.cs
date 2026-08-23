// ---------------------------------------------------------------------------
// Program.cs
// This is where the app starts. It runs top-to-bottom once, at launch, and
// sets four things up:
//   1. Services   - features the app can use (controllers, our Db helper).
//   2. JWT auth   - how we read and trust the login token on each request.
//   3. CORS       - which website (our React app) is allowed to call us.
//   4. The pipeline - the ordered steps every incoming request passes through.
// ---------------------------------------------------------------------------

using System.Text;
using Backend;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- 1. Services -----------------------------------------------------------

// Lets .NET find our Controllers/*.cs classes and turn them into endpoints.
builder.Services.AddControllers();

// Register our Db helper ONCE. "Singleton" = one shared instance for the whole
// app, which is fine because Db only holds a connection string.
builder.Services.AddSingleton<Db>();

// --- 2. JWT authentication -------------------------------------------------
// Read the JWT settings from appsettings.json.
var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = jwt["Key"]!;
var jwtIssuer = jwt["Issuer"]!;
var jwtAudience = jwt["Audience"]!;

// Turn our secret text key into the bytes the security library needs.
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // These rules are checked on EVERY protected request. If any fail, the
        // request is rejected with 401 before it ever reaches a controller.
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,               // token must come from us
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,             // token must be meant for our app
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,     // token must be signed with our key
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,             // token must not be expired
            ClockSkew = TimeSpan.Zero            // no grace period past expiry
        };
    });

// Turns on the [Authorize] / role checks we put on controllers.
builder.Services.AddAuthorization();

// --- 3. CORS ---------------------------------------------------------------
// A browser will not let our React app (a different origin) call this API
// unless we explicitly allow that origin here. We allow ONLY the frontend.
var frontendOrigin = builder.Configuration["Cors:FrontendOrigin"]!;
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(frontendOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// --- 4. The request pipeline ----------------------------------------------
// ORDER MATTERS. Each request flows through these in this exact order.

app.UseCors();            // decide if the caller's origin is allowed
app.UseAuthentication();  // read the JWT and figure out WHO the caller is
app.UseAuthorization();   // decide if that caller is ALLOWED to do this
app.MapControllers();     // hand the request to the matching controller

// --- 5. Seed the first Admin account ---------------------------------------
// So there is always a way to log in on a brand new database. Runs once: if
// any Admin already exists, this does nothing. Never touches an existing
// user's password.
await SeedAdminAsync(app);

app.Run();

static async Task SeedAdminAsync(WebApplication app)
{
    const string seedEmail = "admin";
    const string seedPassword = "123";

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
            "Seeded first Admin account: {Email} / {Password} - change this password after logging in.",
            seedEmail, seedPassword);
    }
    catch (Exception ex)
    {
        // Do not crash startup over seeding - most likely the database has
        // not been created yet. Log it so the developer notices.
        app.Logger.LogWarning(ex, "Could not seed the Admin account. Has the database been created?");
    }
}
