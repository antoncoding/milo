#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Automated script to update latest.json for Tauri app releases
 * Usage: node scripts/update-latest.js [version]
 * Example: node scripts/update-latest.js v0.1.9
 */

// Configuration
const REPO_OWNER = 'antoncoding';
const REPO_NAME = 'milo';
const BRANCH = 'master'; // Updated to match tauri.conf.json
const GITHUB_RELEASES_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download`;

// File paths
const CARGO_TOML_PATH = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const TAURI_CONF_PATH = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const LATEST_JSON_PATH = path.join(__dirname, '..', 'latest.json');

function getCurrentVersion() {
  const cargoToml = fs.readFileSync(CARGO_TOML_PATH, 'utf8');
  const match = cargoToml.match(/version = "(.+)"/);
  return match ? match[1] : null;
}

function updateVersionFiles(version) {
  console.log(`📝 Updating version to ${version}...`);

  // Update Cargo.toml
  let cargoToml = fs.readFileSync(CARGO_TOML_PATH, 'utf8');
  cargoToml = cargoToml.replace(/version = ".+"/, `version = "${version}"`);
  fs.writeFileSync(CARGO_TOML_PATH, cargoToml);

  // Update package.json
  let packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');

  // Update tauri.conf.json
  let tauriConf = JSON.parse(fs.readFileSync(TAURI_CONF_PATH, 'utf8'));
  tauriConf.version = version;
  fs.writeFileSync(TAURI_CONF_PATH, JSON.stringify(tauriConf, null, 2) + '\n');

  console.log('✅ Version files updated (Cargo.toml, package.json, tauri.conf.json)');
}

function buildApp() {
  console.log('🔨 Building Tauri app with signatures...');
  try {
    // Set environment variables for signing
    process.env.TAURI_SIGNING_PRIVATE_KEY_PATH = path.join(process.env.HOME, '.tauri', 'milo.key');
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = 'test123';

    execSync('pnpm tauri build', {
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Build completed');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

function extractSignatures(version) {
  console.log('🔍 Extracting signatures from build artifacts...');

  const bundleDir = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'bundle');
  const signatures = {};

  try {
    // Look for .sig files
    const findSigFiles = (dir) => {
      if (!fs.existsSync(dir)) return [];

      const files = fs.readdirSync(dir, { recursive: true });
      return files.filter(file => file.endsWith('.sig')).map(file => path.join(dir, file));
    };

    const sigFiles = findSigFiles(bundleDir);

    if (sigFiles.length > 0) {
      // For now, we assume single architecture build (most common)
      // and use the same .app.tar.gz file for both platform entries
      const signature = fs.readFileSync(sigFiles[0], 'utf8').trim();

      // Use the actual Tauri-generated filename
      const downloadUrl = `${GITHUB_RELEASES_BASE}/v${version}/Milo.app.tar.gz`;

      // Add both architectures pointing to the same universal file
      signatures['darwin-aarch64'] = {
        signature,
        url: downloadUrl
      };

      signatures['darwin-x86_64'] = {
        signature,
        url: downloadUrl
      };

      console.log(`✅ Using signature from: ${path.basename(sigFiles[0])}`);
    }

    if (Object.keys(signatures).length === 0) {
      console.warn('⚠️  No signature files found. Creating template structure...');
      // Create template structure for manual completion
      signatures['darwin-aarch64'] = {
        signature: 'SIGNATURE_FROM_BUILD_PROCESS_AARCH64',
        url: `${GITHUB_RELEASES_BASE}/v${version}/Milo.app.tar.gz`
      };
      signatures['darwin-x86_64'] = {
        signature: 'SIGNATURE_FROM_BUILD_PROCESS_X64',
        url: `${GITHUB_RELEASES_BASE}/v${version}/Milo.app.tar.gz`
      };
    }

    console.log('✅ Signatures extracted:', Object.keys(signatures));
    return signatures;
  } catch (error) {
    console.error('❌ Failed to extract signatures:', error.message);
    console.log('📝 Creating template signatures for manual completion...');

    return {
      'darwin-aarch64': {
        signature: 'SIGNATURE_FROM_BUILD_PROCESS_AARCH64',
        url: `${GITHUB_RELEASES_BASE}/v${version}/Milo.app.tar.gz`
      },
      'darwin-x86_64': {
        signature: 'SIGNATURE_FROM_BUILD_PROCESS_X64',
        url: `${GITHUB_RELEASES_BASE}/v${version}/Milo.app.tar.gz`
      }
    };
  }
}

function generateLatestJson(version, signatures) {
  console.log('📄 Generating latest.json...');

  const latestJson = {
    version: `v${version}`,
    notes: `Milo v${version} - Bug fixes and improvements`,
    pub_date: new Date().toISOString(),
    platforms: signatures
  };

  fs.writeFileSync(LATEST_JSON_PATH, JSON.stringify(latestJson, null, 2) + '\n');
  console.log('✅ latest.json generated');

  return latestJson;
}

function commitAndTag(version) {
  console.log('📦 Committing changes and creating tag...');

  try {
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "chore: release v${version}"`, { stdio: 'inherit' });
    execSync(`git tag v${version}`, { stdio: 'inherit' });

    console.log('✅ Changes committed and tagged');
    console.log(`🚀 To publish: git push origin main && git push origin v${version}`);
  } catch (error) {
    console.error('❌ Git operations failed:', error.message);
    console.log('⚠️  You may need to commit and tag manually');
  }
}

function checkSigningKey() {
  console.log('🔐 Checking signing key setup...');

  const keyPath = path.join(process.env.HOME, '.tauri', 'milo.key');
  const envKey = process.env.TAURI_SIGNING_PRIVATE_KEY;
  const envPassword = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;

  // Check if key file exists
  if (!fs.existsSync(keyPath)) {
    console.error('❌ Signing key not found at ~/.tauri/milo.key');
    console.log('\n🔧 To generate a new key:');
    console.log('pnpm tauri signer generate -w ~/.tauri/milo.key --password test123');
    process.exit(1);
  }

  // Check if environment variables are set
  if (!envKey && !envPassword) {
    console.error('❌ Signing key environment variables not set');
    console.log('\n🔧 To set the signing key:');
    console.log('export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/milo.key)');
    console.log('export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="test123"');
    console.log('\nOr run this one-liner:');
    console.log('export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/milo.key) && export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="test123"');
    process.exit(1);
  }

  if (!envKey) {
    console.error('❌ TAURI_SIGNING_PRIVATE_KEY not set');
    console.log('Run: export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/milo.key)');
    process.exit(1);
  }

  if (!envPassword) {
    console.error('❌ TAURI_SIGNING_PRIVATE_KEY_PASSWORD not set');
    console.log('Run: export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="test123"');
    process.exit(1);
  }

  console.log('✅ Signing key setup verified');
}

function main() {
  const args = process.argv.slice(2);
  let targetVersion = args[0];

  if (!targetVersion) {
    const currentVersion = getCurrentVersion();
    console.log(`Current version: ${currentVersion}`);
    console.log('Please provide a target version:');
    console.log('Usage: node scripts/update-latest.cjs v0.1.9');
    process.exit(1);
  }

  // Clean version (remove 'v' prefix if present)
  targetVersion = targetVersion.replace(/^v/, '');

  console.log(`🚀 Starting release process for v${targetVersion}`);

  // Check signing key setup first
  checkSigningKey();

  // Step 1: Update version files
  updateVersionFiles(targetVersion);

  // Step 2: Build the app
  buildApp();

  // Step 3: Extract signatures
  const signatures = extractSignatures(targetVersion);

  // Step 4: Generate latest.json
  const latestJson = generateLatestJson(targetVersion, signatures);

  // Step 5: Show results
  console.log('\n📋 Generated latest.json:');
  console.log(JSON.stringify(latestJson, null, 2));

  // Step 6: Commit and tag
  console.log('\n❓ Commit changes and create tag? (y/N)');
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      commitAndTag(targetVersion);
    } else {
      console.log('⏭️  Skipping git operations. You can commit manually.');
    }
    readline.close();

    console.log('\n🎉 Release preparation complete!');
    console.log('Next steps:');
    console.log('1. Review the generated latest.json');
    console.log('2. Push to GitHub: git push origin main && git push origin v' + targetVersion);
    console.log('3. Create GitHub release with the built artifacts');
  });
}

if (require.main === module) {
  main();
}