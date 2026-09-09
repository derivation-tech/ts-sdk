# Coding practices

Use TypeScript with explicit types and English identifiers and comments. Follow existing module boundaries and keep changes focused.

Run from the workspace root:

```sh
pnpm -C packages/viem-kit run format
pnpm -C packages/viem-kit run verify
```

Prettier owns formatting, including trailing whitespace, using the root `.prettierrc`. The package format commands cover source, tests, examples, scripts, configuration, and Markdown. `verify` includes the same format check, ESLint, type checks, tests, builds, and package consumer checks. ESLint checks code quality; formatting rules disabled by `eslint-config-prettier` are enforced by Prettier.

Add focused behavior tests in `tests/` for logic changes and keep compile-time fixtures for public typing guarantees. See [MIGRATION.md](./MIGRATION.md) for breaking API and behavior changes.
