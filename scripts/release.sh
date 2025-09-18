#!/bin/bash

# Simple release script for Milo
# Usage: ./scripts/release.sh v0.1.9

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="antoncoding"
REPO_NAME="milo"

if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a version${NC}"
    echo "Usage: ./scripts/release.sh v0.1.9"
    exit 1
fi

VERSION=$1
VERSION_CLEAN=${VERSION#v} # Remove 'v' prefix

echo -e "${BLUE}🚀 Starting release process for ${VERSION}${NC}"

# Step 1: Update version in files
echo -e "${YELLOW}📝 Updating version files...${NC}"

# Update Cargo.toml
sed -i '' "s/version = \".*\"/version = \"${VERSION_CLEAN}\"/" src-tauri/Cargo.toml

# Update package.json
if command -v jq &> /dev/null; then
    tmp=$(mktemp)
    jq ".version = \"${VERSION_CLEAN}\"" package.json > "$tmp" && mv "$tmp" package.json
else
    # Fallback method without jq
    sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION_CLEAN}\"/" package.json
fi

echo -e "${GREEN}✅ Version files updated${NC}"

# Step 2: Build the app
echo -e "${YELLOW}🔨 Building Tauri app...${NC}"

export TAURI_SIGNING_PRIVATE_KEY_PATH="$HOME/.tauri/milo.key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="test123"

if pnpm tauri build; then
    echo -e "${GREEN}✅ Build completed${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Step 3: Generate latest.json
echo -e "${YELLOW}📄 Generating latest.json...${NC}"

cat > latest.json << EOF
{
  "version": "${VERSION}",
  "notes": "Milo ${VERSION} - Bug fixes and improvements",
  "pub_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platforms": {
    "darwin-aarch64": {
      "signature": "SIGNATURE_FROM_BUILD_PROCESS_AARCH64",
      "url": "https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${VERSION}/Milo_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "SIGNATURE_FROM_BUILD_PROCESS_X64",
      "url": "https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${VERSION}/Milo_x64.app.tar.gz"
    }
  }
}
EOF

# Try to extract actual signatures
BUNDLE_DIR="src-tauri/target/release/bundle"
if [ -d "$BUNDLE_DIR" ]; then
    echo -e "${YELLOW}🔍 Looking for signature files...${NC}"

    # Find .sig files and extract signatures
    find "$BUNDLE_DIR" -name "*.sig" | while read -r sig_file; do
        signature=$(cat "$sig_file")
        filename=$(basename "$sig_file" .sig)

        echo -e "${BLUE}📝 Found signature for: $filename${NC}"

        # Update latest.json with actual signature
        # This is a simple approach - you might want to use jq for more robust JSON editing
        if [[ "$filename" == *"aarch64"* ]] || [[ "$filename" == *"arm64"* ]]; then
            sed -i '' "s/SIGNATURE_FROM_BUILD_PROCESS_AARCH64/$signature/" latest.json
        elif [[ "$filename" == *"x64"* ]] || [[ "$filename" == *"x86_64"* ]]; then
            sed -i '' "s/SIGNATURE_FROM_BUILD_PROCESS_X64/$signature/" latest.json
        fi
    done
fi

echo -e "${GREEN}✅ latest.json generated${NC}"

# Step 4: Show the result
echo -e "${BLUE}📋 Generated latest.json:${NC}"
cat latest.json

# Step 5: Commit and tag
echo ""
read -p "$(echo -e ${YELLOW}❓ Commit changes and create tag? [y/N]: ${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📦 Committing and tagging...${NC}"

    git add .
    git commit -m "chore: release ${VERSION}"
    git tag "$VERSION"

    echo -e "${GREEN}✅ Changes committed and tagged${NC}"
    echo -e "${BLUE}🚀 To publish: git push origin main && git push origin ${VERSION}${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping git operations${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Release preparation complete!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review the generated latest.json"
echo "2. Push to GitHub: git push origin main && git push origin ${VERSION}"
echo "3. Create GitHub release with the built artifacts"
echo "4. The app will automatically detect the update!"