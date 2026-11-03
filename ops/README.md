# Operations tools

The scripts in this directory are grouped by purpose:

- `dev/` — local development launcher and read-only environment checks.
- `academic/` — academic test fixtures, simulation helpers, and local runtime tools.
- `database/` — database checks, migrations, snapshots, and read-only queries.
- `release/` — release, staging, rollback, and security-operation tools.
- `deploy/` — local web-server and service configuration examples.

Most scripts are CLI-only and are not required for normal application use. Use
the commands documented in `README.md` and `docs/DEVELOPMENT.md` for local
development; do not run migration or release scripts against production
without the corresponding operational procedure.
