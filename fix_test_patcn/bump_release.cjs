const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

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

let [major, minor, patch] = oldVersion.split('.').map(Number);
patch += 1;
const newVersion = `${major}.${minor}.${patch}`;
const today = new Date().toISOString().split('T')[0];

console.log(`🚀 Bumping version: ${oldVersion} ➔ ${newVersion}`);
console.log(`📅 Release Date: ${today}`);

const englishChangelogItems = [
  "Crystal Bell (FM Synthesis) Acoustic Refinement: Integrated master studio dynamics compressor and limiter to prevent high-frequency intermodulation distortion; implemented acoustic register differentiation across octaves (C4–E4 singing bowl resonance, G4–C5 singing bell, D5–C6 crystal chime with airy 2.76x harmonic sparkle) and dynamic FM modulation envelope.",
  "Organic Water Drops (Liquid Cavitation Model): Replaced mechanical tone sweep with physical dual-formant cavity resonance (1.48x secondary harmonic), non-linear pitch rise with soft bubble detachment tail, and warm 2800 Hz low-pass filtering for soft, organic droplet acoustics.",
  "Authentic Geiger Counter Radiation Clicks: Replaced tonal oscillation with ultra-short (2.5–3.5 ms) electrostatic ionization discharge micro-spikes and bandpass filtering (4800–6500 Hz) for genuine dry Geiger-Müller counter clicks.",
  "Master Audio Pipeline Anti-Clipping: Added studio-grade DynamicsCompressorNode to master bus for pristine polyphonic voice summation during rapid typing.",
  "Cross-Platform Release Synchronization: Synchronized version across package.json, Tauri, Cargo.toml, Service Worker cache, metadata, and application settings."
];

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
    meta.description = meta.description.replace(
      /v\d+\.\d+\.\d+/g,
      `v${newVersion}`
    );
  }
  writeJson(metaPath, meta);
  updatedFiles.push('metadata.json');
}

// 5. Update neutralino-build/neutralino.config.json
const neuConfPath = path.join(rootDir, 'neutralino-build', 'neutralino.config.json');
if (fs.existsSync(neuConfPath)) {
  const neuConf = readJson(neuConfPath);
  neuConf.version = newVersion;
  writeJson(neuConfPath, neuConf);
  updatedFiles.push('neutralino-build/neutralino.config.json');
}

// 6. Update CHANGELOG.md
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  let changelog = fs.readFileSync(changelogPath, 'utf8');
  const changelogMdLines = englishChangelogItems.map(item => `- ${item}`).join('\n');
  const newEntry = `## [${today}] - Version ${newVersion} (ultrasteemeditor/${newVersion})\n### Added & Improved\n${changelogMdLines}\n\n`;
  
  if (changelog.includes('# Changelog\n')) {
    changelog = changelog.replace('# Changelog\n', `# Changelog\n${newEntry}`);
  } else {
    changelog = newEntry + changelog;
  }
  fs.writeFileSync(changelogPath, changelog, 'utf8');
  updatedFiles.push('CHANGELOG.md');
}

// 7. Update src/data/changelog.ts
const dataChangelogPath = path.join(rootDir, 'src', 'data', 'changelog.ts');
if (fs.existsSync(dataChangelogPath)) {
  let dataChangelog = fs.readFileSync(dataChangelogPath, 'utf8');
  
  const changesArrayCode = englishChangelogItems
    .map(c => `      "${c.replace(/"/g, '\\"')}"`)
    .join(',\n');

  const newChangelogEntryCode = `  {\n    version: "v${newVersion}",\n    date: "${today}",\n    changes: [\n${changesArrayCode}\n    ]\n  },`;

  dataChangelog = dataChangelog.replace(
    'export const APP_CHANGELOG: ChangelogEntry[] = [',
    `export const APP_CHANGELOG: ChangelogEntry[] = [\n${newChangelogEntryCode}`
  );
  fs.writeFileSync(dataChangelogPath, dataChangelog, 'utf8');
  updatedFiles.push('src/data/changelog.ts');
}

// 8. Update src/App.tsx
const appTsxPath = path.join(rootDir, 'src', 'App.tsx');
if (fs.existsSync(appTsxPath)) {
  let appTsx = fs.readFileSync(appTsxPath, 'utf8');
  const oldVerEsc = oldVersion.replace(/\./g, '\\.');

  appTsx = appTsx.replace(
    new RegExp(`ultrasteemeditor/${oldVerEsc}`, 'g'),
    `ultrasteemeditor/${newVersion}`
  );
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

  fs.writeFileSync(appTsxPath, appTsx, 'utf8');
  updatedFiles.push('src/App.tsx');
}

// 9. Update src/components/modals/SettingsModal.tsx
const settingsModalPath = path.join(rootDir, 'src', 'components', 'modals', 'SettingsModal.tsx');
if (fs.existsSync(settingsModalPath)) {
  let settingsModal = fs.readFileSync(settingsModalPath, 'utf8');
  const oldVerEsc = oldVersion.replace(/\./g, '\\.');

  settingsModal = settingsModal.replace(
    new RegExp(`Version ${oldVerEsc}`, 'g'),
    `Version ${newVersion}`
  );
  settingsModal = settingsModal.replace(
    new RegExp(`New in v${oldVerEsc}:`, 'g'),
    `New in v${newVersion}:`
  );
  settingsModal = settingsModal.replace(
    new RegExp(`ultrasteemeditor/${oldVerEsc}`, 'g'),
    `ultrasteemeditor/${newVersion}`
  );

  fs.writeFileSync(settingsModalPath, settingsModal, 'utf8');
  updatedFiles.push('src/components/modals/SettingsModal.tsx');
}

// 10. Update src/hooks/usePostSettings.ts
const usePostSettingsPath = path.join(rootDir, 'src', 'hooks', 'usePostSettings.ts');
if (fs.existsSync(usePostSettingsPath)) {
  let usePostSettings = fs.readFileSync(usePostSettingsPath, 'utf8');
  usePostSettings = usePostSettings.replace(
    /ultrasteemeditor\/\d+\.\d+\.\d+/g,
    `ultrasteemeditor/${newVersion}`
  );
  fs.writeFileSync(usePostSettingsPath, usePostSettings, 'utf8');
  updatedFiles.push('src/hooks/usePostSettings.ts');
}

// 11. Update public/sw.js
const swPath = path.join(rootDir, 'public', 'sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  swContent = swContent.replace(
    /steem-editor-pro-v\d+\.\d+\.\d+/g,
    `steem-editor-pro-v${newVersion}`
  );
  fs.writeFileSync(swPath, swContent, 'utf8');
  updatedFiles.push('public/sw.js');
}

console.log('\n✅ Version update completed successfully!');
console.log('📁 Updated files:');
updatedFiles.forEach(f => console.log(`   - ${f}`));
