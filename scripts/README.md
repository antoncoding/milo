# Milo Release Scripts

Automated scripts to handle releases and update the `latest.json` file for Tauri auto-updates.

## 🚀 Quick Release

### Method 1: JavaScript Script (Recommended)
```bash
pnpm release v0.1.9
```

### Method 2: Shell Script
```bash
pnpm run release:shell v0.1.9
```

### Method 3: Direct Script Execution
```bash
# JavaScript version
node scripts/update-latest.js v0.1.9

# Shell version
./scripts/release.sh v0.1.9
```

## 📋 What These Scripts Do

1. **Update version files** (`Cargo.toml`, `package.json`)
2. **Build the Tauri app** with signatures
3. **Extract signatures** from build artifacts
4. **Generate `latest.json`** with proper format
5. **Commit and tag** (optional)

## 🎯 Complete Release Workflow

```bash
# 1. Run the release script
pnpm release v0.1.9

# 2. Review the generated latest.json

# 3. Push to GitHub
git push origin main
git push origin v0.1.9

# 4. Create GitHub release
# - Go to GitHub → Releases → Create new release
# - Upload the built .dmg/.app.tar.gz files
# - The auto-updater will automatically detect new version!
```

## 📄 Generated latest.json Format

```json
{
  "version": "v0.1.9",
  "notes": "Milo v0.1.9 - Bug fixes and improvements",
  "pub_date": "2025-01-18T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://github.com/antoncoding/milo/releases/download/v0.1.9/Milo_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://github.com/antoncoding/milo/releases/download/v0.1.9/Milo_x64.app.tar.gz"
    }
  }
}
```

## 🔧 Configuration

The scripts are pre-configured for:
- **Repository**: `antoncoding/milo`
- **Signing key**: `~/.tauri/milo.key`
- **Key password**: `test123`
- **Endpoint**: `https://raw.githubusercontent.com/antoncoding/milo/main/latest.json`

## ⚠️ Notes

- Make sure you have the signing key at `~/.tauri/milo.key`
- The scripts will automatically extract signatures from build artifacts
- If signature extraction fails, template signatures are created for manual completion
- Always review the generated `latest.json` before pushing
- The auto-updater in your app will check this file on startup

## 🐛 Troubleshooting

### Build fails
- Ensure `~/.tauri/milo.key` exists
- Check that the key password is correct
- Verify all dependencies are installed (`pnpm install`)

### Signatures not found
- Check `src-tauri/target/release/bundle/` for `.sig` files
- Manual signatures can be added to the generated `latest.json`

### Auto-update not working
- Verify `latest.json` is accessible at the configured endpoint
- Check the version format matches (must be higher than current)
- Ensure the download URLs are accessible