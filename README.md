# IDS Fintech - Products Portal

An internal portal for IDS Fintech staff. It records every product the company
builds and shows which clients use which products, at which versions, in which
environments, and who on the team is responsible for each one. Instead of that
information living in scattered spreadsheets and people's memory, it sits in one
place that staff can search, filter and keep up to date.

## Tech stack

- React + TypeScript, built with Vite
- .NET 10 Web API
- Dapper
- SQL Server
- JWT authentication

## Prerequisites

- .NET 10 SDK
- Node.js
- SQL Server Express
- SQL Server Management Studio (SSMS)

## 1. Database setup

Pick one of the two options below. You do not need both.

### Option A - Restore the backup (includes sample data)

Restore `database/IdsPortal.bak` in SQL Server Management Studio:

1. Right-click **Databases**.
2. Choose **Restore Database**.
3. Select **Device** as the source.
4. Browse to the `.bak` file and confirm.

This option comes with sample data, so the portal is already populated the
first time you run it.

Note: the `.bak` file is in the handover zip, not in this repository. It is too
large to commit, so it is excluded in `.gitignore`.

### Option B - Run the schema (empty database)

Open `database/schema.sql` in SSMS and run it. This creates the `IdsPortal`
database and all ten tables, with their keys and indexes, but no rows. The
portal will start up empty and you add records through the UI.

## 2. Backend setup

Copy the example configuration and fill it in:

```
cd backend
copy appsettings.Example.json appsettings.json
```

Open `backend/appsettings.json` and set:

- `ConnectionStrings:Default` - your SQL Server instance and the `IdsPortal`
  database.
- `Jwt:Key` - your own long random secret, at least 32 characters.

Then start the API:

```
dotnet run
```

The backend listens on `http://localhost:5000`.

`appsettings.json` is gitignored and is never committed, because it holds the
real connection string and signing key. `appsettings.Example.json` is the
tracked template. If `appsettings.json` is missing, the API stops at startup
and tells you which setting it could not find.

## 3. Frontend setup

```
cd frontend
npm install
npm run dev
```

The frontend opens on `http://localhost:5173` and calls the API at
`http://localhost:5000/api`.

The backend and the frontend must both be running at the same time. Start the
backend first.

## First login

On a database that has no Admin account yet, the API creates one when it starts
and prints the credentials to the console:

```
Seeded first Admin account: admin@idsfintech.com / <20 random characters>
```

The password is generated at startup and printed once. It is not stored in the
source or in git, so every installation gets a different one. Copy it out of the
console before you clear it. If you lose it, delete the Admin row and restart to
seed a new one.

Sign in with those credentials, then use the Users page to create real accounts
and change or remove the seeded one.

## Roles

- **Admin** - everything, including managing user accounts.
- **Editor** - create, update and delete records.
- **Viewer** - read only.

Role checks are enforced on the server on every write endpoint, not just by
hiding buttons in the UI. Hiding a button keeps the interface clean; it is the
server that actually refuses the request.

## Security

- Passwords are hashed with BCrypt. The plain password is never stored.
- The JWT is validated on every protected route, including issuer, audience,
  signature and expiry.
- All SQL is parameterised, so values from the UI are never concatenated into a
  query.
- No column anywhere in the database can hold a server password, database
  password, API token or private key. Environments store only an access
  reference: a pointer to where access is requested, such as a ticket queue or a
  team to ask.

## Common problems

| Problem | Cause | Fix |
| --- | --- | --- |
| Frontend opens on port 5174 | Something is already using 5173, so Vite picks the next free port. The backend only allows `http://localhost:5173`, so every API call is blocked. | Stop whatever is holding 5173 and restart `npm run dev`, or set `Cors:FrontendOrigin` in `appsettings.json` to the port actually in use. |
| Build fails saying the file is locked | `backend.exe` is still running, so the build cannot overwrite it. | Stop the running backend, then build again. |
| 401 on login | The email or password is wrong, or the account has been deactivated. | Check the credentials. For a fresh database, use the seeded Admin printed in the backend console. |
| CORS errors in the browser console | `Cors:FrontendOrigin` does not exactly match the address the frontend is served from. | Make the two match exactly, including the port, then restart the backend. |
