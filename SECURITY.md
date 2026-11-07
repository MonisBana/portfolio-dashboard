# Security Policy

## Supported versions

This project is pre-1.0 and maintained on a best-effort basis. Security fixes
are applied to the latest commit on the default branch.

## Reporting a vulnerability

Please report security issues privately. Do not open a public issue, and do not
include real credentials, tokens, cookies, or portfolio data in any report.

Preferred route:

1. Use GitHub's **Report a vulnerability** / private security advisory feature
   for this repository.
2. If advisories are not available, contact the maintainer through the contact
   method listed on their GitHub profile.

Please include:

- a description of the issue and its impact;
- steps to reproduce;
- affected version or commit;
- any suggested fix.

You can expect an acknowledgement within a few days. Please allow time for a
fix before public disclosure.

## Scope

Security-relevant areas include:

- exposure of broker API keys, access tokens, cookies, or cURL headers;
- logging of secrets or full broker responses;
- the unauthenticated local API being reachable from other machines;
- unsafe parsing of pasted headers, cURL commands, or spreadsheet files;
- dependency vulnerabilities;
- cross-site scripting or request forgery in the frontend.

## Local-only by design

The API has no authentication and is intended to run on `127.0.0.1`. If you
expose it to a LAN or the internet, you are responsible for adding
authentication, TLS, and access controls. Reports that require an intentionally
publicly exposed, unauthenticated instance may be treated as configuration
issues rather than vulnerabilities.

## Secrets in the repository

If you find a credential in the repository or its history, report it privately
and rotate it immediately. Do not paste the value into an issue.
