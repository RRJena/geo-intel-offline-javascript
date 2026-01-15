#!/bin/bash
# Script to publish to npm
# Run this manually after logging in: npm login

echo "=========================================="
echo "Publishing to npm"
echo "=========================================="
echo ""

# Check if logged in
if ! npm whoami >/dev/null 2>&1; then
    echo "⚠️  Not logged in to npm"
    echo "Please run: npm login"
    echo "Username: rakesh_ranjan_jena_001"
    echo "Password: Prince@6234$"
    exit 1
fi

echo "✅ Logged in as: $(npm whoami)"
echo ""

# Build
echo "Building package..."
npm run build

# Publish
echo ""
echo "Publishing to npm..."
npm publish

echo ""
echo "✅ Published to npm!"
echo "Package: https://www.npmjs.com/package/geo-intel-offline"
