import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function parseVersionTuple(ver) {
  const clean = ver.trim().replace(/^[\^~>=<=\s]+/, '');
  const match = clean.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: match[2] !== undefined ? Number(match[2]) : null,
    patch: match[3] !== undefined ? Number(match[3]) : null,
    prerelease: match[4] || null,
    raw: ver.trim(),
    clean,
  };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  const aMin = a.minor ?? 0;
  const bMin = b.minor ?? 0;
  if (aMin !== bMin) return aMin - bMin;
  const aPat = a.patch ?? 0;
  const bPat = b.patch ?? 0;
  return aPat - bPat;
}

function satisfiesCargoReq(reqStr, candidateStr) {
  const cand = parseVersionTuple(candidateStr);
  if (!cand || cand.prerelease) return false;

  const parts = reqStr.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith('~')) {
      const req = parseVersionTuple(part.slice(1));
      if (!req) return false;
      const minVer = { major: req.major, minor: req.minor ?? 0, patch: req.patch ?? 0 };
      const maxVer =
        req.minor !== null
          ? { major: req.major, minor: req.minor + 1, patch: 0 }
          : { major: req.major + 1, minor: 0, patch: 0 };
      if (compareSemver(cand, minVer) < 0 || compareSemver(cand, maxVer) >= 0) return false;
    } else if (part.startsWith('=')) {
      const req = parseVersionTuple(part.slice(1));
      if (!req) return false;
      if (
        cand.major !== req.major ||
        (req.minor !== null && cand.minor !== req.minor) ||
        (req.patch !== null && cand.patch !== req.patch)
      ) {
        return false;
      }
    } else {
      // Default Cargo caret semantics (^ or bare version)
      const req = parseVersionTuple(part.replace(/^\^/, ''));
      if (!req) return false;
      const minVer = { major: req.major, minor: req.minor ?? 0, patch: req.patch ?? 0 };
      let maxVer;
      if (req.major > 0) {
        maxVer = { major: req.major + 1, minor: 0, patch: 0 };
      } else if ((req.minor ?? 0) > 0) {
        maxVer = { major: 0, minor: (req.minor ?? 0) + 1, patch: 0 };
      } else {
        maxVer = { major: 0, minor: 0, patch: (req.patch ?? 0) + 1 };
      }
      if (compareSemver(cand, minVer) < 0 || compareSemver(cand, maxVer) >= 0) return false;
    }
  }
  return true;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'ultra-steem-editor-tauri-preflight/1.0',
          Accept: 'application/json',
        },
        timeout: 12000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error(`Invalid JSON from ${url}: ${err.message}`));
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', reject);
  });
}

function parseCargoTauriDeps(cargoText) {
  const deps = {};
  const lines = cargoText.split(/\r?\n/);
  let currentSection = '';
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      currentSection = secMatch[1].trim();
      continue;
    }
    if (currentSection === 'package') {
      const m = line.match(/^version\s*=\s*"([^"]+)"/);
      if (m) deps.__packageVersion = m[1];
      continue;
    }
    if (currentSection === 'dependencies' || currentSection === 'build-dependencies') {
      const simple = line.match(/^(tauri(?:-[a-z0-9-]+)*)\s*=\s*"([^"]+)"/);
      if (simple) {
        deps[simple[1]] = simple[2];
        continue;
      }
      const inlineTable = line.match(/^(tauri(?:-[a-z0-9-]+)*)\s*=\s*\{[^}]*version\s*=\s*"([^"]+)"/);
      if (inlineTable) {
        deps[inlineTable[1]] = inlineTable[2];
      }
    }
  }
  return deps;
}

async function main() {
  const errors = [];
  const warnings = [];

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const tauriConf = JSON.parse(fs.readFileSync(path.join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf8'));
  const cargoText = fs.readFileSync(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf8');
  const cargoDeps = parseCargoTauriDeps(cargoText);

  // 1. Check app version alignment across package.json, tauri.conf.json, Cargo.toml
  if (pkg.version !== tauriConf.version) {
    errors.push(`App version mismatch: package.json (${pkg.version}) !== src-tauri/tauri.conf.json (${tauriConf.version})`);
  }
  if (pkg.version !== cargoDeps.__packageVersion) {
    errors.push(`App version mismatch: package.json (${pkg.version}) !== src-tauri/Cargo.toml (${cargoDeps.__packageVersion})`);
  }

  // 2. Check NPM <-> Cargo Tauri alignment
  const allNpmDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const tauriNpmEntries = Object.entries(allNpmDeps).filter(([name]) => name.startsWith('@tauri-apps/'));

  for (const [npmName, npmRange] of tauriNpmEntries) {
    const npmVer = parseVersionTuple(npmRange);
    if (!npmVer) {
      errors.push(`Invalid npm version range for ${npmName}: ${npmRange}`);
      continue;
    }

    if (npmName === '@tauri-apps/api' || npmName === '@tauri-apps/cli') {
      const cargoVer = parseVersionTuple(cargoDeps.tauri || '');
      if (cargoVer && npmVer.major !== cargoVer.major) {
        errors.push(`Major version mismatch: ${npmName} (${npmRange}) vs Cargo tauri (${cargoDeps.tauri})`);
      }
    } else if (npmName.startsWith('@tauri-apps/plugin-')) {
      const suffix = npmName.replace('@tauri-apps/plugin-', '');
      const crateName = `tauri-plugin-${suffix}`;
      const crateReq = cargoDeps[crateName];
      if (!crateReq) {
        errors.push(`Missing Rust crate ${crateName} in src-tauri/Cargo.toml for npm package ${npmName}`);
      } else {
        const cargoVer = parseVersionTuple(crateReq);
        if (!cargoVer) {
          errors.push(`Invalid Cargo version for ${crateName}: ${crateReq}`);
        } else if (
          npmVer.major !== cargoVer.major ||
          (npmVer.minor !== null && cargoVer.minor !== null && npmVer.minor !== cargoVer.minor)
        ) {
          errors.push(
            `Plugin minor mismatch: ${npmName} (${npmRange}) vs Cargo ${crateName} (${crateReq})`
          );
        }
      }
    }
  }

  // 3. Verify every Tauri crate in Cargo.toml resolves to a stable, non-yanked release on crates.io
  const crateEntries = Object.entries(cargoDeps).filter(([key]) => key !== '__packageVersion');
  await Promise.all(
    crateEntries.map(async ([crateName, crateReq]) => {
      try {
        const data = await fetchJson(`https://crates.io/api/v1/crates/${crateName}`);
        const versions = Array.isArray(data.versions) ? data.versions : [];
        const matchingStable = versions.filter(
          (v) => !v.yanked && satisfiesCargoReq(crateReq, v.num)
        );
        if (matchingStable.length === 0) {
          const maxStable = data?.crate?.max_stable_version || 'unknown';
          errors.push(
            `crates.io check failed: ${crateName} = "${crateReq}" matches 0 stable non-yanked versions (latest stable: ${maxStable})`
          );
        } else {
          console.log(`  [crates.io OK] ${crateName} (${crateReq}) -> ${matchingStable[0].num}`);
        }
      } catch (err) {
        warnings.push(`Could not reach crates.io for ${crateName}: ${err.message}`);
      }
    })
  );

  // 4. Verify every @tauri-apps/* npm package exists on registry.npmjs.org
  await Promise.all(
    tauriNpmEntries.map(async ([npmName, npmRange]) => {
      try {
        const data = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(npmName)}`);
        const allVersions = Object.keys(data.versions || {});
        const matching = allVersions.filter((v) => satisfiesCargoReq(npmRange, v));
        if (matching.length === 0) {
          const latest = data?.['dist-tags']?.latest || 'unknown';
          errors.push(
            `npm check failed: ${npmName}@${npmRange} matches 0 stable published versions (latest: ${latest})`
          );
        } else {
          console.log(`  [npm OK]       ${npmName} (${npmRange}) -> ${matching[matching.length - 1]}`);
        }
      } catch (err) {
        warnings.push(`Could not reach npm registry for ${npmName}: ${err.message}`);
      }
    })
  );

  if (warnings.length > 0) {
    console.warn('\n⚠️ Tauri preflight warnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (errors.length > 0) {
    console.error('\n❌ Tauri version preflight check FAILED:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log('\n✅ Tauri app & crate/npm versions verified cleanly!');
}

main().catch((err) => {
  console.error('❌ Unexpected preflight error:', err);
  process.exit(1);
});
