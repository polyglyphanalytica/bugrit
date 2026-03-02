# Contributing to Bugrit

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your credentials
4. Start the dev server: `npm run dev`

## Before Submitting a PR

Run the full check suite:

```bash
npm run typecheck && npm run lint && npm run test
```

All three must pass before your PR will be reviewed.

## Commit Messages

- Use imperative mood ("Add feature" not "Added feature")
- Keep the summary line concise (under 72 characters)
- Add detail in the commit body when needed

## Code Style

- TypeScript strict mode - no `any` unless absolutely necessary
- Follow existing patterns in the codebase
- Tests live alongside source files as `*.test.ts` / `*.test.tsx`
- Prefer editing existing files over creating new ones

## Security

- **Never commit secrets** - all sensitive values go in environment variables
- Run `npm audit` periodically to check for dependency vulnerabilities
- If you discover a security vulnerability, do **not** open a public issue. Email security@buggered.app instead. See [SECURITY.md](SECURITY.md) for details.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
