#!/bin/bash

# Setup Git hooks for edge function validation

echo "🔧 Setting up Git hooks..."

# Create .husky directory if it doesn't exist
mkdir -p .husky

# Make pre-commit hook executable
chmod +x .husky/pre-commit

# Make validation script executable
chmod +x scripts/validate-edge-functions.ts

echo "✅ Git hooks configured successfully!"
echo ""
echo "The pre-commit hook will now:"
echo "  • Validate edge functions for deprecated Deno patterns"
echo "  • Block commits if deprecated imports are found"
echo ""
echo "To bypass the hook (not recommended):"
echo "  git commit --no-verify"
