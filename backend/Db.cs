// ---------------------------------------------------------------------------
// Db.cs
// One tiny helper whose only job is to hand out an OPEN connection to SQL
// Server. Every controller asks this class for a connection, runs its SQL
// with Dapper, and then closes it (the "using" keyword closes it for us).
//
// We register this once in Program.cs, so controllers just ask for a "Db"
// in their constructor and .NET gives them this same helper.
// ---------------------------------------------------------------------------

using Microsoft.Data.SqlClient;

namespace Backend;

public class Db
{
    // The connection string tells us which server and database to talk to.
    // It comes from appsettings.json so it is never hard-coded in our logic.
    private readonly string _connectionString;

    public Db(IConfiguration config)
    {
        // "Default" matches the name under "ConnectionStrings" in appsettings.json.
        // The "!" says "we are sure this is not null"; if it is, we want to crash
        // loudly at startup rather than fail mysteriously later.
        _connectionString = config.GetConnectionString("Default")!;
    }

    // Opens and returns a connection. "async" means it does not block the
    // program while it waits for SQL Server to answer.
    // Callers use it like:  using var conn = await _db.OpenAsync();
    public async Task<SqlConnection> OpenAsync()
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }
}
