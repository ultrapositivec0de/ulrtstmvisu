import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to read and write JSON files nicely formatted
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// 1. Read package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = readJson(pkgPath);
const oldVersion = pkg.version;

// 2. Parse arguments
const args = process.argv.slice(2);
let bumpType = args[0] || 'patch';
let customNote = args[1] || 'Cross-platform release synchronization and system improvements.';

let [major, minor, patch] = oldVersion.split('.').map(Number);
let newVersion = oldVersion;

if (bumpType === 'patch') {
  patch += 1;
  newVersion = `${major}.${minor}.${patch}`;
} else if (bumpType === 'minor') {
  minor += 1;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
} else if (bumpType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
} else if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
  newVersion = bumpType;
  if (args[1]) {
    customNote = args[1];
  }
} else {
  // If first arg is actually a custom note, bump patch and use first arg as note
  customNote = bumpType;
  patch += 1;
  newVersion = `${major}.${minor}.${patch}`;
}

const today = new Date().toISOString().split('T')[0];

console.log(`🚀 Bumping version: ${oldVersion} ➔ ${newVersion}`);
console.log(`📅 Release Date: ${today}`);
console.log(`📝 Note: ${customNote}`);

const updatedFiles = [];

// 1. Update package.json
pkg.version = newVersion;
writeJson(pkgPath, pkg);
updatedFiles.push('package.json');

// 2. Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = readJson(tauriConfPath);
  tauriConf.version = newVersion;
  writeJson(tauriConfPath, tauriConf);
  updatedFiles.push('src-tauri/tauri.conf.json');
}

// 3. Update src-tauri/Cargo.toml
const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoPath)) {
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  // Robustly replace [package] version = "..." regardless of previous version string
  cargoContent = cargoContent.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${newVersion}"`
  );
  fs.writeFileSync(cargoPath, cargoContent, 'utf8');
  updatedFiles.push('src-tauri/Cargo.toml');
}

// 4. Update metadata.json
const metaPath = path.join(rootDir, 'metadata.json');
if (fs.existsSync(metaPath)) {
  const meta = readJson(metaPath);
  if (meta.description) {
    // Robustly replace vX.Y.Z in description
    meta.description = meta.description.replace(
      /v\d+\.\d+\.\d+/g,
      `v${newVersion}`
    );
  }
  writeJson(metaPath, meta);
  updatedFiles.push('metadata.json');
}

// 4b. Update neutralino-build/neutralino.config.json
const neuConfPath = path.join(rootDir, 'neutralino-build', 'neutralino.config.json');
if (fs.existsSync(neuConfPath)) {
  const neuConf = readJson(neuConfPath);
  neuConf.version = newVersion;
  writeJson(neuConfPath, neuConf);
  updatedFiles.push('neutralino-build/neutralino.config.json');
}

// 5. Update CHANGELOG.md
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  let changelog = fs.readFileSync(changelogPath, 'utf8');
  const newEntry = `## [${today}] - Version ${newVersion} (ultrasteemeditor/${newVersion})\n### Added & Improved\n- **Release Updates**: ${customNote}\n\n`;
  
  if (changelog.includes('# Changelog\n')) {
    changelog = changelog.replace('# Changelog\n', `# Changelog\n${newEntry}`);
  } else {
    changelog = newEntry + changelog;
  }
  fs.writeFileSync(changelogPath, changelog, 'utf8');
  updatedFiles.push('CHANGELOG.md');
}

// 6. Update src/App.tsx
const appTsxPath = path.join(rootDir, 'src', 'App.tsx');
if (fs.existsSync(appTsxPath)) {
  let appTsx = fs.readFileSync(appTsxPath, 'utf8');

  // Replace version literals
  const oldVerEsc = oldVersion.replace(/\./g, '\\.');
  
  // Replace APP_CHANGELOG array insertion (avoid duplicate if already present)
  if (!appTsx.includes(`version: "v${newVersion}"`)) {
    const changelogObjStr = `const APP_CHANGELOG = [\n  {\n    version: "v${newVersion}",\n    date: "${today}",\n    changes: [\n      "${customNote.replace(/"/g, '\\"')}"\n    ]\n  },`;
    appTsx = appTsx.replace('const APP_CHANGELOG = [', changelogObjStr);
  }

  // Replace agent string default references
  appTsx = appTsx.replace(
    new RegExp(`ultrasteemeditor/${oldVerEsc}`, 'g'),
    `ultrasteemeditor/${newVersion}`
  );

  // Replace version badge and title strings
  appTsx = appTsx.replace(
    new RegExp(`font-bold">${oldVerEsc}</span>`, 'g'),
    `font-bold">${newVersion}</span>`
  );
  appTsx = appTsx.replace(
    new RegExp(`Version ${oldVerEsc}`, 'g'),
    `Version ${newVersion}`
  );
  appTsx = appTsx.replace(
    new RegExp(`New in v${oldVerEsc}:`, 'g'),
    `New in v${newVersion}:`
  );
  appTsx = appTsx.replace(
    new RegExp(`v${oldVerEsc}`, 'g'),
    `v${newVersion}`
  );

  fs.writeFileSync(appTsxPath, appTsx, 'utf8');
  updatedFiles.push('src/App.tsx');
}

// 7. Update package-lock.json if available
try {
  execSync('npm install --package-lock-only --legacy-peer-deps', { cwd: rootDir, stdio: 'ignore' });
  updatedFiles.push('package-lock.json');
} catch (err) {
  console.warn('⚠️ Could not sync package-lock.json automatically.');
}

console.log('\n✅ Version update completed successfully!');
console.log('📁 Updated files:');
updatedFiles.forEach(f => console.log(`   - ${f}`));
