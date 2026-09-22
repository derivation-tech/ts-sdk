# Coding practices

Use TypeScript with explicit types and English identifiers and comments. Follow
existing module boundaries and give each kit or workflow clear ownership of its
clients, metadata and transaction state.

Prettier owns formatting through the root `.prettierrc`; ESLint checks code quality.
The package format commands cover source, tests, examples, scripts, configuration,
root Markdown and nested usage guides.

Extend relevant behavior tests in `tests/` for logic changes and preserve positive
and negative compile-time fixtures for public APIs. Use the
[development guide](../../docs/development.md#validation) for commands, build
lifecycle and consumer checks. Document compatibility changes in
[MIGRATION.md](MIGRATION.md) and a changeset.
