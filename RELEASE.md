# 🚀 Release Guide

Complete guide for releasing new versions of Milo with auto-updates.

## Quick Release

```bash
# 1. Export signing key
export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/milo.key)

# 2. Run automated release
pnpm release v0.1.13

# 3. Push to GitHub
git push origin master && git push origin v0.1.13

# 4. Create GitHub release and upload files (see below)
```

## 📁 File Locations After Build

After running `pnpm release v0.1.13`, you'll find these files:

### **For User Downloads:**
```
src-tauri/target/release/bundle/dmg/
└── Milo_0.1.13_x64.dmg
```

### **For Auto-Updates:**
```
src-tauri/target/release/bundle/macos/
├── Milo.app.tar.gz
└── Milo.app.tar.gz.sig
```

### **Update Manifest:**
```
project-root/
└── latest.json
```

## 📤 GitHub Release Upload

Create a new release on GitHub and upload these files:

1. **`Milo_0.1.13_x64.dmg`** (from `/dmg/` folder)
   - For users to download and install

2. **`Milo.app.tar.gz`** (from `/macos/` folder)
   - For automatic updates

3. **`latest.json`** (from project root)
   - Update manifest (tells app about new version)

## 🔐 First Time Setup

### Generate Signing Key (Once)
```bash
pnpm tauri signer generate -w ~/.tauri/milo.key --password test123
```

### Back Up Your Key
**CRITICAL:** Store these securely in your password manager:
- File: `~/.tauri/milo.key`
- Password: `test123`
- Note: "Required for Milo app updates. If lost, cannot release updates."

## 🎯 What Each Script Does

### `pnpm release v0.1.13`
1. ✅ **Validates signing key** setup
2. ✅ **Updates versions** in `Cargo.toml`, `package.json`, `tauri.conf.json`
3. ✅ **Builds app** with cryptographic signatures
4. ✅ **Extracts signatures** from build artifacts
5. ✅ **Generates latest.json** with update information
6. ✅ **Commits and tags** (optional)

## 🔍 Troubleshooting

### "Signing key not found"
```bash
# Generate new key
pnpm tauri signer generate -w ~/.tauri/milo.key --password test123
```

### "Environment variables not set"
```bash
# Set signing key
export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/milo.key)
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="test123"
```

### "Build failed"
- Ensure all dependencies installed: `pnpm install`
- Check Rust toolchain: `rustup update`
- Verify key permissions: `ls -la ~/.tauri/milo.key`

### "No signature files found"
- Build completed but signatures missing
- Manual signatures will be created in `latest.json`
- Check that `createUpdaterArtifacts: true` in `tauri.conf.json`

## 🎉 Auto-Update Flow

1. **User has** Milo v0.1.12 installed
2. **You release** v0.1.13 using this process
3. **App checks** `latest.json` on startup
4. **Shows update** notification if newer version found
5. **Downloads** `Milo.app.tar.gz` automatically
6. **Installs** and restarts with new version

## 📋 Release Checklist

- [ ] Signing key backed up securely
- [ ] Environment variables set
- [ ] Version number follows semantic versioning
- [ ] Run `pnpm release vX.X.X`
- [ ] Review generated `latest.json`
- [ ] Push to GitHub: `git push origin master && git push origin vX.X.X`
- [ ] Create GitHub release
- [ ] Upload DMG file from `/dmg/` folder
- [ ] Upload `Milo.app.tar.gz` from `/macos/` folder
- [ ] Upload `latest.json` from project root
- [ ] Test auto-update on previous version

## 🤖 Alternative: Automated Releases

For fully automated releases, set up GitHub Actions with:
- `TAURI_SIGNING_PRIVATE_KEY` (base64 encoded key)
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Then releases happen automatically on git tag push!