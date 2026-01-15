#!/bin/bash
#
# Copy data files from Python version to JavaScript version
# This script copies the compressed data files needed for the JS library
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
JS_DIR="$SCRIPT_DIR/.."
PYTHON_DATA_DIR="$PROJECT_ROOT/geo_intel_offline/data"
JS_DATA_DIR="$JS_DIR/data"

echo "Copying data files from Python version to JavaScript version..."
echo ""

# Check if Python data directory exists
if [ ! -d "$PYTHON_DATA_DIR" ]; then
    echo "Error: Python data directory not found: $PYTHON_DATA_DIR"
    echo "Please ensure the Python version has been built and data files exist."
    exit 1
fi

# Create JS data directory if it doesn't exist
mkdir -p "$JS_DATA_DIR"

# Copy data files
echo "Copying geohash_index.json.gz..."
cp "$PYTHON_DATA_DIR/geohash_index.json.gz" "$JS_DATA_DIR/" || {
    echo "Warning: geohash_index.json.gz not found, trying uncompressed version..."
    if [ -f "$PYTHON_DATA_DIR/geohash_index.json" ]; then
        cp "$PYTHON_DATA_DIR/geohash_index.json" "$JS_DATA_DIR/"
    else
        echo "Error: geohash_index.json not found"
        exit 1
    fi
}

echo "Copying polygons.json.gz..."
cp "$PYTHON_DATA_DIR/polygons.json.gz" "$JS_DATA_DIR/" || {
    echo "Warning: polygons.json.gz not found, trying uncompressed version..."
    if [ -f "$PYTHON_DATA_DIR/polygons.json" ]; then
        cp "$PYTHON_DATA_DIR/polygons.json" "$JS_DATA_DIR/"
    else
        echo "Error: polygons.json not found"
        exit 1
    fi
}

echo "Copying metadata.json.gz..."
cp "$PYTHON_DATA_DIR/metadata.json.gz" "$JS_DATA_DIR/" || {
    echo "Warning: metadata.json.gz not found, trying uncompressed version..."
    if [ -f "$PYTHON_DATA_DIR/metadata.json" ]; then
        cp "$PYTHON_DATA_DIR/metadata.json" "$JS_DATA_DIR/"
    else
        echo "Error: metadata.json not found"
        exit 1
    fi
}

echo ""
echo "✅ Data files copied successfully!"
echo ""
echo "Data files are now in: $JS_DATA_DIR"
echo ""
echo "File sizes:"
ls -lh "$JS_DATA_DIR"/*.json* 2>/dev/null | awk '{print $9, $5}' || echo "No files found"
