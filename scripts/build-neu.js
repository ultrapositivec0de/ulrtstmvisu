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

function zipFolderWithFflate(sourceDir, targetZipPath) {
  const filesObj = {};
  function walk(currentDir, relativeBase) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
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

console.log('🚀 [Neutralino Build] Starting build pipeline...');

// 1. Build Vite application
console.log('📦 [Neutralino Build] Compiling Vite application...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 2. Ensure neutralino-build/resources directory exists
if (!fs.existsSync(neuResourcesDir)) {
  fs.mkdirSync(neuResourcesDir, { recursive: true });
}

// Backup neutralino.js if already present in neutralino-build/resources/js/
let neutralinoJsBackup = null;
if (fs.existsSync(neuJsFile)) {
  neutralinoJsBackup = fs.readFileSync(neuJsFile);
} else if (fs.existsSync(path.join(rootDir, 'dev-neu/resources/js/neutralino.js'))) {
  neutralinoJsBackup = fs.readFileSync(path.join(rootDir, 'dev-neu/resources/js/neutralino.js'));
}

// 3. Copy all dist/ files into neutralino-build/resources/
console.log('📂 [Neutralino Build] Copying web assets to neutralino-build/resources/...');
fs.cpSync(distDir, neuResourcesDir, { recursive: true });

// 4. Restore/Ensure neutralino.js
if (neutralinoJsBackup) {
  if (!fs.existsSync(neuJsDir)) {
    fs.mkdirSync(neuJsDir, { recursive: true });
  }
  fs.writeFileSync(neuJsFile, neutralinoJsBackup);
}

// 5. Ensure icon.png exists in neutralino-build/resources/
const iconSrc = fs.existsSync(path.join(rootDir, 'public/icon.png'))
  ? path.join(rootDir, 'public/icon.png')
  : path.join(rootDir, 'app-icon.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(neuResourcesDir, 'icon.png'));
}

// 6. Inject neutralino.js script tag into neutralino-build/resources/index.html if missing
const indexHtmlPath = path.join(neuResourcesDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  if (!html.includes('neutralino.js')) {
    html = html.replace('<head>', '<head>\n    <script src="/js/neutralino.js"></script>');
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    console.log('💉 [Neutralino Build] Injected /js/neutralino.js script tag into index.html');
  }
}

// 7. Run neu build --release
console.log('⚡ [Neutralino Build] Running Neutralino binary bundler (neu build --release)...');
execSync('npx --yes @neutralinojs/neu build --release', { cwd: neuBuildDir, stdio: 'inherit' });

// 8. Tag and version release zip files
const pkgPath = path.join(rootDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  const distOutDir = path.join(neuBuildDir, 'dist');
  if (fs.existsSync(distOutDir)) {
    const defaultZip = path.join(distOutDir, 'ultra-steem-editor-release.zip');
    const versionedZip = path.join(distOutDir, `ultra-steem-editor-v${pkgVersion}-neutralino.zip`);
    const versionedReleaseZip = path.join(distOutDir, `ultra-steem-editor-v${pkgVersion}-neutralino-release.zip`);

    const existingZips = fs.readdirSync(distOutDir).filter((f) => f.endsWith('.zip'));
    let sourceZip = null;

    if (fs.existsSync(defaultZip)) {
      sourceZip = defaultZip;
    } else if (existingZips.length > 0) {
      sourceZip = path.join(distOutDir, existingZips[0]);
    }

    if (sourceZip && fs.existsSync(sourceZip)) {
      fs.copyFileSync(sourceZip, versionedZip);
      fs.copyFileSync(sourceZip, versionedReleaseZip);
      if (sourceZip !== defaultZip) {
        fs.copyFileSync(sourceZip, defaultZip);
      }
      console.log(`🏷️ [Neutralino Build] Created versioned release artifact: ${path.basename(versionedZip)}`);
      console.log(`🏷️ [Neutralino Build] Created versioned release artifact: ${path.basename(versionedReleaseZip)}`);
    } else {
      console.log('📦 [Neutralino Build] No .zip produced by neu CLI. Generating zip with fflate...');
      const subdirs = fs.readdirSync(distOutDir).filter((f) => fs.statSync(path.join(distOutDir, f)).isDirectory());
      const zipSourceDir = subdirs.length > 0 ? path.join(distOutDir, subdirs[0]) : distOutDir;

      zipFolderWithFflate(zipSourceDir, versionedZip);
      fs.copyFileSync(versionedZip, versionedReleaseZip);
      fs.copyFileSync(versionedZip, defaultZip);
      console.log(`🏷️ [Neutralino Build] Created versioned zip artifact via fflate: ${path.basename(versionedZip)}`);
    }
  }
}

console.log('✅ [Neutralino Build] Neutralino binaries generated successfully in neutralino-build/dist/');
