#!/bin/bash
# Script to set up and push JavaScript library to new GitHub repository

set -e

REPO_NAME="geo-intel-offline-javascript"
GITHUB_USER="RRJena"
JS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PARENT_DIR="$(cd "$JS_DIR/.." && pwd)"

echo "=========================================="
echo "Setting up GitHub repository for JS library"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "$JS_DIR/package.json" ]; then
    echo "Error: package.json not found. Please run this script from the JS library directory."
    exit 1
fi

cd "$JS_DIR"

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git branch -M main
fi

# Check if remote already exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

# Add new remote
echo "Adding GitHub remote..."
git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

# Add all files
echo "Staging files..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "No changes to commit."
else
    echo "Committing changes..."
    git commit -m "Initial commit: JavaScript/TypeScript version of geo-intel-offline

- 100% accuracy across 258 countries
- Full TypeScript support
- Works in Node.js and browsers
- Comprehensive test coverage"
fi

# Push to GitHub
echo ""
echo "=========================================="
echo "Ready to push to GitHub"
echo "=========================================="
echo ""
echo "Repository: https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo ""
echo "To push, run:"
echo "  git push -u origin main"
echo ""
echo "Or if you need to force push (use with caution):"
echo "  git push -u origin main --force"
echo ""
read -p "Do you want to push now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Pushing to GitHub..."
    git push -u origin main
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "Repository URL: https://github.com/${GITHUB_USER}/${REPO_NAME}"
else
    echo "Skipping push. You can push manually later with:"
    echo "  git push -u origin main"
fi

echo ""
echo "=========================================="
echo "Next steps:"
echo "=========================================="
echo "1. Create a release on GitHub:"
echo "   - Go to: https://github.com/${GITHUB_USER}/${REPO_NAME}/releases/new"
echo "   - Tag: v1.0.3"
echo "   - Title: v1.0.3 - Initial Release"
echo "   - Description: Initial release of JavaScript/TypeScript version"
echo ""
echo "2. Publish to npm:"
echo "   cd $JS_DIR"
echo "   npm login"
echo "   npm publish"
echo ""
