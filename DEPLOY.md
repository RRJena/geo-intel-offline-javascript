# Quick Deployment Guide

## Step 1: Create GitHub Repository

**Option 1: Using GitHub Web Interface**
1. Go to: https://github.com/new
2. Repository name: `geo-intel-offline-javascript`
3. Description: `Production-ready, offline geo-intelligence library for JavaScript/TypeScript`
4. Make it **Public**
5. **Don't** initialize with any files
6. Click "Create repository"

**Option 2: Using GitHub CLI** (if installed)
```bash
gh repo create geo-intel-offline-javascript --public --description "Production-ready, offline geo-intelligence library for JavaScript/TypeScript"
```

## Step 2: Push Code to GitHub

```bash
cd geo_intel_offline_java_script

# Initialize git (if not already)
git init
git branch -M main

# Add remote
git remote add origin https://github.com/RRJena/geo-intel-offline-javascript.git

# Add and commit
git add .
git commit -m "Initial commit: JavaScript/TypeScript version v1.0.3

- 100% accuracy across 258 countries
- Full TypeScript support
- Works in Node.js and browsers
- Comprehensive test coverage"

# Push
git push -u origin main
```

## Step 3: Create GitHub Release

1. Go to: https://github.com/RRJena/geo-intel-offline-javascript/releases/new
2. Tag: `v1.0.3`
3. Title: `v1.0.3 - Initial Release`
4. Description: (see DEPLOYMENT_GUIDE.md for template)
5. Publish release

## Step 4: Publish to npm

```bash
cd geo_intel_offline_java_script

# Login
npm login
# Username: rakesh_ranjan_jena_001
# Password: Prince@6234$

# Build
npm run build

# Publish
npm publish
```

## Step 5: Update Python Repo

```bash
cd /home/king/myWorkspace/geoIntelLib

# Commit .gitignore update
git add .gitignore
git commit -m "Exclude JavaScript library (now in separate repo)"
git push origin main
```

Done! ✅
