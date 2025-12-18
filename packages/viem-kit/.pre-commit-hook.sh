#!/bin/bash
# Pre-commit hook to prevent trailing spaces
# This ensures our coding practice of no trailing spaces is enforced

echo "Checking for trailing spaces..."

# Check for trailing spaces in staged files
files_with_trailing_spaces=$(git diff --cached --name-only | grep -E '\.(ts|js|json|md)$' | xargs grep -l '[[:space:]]$' 2>/dev/null || true)

if [ -n "$files_with_trailing_spaces" ]; then
    echo "❌ Error: Files with trailing spaces detected:"
    echo "$files_with_trailing_spaces"
    echo ""
    echo "Please remove trailing spaces and commit again."
    echo "You can run: find . -type f \\( -name \"*.ts\" -o -name \"*.js\" -o -name \"*.json\" -o -name \"*.md\" \\) -exec sed -i '' -e 's/[[:space:]]*$//' {} \\;"
    exit 1
fi

echo "✅ No trailing spaces found. Proceeding with commit."
exit 0
