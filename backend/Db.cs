// Hands out an open SQL Server connection built from the configured connection string.
using Microsoft.Data.SqlClient;

namespace Backend;

public class Db
{
    private readonly string _connectionString;

    public Db(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Default")!;
    }

    public async Task<SqlConnection> OpenAsync()
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }
}
