#!/bin/bash

# Publish React Package Script
# Usage: ./publish-package.sh <package-name>
# Example: ./publish-package.sh filters

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if package name provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No package name provided${NC}"
    echo "Usage: $0 <package-name>"
    echo ""
    echo "Available packages:"
    ls -d */ | sed 's#/##' | grep -v node_modules
    exit 1
fi

PACKAGE_NAME="$1"
PACKAGE_DIR="$(pwd)/$PACKAGE_NAME"

# Check if package directory exists
if [ ! -d "$PACKAGE_DIR" ]; then
    echo -e "${RED}Error: Package directory '$PACKAGE_DIR' not found${NC}"
    echo ""
    echo "Available packages:"
    ls -d */ | sed 's#/##' | grep -v node_modules
    exit 1
fi

# Load GitHub token from .env file
ENV_FILE="$(pwd)/.env"
if [ ! -f "$ENV_FILE" ]; then
    # Try parent directory
    ENV_FILE="$(dirname $(pwd))/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Looked in:"
    echo "  - $(pwd)/.env"
    echo "  - $(dirname $(pwd))/.env"
    echo ""
    echo "Please create a .env file with:"
    echo "GITHUB_TOKEN=your_token_here"
    exit 1
fi

# Source the .env file
set -a  # automatically export all variables
source "$ENV_FILE"
set +a

# Verify GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}Error: GITHUB_TOKEN not found in .env file${NC}"
    echo "Please add GITHUB_TOKEN=your_token_here to $ENV_FILE"
    exit 1
fi

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Publishing Package: $PACKAGE_NAME${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

cd "$PACKAGE_DIR"

# Check for clean working tree
if [ -n "$(git -C "$PACKAGE_DIR" status --porcelain)" ]; then
    echo -e "${RED}Error: Working tree is not clean. Commit or stash changes before publishing.${NC}"
    git -C "$PACKAGE_DIR" status --short
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
TAG_NAME="@bcl32/${PACKAGE_NAME}@${CURRENT_VERSION}"
echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}"
echo ""

# Step 1: Build the package
echo -e "${YELLOW}Step 1/3: Building package...${NC}"
pnpm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 2: Publish to GitHub Package Registry
echo -e "${YELLOW}Step 2/3: Publishing to GitHub Package Registry...${NC}"
pnpm publish
echo -e "${GREEN}✓ Package published successfully${NC}"
echo ""

# Step 3: Tag the commit in Git
echo -e "${YELLOW}Step 3/3: Creating Git tag...${NC}"
if git -C "$PACKAGE_DIR" tag "$TAG_NAME" 2>/dev/null; then
    echo -e "${GREEN}✓ Tagged as $TAG_NAME${NC}"
    git -C "$PACKAGE_DIR" push origin "$TAG_NAME"
    echo -e "${GREEN}✓ Pushed tag to remote${NC}"
else
    echo -e "${YELLOW}⚠ Tag $TAG_NAME already exists — skipping${NC}"
fi
echo ""

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Publication Complete${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${GREEN}Package:${NC} @bcl32/$PACKAGE_NAME"
echo -e "${GREEN}Version:${NC} $CURRENT_VERSION"
echo -e "${GREEN}Git Tag:${NC} $TAG_NAME"
echo ""
echo -e "Install with:"
echo -e "  ${YELLOW}npm install @bcl32/$PACKAGE_NAME@^$CURRENT_VERSION${NC}"
