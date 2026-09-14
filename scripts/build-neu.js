import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const neuBuildDir = path.join(rootDir, 'neutralino-build');
const neuResourcesDir = path.join(neuBuildDir, 'resources');
const neuJsDir = path.join(neuResourcesDir, 'js');
const neuJsFile = path.join(neuJsDir, 'neutralino.js');
const distOutDir = path.join(neuBuildDir, 'dist');
const tmpDir = path.join(neuBuildDir, '.tmp');

function zipFolderWithFflate(sourceDir, targetZipPath) {
  const filesObj = {};
  function walk(currentDir, relativeBase) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.endsWith('.zip')) continue;
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        filesObj[relPath] = fs.readFileSync(fullPath);
      }
    }
  }
  walk(sourceDir, '');
  const zippedBuffer = zipSync(filesObj, { level: 9 });
  fs.writeFileSync(targetZipPath, zippedBuffer);
}

// 0. Ensure @electron/asar crawlfs glob fix for Node 22/24 promisify compatibility
const crawlfsPath = path.join(rootDir, 'node_modules/@electron/asar/lib/crawlfs.js');
if (fs.existsSync(crawlfsPath)) {
  let crawlfsCode = fs.readFileSync(crawlfsPath, 'utf8');
  if (crawlfsCode.includes('const glob = (0, util_1.promisify)(glob_1.glob);')) {
    crawlfsCode = crawlfsCode.replace(
      'const glob = (0, util_1.promisify)(glob_1.glob);',
      'const glob = typeof glob_1.glob === "function" && glob_1.glob.constructor.name === "AsyncFunction" ? glob_1.glob : (0, util_1.promisify)(glob_1.glob);'
    );
    fs.writeFileSync(crawlfsPath, crawlfsCode, 'utf8');
    console.log('🩹 [Neutralino Build] Patched @electron/asar crawlfs for Node 22+ async glob compatibility');
  }
}

console.log('🚀 [Neutralino Build] Starting build pipeline...');

// 1. Build Vite application
console.log('📦 [Neutralino Build] Compiling Vite application...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 2. Clean previous build artifacts
console.log('🧹 [Neutralino Build] Cleaning previous build artifacts...');
if (fs.existsSync(neuResourcesDir)) {
  fs.rmSync(neuResourcesDir, { recursive: true, force: true });
}
if (fs.existsSync(distOutDir)) {
  fs.rmSync(distOutDir, { recursive: true, force: true });
}
if (fs.existsSync(tmpDir)) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

fs.mkdirSync(neuResourcesDir, { recursive: true });
fs.mkdirSync(distOutDir, { recursive: true });

// 3. Backup neutralino.js if present in dev-neu
let neutralinoJsBackup = null;
if (fs.existsSync(path.join(rootDir, 'dev-neu/resources/js/neutralino.js'))) {
  neutralinoJsBackup = fs.readFileSync(path.join(rootDir, 'dev-neu/resources/js/neutralino.js'));
}

// 4. Copy Vite dist files to neutralino-build/resources/
console.log('📂 [Neutralino Build] Copying web assets to neutralino-build/resources/...');
fs.cpSync(distDir, neuResourcesDir, { recursive: true });

// 5. Clean web/PWA-specific files from resources (not needed for Neutralino desktop)
console.log('🧹 [Neutralino Build] Removing web/PWA-specific files from resources...');
const pwaFilesToRemove = [
  'sw.js',
  'manifest.json',
  'manifest.webmanifest',
  'registerSW.js',
];
for (const item of fs.readdirSync(neuResourcesDir)) {
  if (pwaFilesToRemove.includes(item) || item.startsWith('workbox-') || item.startsWith('sw-')) {
    const itemPath = path.join(neuResourcesDir, item);
    fs.rmSync(itemPath, { recursive: true, force: true });
  }
}

// 6. Restore/Ensure neutralino.js
if (neutralinoJsBackup) {
  if (!fs.existsSync(neuJsDir)) {
    fs.mkdirSync(neuJsDir, { recursive: true });
  }
  fs.writeFileSync(neuJsFile, neutralinoJsBackup);
}

// 7. Ensure icon.png exists in neutralino-build/resources/
const iconSrc = fs.existsSync(path.join(rootDir, 'public/icon.png'))
  ? path.join(rootDir, 'public/icon.png')
  : path.join(rootDir, 'app-icon.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(neuResourcesDir, 'icon.png'));
}

// 8. Inject neutralino.js script tag into neutralino-build/resources/index.html if missing
const indexHtmlPath = path.join(neuResourcesDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  if (!html.includes('neutralino.js')) {
    html = html.replace('<head>', '<head>\n    <script src="/js/neutralino.js"></script>');
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    console.log('💉 [Neutralino Build] Injected /js/neutralino.js script tag into index.html');
  }
}

// 9. Ensure neutralino binaries are present and executable
const binDir = path.join(neuBuildDir, 'bin');
if (!fs.existsSync(binDir) || fs.readdirSync(binDir).length === 0) {
  console.log('📥 [Neutralino Build] Downloading Neutralino binaries (neu update)...');
  try {
    execSync('npx --yes @neutralinojs/neu update', { cwd: neuBuildDir, stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ [Neutralino Build] Warning during neu update:', err.message);
  }
}

if (fs.existsSync(binDir)) {
  for (const binFile of fs.readdirSync(binDir)) {
    try {
      fs.chmodSync(path.join(binDir, binFile), 0o755);
    } catch (_) {}
  }
}

// 10. Run neu build --release
console.log('⚡ [Neutralino Build] Running Neutralino binary bundler (neu build --release)...');
try {
  execSync('npx --yes @neutralinojs/neu build --release', { cwd: neuBuildDir, stdio: 'inherit' });
} catch (err) {
  console.warn('⚠️ [Neutralino Build] Warning during neu build:', err.message);
}

// 11. Tag and version release zip files
const pkgPath = path.join(rootDir, 'package.json');
const pkgVersion = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version : '1.0.0';

const defaultZip = path.join(distOutDir, 'ultra-steem-editor-release.zip');
const versionedZip = path.join(distOutDir, `ultra-steem-editor-v${pkgVersion}-neutralino.zip`);
const versionedReleaseZip = path.join(distOutDir, `ultra-steem-editor-v${pkgVersion}-neutralino-release.zip`);

const builtAppFolder = path.join(distOutDir, 'ultra-steem-editor');

if (fs.existsSync(defaultZip)) {
  fs.copyFileSync(defaultZip, versionedZip);
  fs.copyFileSync(defaultZip, versionedReleaseZip);
  console.log(`🏷️ [Neutralino Build] Created versioned release artifact: ${path.basename(versionedZip)}`);
} else if (fs.existsSync(builtAppFolder)) {
  console.log('📦 [Neutralino Build] Creating release zip from built Neutralino app directory...');
  zipFolderWithFflate(builtAppFolder, defaultZip);
  fs.copyFileSync(defaultZip, versionedZip);
  fs.copyFileSync(defaultZip, versionedReleaseZip);
  console.log(`🏷️ [Neutralino Build] Created versioned release artifact: ${path.basename(versionedZip)}`);
} else {
  console.error('❌ [Neutralino Build] Neutralino build failed to generate output in neutralino-build/dist/ultra-steem-editor!');
  process.exit(1);
}

console.log('✅ [Neutralino Build] Neutralino package generated successfully in neutralino-build/dist/');

