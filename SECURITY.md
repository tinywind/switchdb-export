# Security Policy

## Supported Versions

Security fixes are applied on `main` for the `1.0.x` release of `switchdb-export`.

| Version | Supported |
| ------- | --------- |
| `1.0.x` (`main`) | Yes |
| `< 1.0.0` | No |

Supported runtime environment is Node.js 18 or newer.

## Reporting a Vulnerability

Please do **not** report undisclosed security vulnerabilities through public GitHub issues, pull requests, or discussions.

Use GitHub's [private vulnerability reporting](https://github.com/tinywind/switchdb-export/security/advisories/new) for this repository to submit a report confidentially. If you cannot use GitHub Security Advisories, contact the maintainer directly at `tinywind0@gmail.com`.

When reporting an issue, please include as much of the following as possible:

- Commit SHA or version (`package.json`) and Node.js version
- Affected area (`igdb-switch-exporter.js`, CSV sanitization/escaping, `.env` handling, or dependencies)
- A minimal reproduction or proof of concept (never include real Twitch/IGDB Client IDs or Client Secrets)
- Description of the potential impact and any suggested mitigation

## Response Process

- We aim to acknowledge receipt of a vulnerability report within 7 days.
- Validated issues are tracked privately through a GitHub Security Advisory while a fix is prepared and verified.
- Once a patch is available on `main`, we will publish the advisory and credit reporters who wish to be acknowledged.

## Scope and Security Model Notes

`switchdb-export` is a local Node.js CLI exporter that authenticates with Twitch OAuth using local `.env` credentials (`IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`), fetches Nintendo Switch metadata from the IGDB API, and writes a CSV file (`OUTPUT_FILE`).

### In scope

- CSV / formula injection or improper quoting when exporting untrusted upstream game titles or metadata to CSV
- Path traversal or unexpected file writes via `OUTPUT_FILE` or output handling in `igdb-switch-exporter.js`
- Credential exposure (leaking `IGDB_CLIENT_SECRET` or OAuth bearer tokens in logs or error messages)
- Vulnerabilities in runtime dependencies (`dotenv`) affecting `main`

### Out of scope

- Compromise of the user's local `.env` file or host environment
- Upstream availability or data accuracy of the Twitch / IGDB APIs
