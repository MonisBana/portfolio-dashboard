# Contributing

Thanks for taking a look at Portfolio Dashboard. This is a small, local-first
project, and contributions are welcome.

## Before you start

- Read the [README](README.md) for setup instructions.
- Read the [DISCLAIMER](DISCLAIMER.md) and [TERMS](TERMS.md), especially the
  sections about unofficial broker integrations.
- Never include real broker credentials, tokens, cookies, cURL commands, or
  personal portfolio exports in an issue, pull request, screenshot, or test
  fixture.

## Development workflow

```bash
# install dependencies
npm install
cd server && npm install && cd ..

# configure local environment
copy .env.example .env.local           # Windows
copy server\.env.example server\.env    # Windows
# cp .env.example .env.local && cp server/.env.example server/.env  # macOS/Linux

# run the frontend (http://127.0.0.1:3000)
npm run dev

# run the API in a second terminal (http://127.0.0.1:3001)
cd server
npm run start:dev
```

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
cd server && npm run build
```

## Code style

- Match the existing formatting and naming in the file you are editing.
- Prefer small, focused changes.
- Add or update tests when behavior changes.
- Keep broker credentials and personal data out of source, fixtures, logs, and
  screenshots.

## Commit messages

Use a short imperative subject line, for example:

```text
Fix Zerodha member restore after OAuth
Add cURL parsing for Vested headers
```

## Pull requests

- Describe the problem and the approach.
- Include screenshots for UI changes, using fake data.
- Link related issues.
- Note any new environment variables or broker behavior changes.

## Reporting security issues

Do not open a public issue for a security problem. Follow
[SECURITY.md](SECURITY.md) instead.

## License

By contributing, you agree that your contribution is licensed under the
[MIT License](LICENSE).
