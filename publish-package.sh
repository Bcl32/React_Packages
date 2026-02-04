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

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}"
echo ""

# Step 1: Build the package
echo -e "${YELLOW}Step 1/2: Building package...${NC}"
pnpm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 2: Publish to GitHub Package Registry
echo -e "${YELLOW}Step 2/2: Publishing to GitHub Package Registry...${NC}"
pnpm publish --no-git-checks
echo -e "${GREEN}✓ Package published successfully${NC}"
echo ""

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Publication Complete${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${GREEN}Package:${NC} @bcl32/$PACKAGE_NAME"
echo -e "${GREEN}Version:${NC} $CURRENT_VERSION"
echo ""
echo -e "Install with:"
echo -e "  ${YELLOW}npm install @bcl32/$PACKAGE_NAME@^$CURRENT_VERSION${NC}"
