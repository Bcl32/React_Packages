#!/bin/bash
# Build and publish all @Bcl32 packages to GitHub Package Registry
# Uses pnpm (this is a pnpm workspace project)

# Don't use set -e so we can handle errors gracefully and show summary
set -u

echo "🚀 Building and publishing all @Bcl32 packages"
echo "=============================================="
echo ""

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load GITHUB_TOKEN from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "📄 Loading environment from .env file..."
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | grep GITHUB_TOKEN | xargs)
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN is not set"
    echo "   Either:"
    echo "   1. Create a .env file in react-packages/ with: GITHUB_TOKEN=your_token"
    echo "   2. Or set it with: export GITHUB_TOKEN=your_token"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed"
    echo "   Install it with: npm install -g pnpm"
    exit 1
fi

MONOREPO_ROOT="$(dirname "$SCRIPT_DIR")"

# First, install all workspace dependencies from the monorepo root
echo "📦 Installing workspace dependencies..."
cd "$MONOREPO_ROOT"
if ! pnpm install; then
    echo "❌ Failed to install workspace dependencies"
    exit 1
fi

# List of packages to build and publish (in dependency order)
PACKAGES=(
    "utils"
    "data-utils"
    "themes"
    "hooks"
    "filters"
    "datatable"
    "forms"
    "charts"
    "navigation"
)

# Track results
SUCCESS=()
FAILED=()
SKIPPED=()

for pkg in "${PACKAGES[@]}"; do
    echo ""
    echo "📦 Processing: @Bcl32/$pkg"
    echo "-------------------------------------------"

    cd "$SCRIPT_DIR/$pkg"

    # Get local version
    local_version=$(node -p "require('./package.json').version")
    pkg_name=$(node -p "require('./package.json').name")

    echo "   Local version: $local_version"

    # Check if this version already exists in GitHub Package Registry
    echo "   Checking GitHub registry for existing version..."
    if npm view "$pkg_name@$local_version" version --registry=https://npm.pkg.github.com 2>/dev/null; then
        echo "   ⏭️  Version $local_version already published - skipping"
        SKIPPED+=("$pkg")
        continue
    fi

    # Build the package
    echo "   Building package..."
    if pnpm run build; then
        echo "   ✅ Build successful"
    else
        echo "   ❌ Build failed"
        FAILED+=("$pkg")
        continue
    fi

    # Publish to GitHub Package Registry
    echo "   Publishing to GitHub Package Registry..."
    publish_output=$(pnpm publish --no-git-checks 2>&1)
    publish_exit_code=$?

    if [ $publish_exit_code -eq 0 ]; then
        echo "   ✅ Published successfully"
        SUCCESS+=("$pkg")
    elif echo "$publish_output" | grep -q "EPUBLISHCONFLICT\|Cannot publish over existing version"; then
        echo "   ⏭️  Version already exists - skipping"
        SKIPPED+=("$pkg")
    else
        echo "   ❌ Publish failed"
        echo "$publish_output" | tail -5
        FAILED+=("$pkg")
    fi
done

echo ""
echo "=============================================="
echo "📊 Summary"
echo "=============================================="
echo ""

if [ ${#SUCCESS[@]} -gt 0 ]; then
    echo "✅ Successfully published (${#SUCCESS[@]}):"
    for pkg in "${SUCCESS[@]}"; do
        echo "   - @Bcl32/$pkg"
    done
fi

if [ ${#SKIPPED[@]} -gt 0 ]; then
    echo ""
    echo "⏭️  Skipped - already published (${#SKIPPED[@]}):"
    for pkg in "${SKIPPED[@]}"; do
        echo "   - @Bcl32/$pkg"
    done
fi

if [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo "❌ Failed (${#FAILED[@]}):"
    for pkg in "${FAILED[@]}"; do
        echo "   - @Bcl32/$pkg"
    done
    echo ""
    echo "💡 Tips for failed packages:"
    echo "   - Bump version in package.json if needed"
    echo "   - Check for build errors in the package"
    echo "   - Verify GITHUB_TOKEN has write:packages permission"
    exit 1
fi

echo ""
echo "Done!"
