# IDS Portal

An internal directory for IDS Fintech: every product we build, the clients
running each one, their deployments and environments, the team responsible,
and the staff accounts allowed to manage all of it.

- **Backend**: ASP.NET Core (.NET 10) Web API, Dapper over SQL Server, JWT auth.
- **Frontend**: React + TypeScript, built with Vite.

## 1. Create the database

Requires SQL Server (e.g. SQL Server Express with a `SQLEXPRESS` instance).

Run `database/schema.sql` against your server using SQL Server Management
Studio, Azure Data Studio, or `sqlcmd`. It creates the `IdsPortal` database,
every table, foreign key and index.

No seed data is required. The API creates the first Admin login
automatically the first time it starts against an empty database (see
below).

## 2. Run the backend

```
cd backend
copy appsettings.Example.json appsettings.json    # first time only
dotnet build
dotnet run
```

Before running, open `backend/appsettings.json` and check:

- `ConnectionStrings:Default` matches your SQL Server instance.
- `Jwt:Key` is changed to your own long random secret (32+ characters).

`appsettings.json` is gitignored on purpose, since once you put a real
secret in it, it should never be committed. `appsettings.Example.json` is
the tracked template.

The API listens on `http://localhost:5000`.

**First login.** On first startup against a database with no Admin user yet,
the API creates one automatically and logs the credentials to the console:

```
Seeded first Admin account: admin@idsfintech.com / <20 random characters>
```

The password is generated at startup, printed once, and stored nowhere else -
it is not in the source and not in git, so each installation gets its own.
Copy it out of the console before you clear it. If you lose it, delete the
Admin row and restart to seed a new one.

Sign in with those, then use the Users page to create real accounts and
change this password (or deactivate/delete the seed account once you have
another Admin).

## 3. Run the frontend

```
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. It talks to the backend at
`http://localhost:5000/api` (see `src/api.ts`) - make sure the backend is
running first.

## Roles

- **Admin** - everything, including managing user accounts.
- **Editor** - create, edit and delete products, clients, deployments, team
  members and their related records.
- **Viewer** - read-only.

Every write endpoint checks the caller's role on the server, not just in the
UI. An Admin can never demote, deactivate or delete their own account.
