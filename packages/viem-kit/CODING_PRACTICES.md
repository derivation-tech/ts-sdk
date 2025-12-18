# Coding Practices

This document outlines the coding practices and standards for the `viem-kit` library.

## No Trailing Spaces Rule

**All code must not contain trailing spaces.** This is a strict coding practice rule enforced across the entire codebase.

### Why This Matters

- **Clean diffs**: Trailing spaces create unnecessary changes in version control
- **Consistency**: Ensures uniform code formatting across the team
- **Readability**: Prevents invisible characters that can cause confusion
- **Best practice**: Industry standard for clean, maintainable code

### Enforcement Tools

#### 1. ESLint Rule

```javascript
// eslint.config.js
{
    rules: {
        'no-trailing-spaces': 'error',
    }
}
```

#### 2. Prettier Configuration

Prettier automatically removes trailing spaces by default. Our `.prettierrc` configuration ensures this behavior.

#### 3. Pre-commit Hook

The `.pre-commit-hook.sh` script prevents commits with trailing spaces:

```bash
# Install the pre-commit hook
cp .pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

#### 4. NPM Scripts

```bash
# Check for trailing spaces
npm run check-trailing-spaces

# Remove trailing spaces
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) -exec sed -i '' -e 's/[[:space:]]*$//' {} \;
```

### IDE Setup

Configure your editor to show trailing spaces and remove them on save:

#### VS Code

```json
{
    "files.trimTrailingWhitespace": true,
    "editor.renderWhitespace": "boundary"
}
```

#### IntelliJ/WebStorm

- Settings → Editor → General → Appearance → Show whitespaces
- Settings → Editor → General → On Save → Remove trailing spaces

### Violation Handling

If trailing spaces are detected:

1. **Pre-commit hook** will block the commit
2. **ESLint** will report an error
3. **CI/CD** will fail the build

### Quick Fix

To remove all trailing spaces from the codebase:

```bash
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) -exec sed -i '' -e 's/[[:space:]]*$//' {} \;
```

## Other Coding Standards

### TypeScript

- Use strict type checking
- Prefer `type` over `interface` for simple type definitions
- Use `const` assertions where appropriate
- Avoid `any` type unless absolutely necessary

### Code Formatting

- Use Prettier for consistent formatting
- 4-space indentation
- Single quotes for strings
- Trailing commas in ES5 style
- Arrow function parentheses always

### File Organization

- Group imports: external libraries, internal modules, types
- Export types and interfaces separately from implementations
- Use barrel exports (`index.ts`) for clean imports

### Error Handling

- Always handle errors explicitly
- Use meaningful error messages
- Log errors with context
- Provide fallback mechanisms where appropriate

### Documentation

- Document all public APIs
- Use JSDoc comments for complex functions
- Keep README.md updated
- Include usage examples

## Enforcement

These practices are enforced through:

1. **ESLint configuration** with strict rules
2. **Prettier formatting** for consistent style
3. **Pre-commit hooks** for immediate feedback
4. **CI/CD pipeline** for automated checks
5. **Code review** process for manual verification

## Contributing

When contributing to this project:

1. Follow all coding practices outlined here
2. Run `npm run check-trailing-spaces` before committing
3. Ensure ESLint passes: `npm run lint`
4. Format code: `npm run format`
5. Test your changes thoroughly
6. Update documentation as needed

## Questions?

If you have questions about these coding practices, please:

1. Check this document first
2. Review existing code examples
3. Ask in code review comments
4. Open an issue for clarification
