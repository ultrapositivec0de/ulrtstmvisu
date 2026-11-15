import ts from 'typescript';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function createTsProgram() {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error('tsconfig.json not found');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
  const rootNames = parsed.fileNames.filter(
    (f) => !f.includes('.bak') && !f.includes('backup_pre_refactor') && !f.includes('/chunks/')
  );
  return ts.createProgram({ rootNames, options: parsed.options });
}

function getReturnObjectKeysInFunction(sf: ts.SourceFile, fnName: string): Set<string> | null {
  let result: Set<string> | null = null;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === fnName && node.body) {
      const findReturn = (n: ts.Node) => {
        if (ts.isReturnStatement(n) && n.expression) {
          let expr = n.expression;
          while (ts.isAsExpression(expr) || ts.isParenthesizedExpression(expr)) expr = expr.expression;
          if (ts.isObjectLiteralExpression(expr)) {
            const keys = new Set<string>();
            for (const p of expr.properties) {
              if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isMethodDeclaration(p)) {
                keys.add(p.name.getText(sf).replace(/['"]/g, ''));
              } else if (ts.isSpreadAssignment(p)) {
                keys.add(`...${p.expression.getText(sf)}`);
              }
            }
            if (!result || keys.size > result.size) result = keys;
          }
        }
        ts.forEachChild(n, findReturn);
      };
      findReturn(node.body);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return result;
}

// ============================================================================
// 1. Check ALL property accesses & destructuring on domain suites (even on `any`)
// ============================================================================
function checkAllSuiteAccesses(program: ts.Program) {
  const suiteHooks: Record<string, { file: string; fn: string }> = {
    auth: { file: 'src/hooks/useSteemAuth.ts', fn: 'useSteemAuth' },
    postSettings: { file: 'src/hooks/usePostSettings.ts', fn: 'usePostSettings' },
    draftsManager: { file: 'src/hooks/useDrafts.ts', fn: 'useDrafts' },
    publishingQueue: { file: 'src/hooks/useSteemQueue.ts', fn: 'useSteemQueue' },
    publishingManager: { file: 'src/hooks/usePublishingManager.ts', fn: 'usePublishingManager' },
    editorCore: { file: 'src/hooks/useEditorCore.ts', fn: 'useEditorCore' },
    gallery: { file: 'src/hooks/useSteemGallery.ts', fn: 'useSteemGallery' },
    pwa: { file: 'src/hooks/usePwaAndNotifications.ts', fn: 'usePwaAndNotifications' },
    themeAndStyles: { file: 'src/hooks/useThemeAndStyles.ts', fn: 'useThemeAndStyles' },
    appUI: { file: 'src/hooks/useAppUI.ts', fn: 'useAppUI' },
    floatingWidget: { file: 'src/hooks/useFloatingWidgetState.ts', fn: 'useFloatingWidgetState' },
    appPublishing: { file: 'src/hooks/useAppPublishing.ts', fn: 'useAppPublishing' },
    appBackup: { file: 'src/hooks/useAppBackup.ts', fn: 'useAppBackup' },
    readerBlockchainActions: { file: 'src/hooks/useReaderBlockchainActions.ts', fn: 'useReaderBlockchainActions' },
    typingSound: { file: 'src/services/audio/useTypingSound.ts', fn: 'useTypingSound' },
    domRefs: { file: 'src/hooks/useWorkspaceDOMRefs.ts', fn: 'useWorkspaceDOMRefs' },
    editorState: { file: 'src/hooks/useWorkspaceEditorState.ts', fn: 'useWorkspaceEditorState' },
    publishingSuite: { file: 'src/hooks/useSteemPublishingSuite.ts', fn: 'useSteemPublishingSuite' },
  };

  const hookReturnKeys: Record<string, Set<string>> = {};
  for (const [name, info] of Object.entries(suiteHooks)) {
    const sf = program.getSourceFile(path.join(ROOT, info.file));
    if (!sf) continue;
    const keys = getReturnObjectKeysInFunction(sf, info.fn);
    if (keys) hookReturnKeys[name] = keys;
  }

  const issues: { file: string; line: number; suite: string; prop: string; kind: 'property-access' | 'destructure' }[] = [];

  const targetFiles = [
    'src/App.tsx',
    'src/hooks/useWorkspaceServices.ts',
    'src/hooks/useAppWorkspaceSuite.ts',
    'src/hooks/useEditorPaneProps.ts',
    'src/hooks/useSidebarProps.ts',
    'src/hooks/useModalsProps.ts',
  ];

  for (const relPath of targetFiles) {
    const sf = program.getSourceFile(path.join(ROOT, relPath));
    if (!sf) continue;

    function visit(node: ts.Node) {
      // PropertyAccess: suite.prop (including optional chaining suite?.prop)
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        const suiteName = node.expression.text;
        const propName = node.name.text;
        const returnKeys = hookReturnKeys[suiteName];
        if (returnKeys && !returnKeys.has(propName)) {
          issues.push({
            file: relPath,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            suite: suiteName,
            prop: propName,
            kind: 'property-access',
          });
        }
      }
      // Destructuring: const { a, b } = suite
      if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer) {
        let suiteName = '';
        if (ts.isIdentifier(node.initializer)) suiteName = node.initializer.text;
        else if (ts.isPropertyAccessExpression(node.initializer)) suiteName = node.initializer.name.text;
        const returnKeys = hookReturnKeys[suiteName];
        if (returnKeys) {
          for (const el of node.name.elements) {
            const propName = el.propertyName ? el.propertyName.getText(sf) : el.name.getText(sf);
            if (!returnKeys.has(propName)) {
              issues.push({
                file: relPath,
                line: sf.getLineAndCharacterOfPosition(el.getStart(sf)).line + 1,
                suite: suiteName,
                prop: propName,
                kind: 'destructure',
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  return { hookReturnKeys: Object.fromEntries(Object.entries(hookReturnKeys).map(([k, v]) => [k, [...v]])), issues };
}

// ============================================================================
// 2. Check AppModals.tsx child modal props against their Props interfaces
// ============================================================================
function checkAppModalsChildren(program: ts.Program) {
  const appModalsSf = program.getSourceFile(path.join(ROOT, 'src/components/modals/AppModals.tsx'));
  if (!appModalsSf) return [];

  const modalFiles = fs
    .readdirSync(path.join(ROOT, 'src/components/modals'))
    .filter((f) => f.endsWith('.tsx') && f !== 'AppModals.tsx' && f !== 'AppModalsHost.tsx' && f !== 'BaseModal.tsx');

  const modalInterfaces = new Map<string, { file: string; members: Map<string, boolean> }>();

  for (const mf of modalFiles) {
    const sf = program.getSourceFile(path.join(ROOT, 'src/components/modals', mf));
    if (!sf) continue;
    const compName = mf.replace('.tsx', '');
    function visit(n: ts.Node) {
      if (ts.isInterfaceDeclaration(n) && n.name.text.endsWith('Props')) {
        const members = new Map<string, boolean>();
        for (const m of n.members) {
          if (ts.isPropertySignature(m) && m.name) {
            members.set(m.name.getText(sf).replace(/['"]/g, ''), !!m.questionToken);
          }
        }
        modalInterfaces.set(compName, { file: `src/components/modals/${mf}`, members });
      }
      ts.forEachChild(n, visit);
    }
    visit(sf);
  }

  const results: { modal: string; missingProps: string[]; extraProps: string[] }[] = [];
  function visitModals(n: ts.Node) {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText(appModalsSf);
      const spec = modalInterfaces.get(tag);
      if (spec) {
        const passed = new Set<string>();
        for (const a of n.attributes.properties) {
          if (ts.isJsxAttribute(a)) passed.add(a.name.getText(appModalsSf));
        }
        const missing: string[] = [];
        for (const [m] of spec.members.entries()) {
          if (!passed.has(m)) missing.push(m);
        }
        const extra = [...passed].filter((p) => p !== 'key' && !spec.members.has(p));
        if (missing.length > 0 || extra.length > 0) {
          results.push({ modal: tag, missingProps: missing, extraProps: extra });
        }
      }
    }
    ts.forEachChild(n, visitModals);
  }
  visitModals(appModalsSf);
  return results;
}

// ============================================================================
// 3. Check App.tsx.pre_stage_a.bak useEffects & localStorage keys vs Current src/
// ============================================================================
function checkBackupEffectsAndStorage() {
  const backupText = fs.readFileSync(path.join(ROOT, 'fix_test_patcn/App.tsx.pre_stage_a.bak'), 'utf8');
  const lsKeysBackup = new Set<string>();
  const lsRegex = /localStorage\.(?:getItem|setItem|removeItem)\(\s*(['"`][^'"`]+['"`]|[A-Z0-9_]+)\s*/g;
  let m: RegExpExecArray | null;
  while ((m = lsRegex.exec(backupText))) {
    lsKeysBackup.add(m[1]);
  }

  // Collect all localStorage calls across current src/hooks + src/App.tsx + src/stores
  const currentFiles: string[] = [];
  function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== 'chunks') walk(p);
      else if ((e.name.endsWith('.ts') || e.name.endsWith('.tsx')) && !e.name.includes('.bak') && !e.name.includes('backup')) {
        currentFiles.push(p);
      }
    }
  }
  walk(path.join(ROOT, 'src'));
  const currentAllText = currentFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  const missingLsKeys: string[] = [];
  for (const k of lsKeysBackup) {
    if (!currentAllText.includes(k)) {
      missingLsKeys.push(k);
    }
  }

  // Check Header.tsx in pre-refactor vs current for saveDraft('ready') or anything else
  const backupHasSaveDraftReady = backupText.includes("saveDraft('ready')") || backupText.includes('saveDraft("ready")');
  const headerText = fs.readFileSync(path.join(ROOT, 'src/components/header/Header.tsx'), 'utf8');
  const headerSaveDraftCalls = headerText.match(/saveDraft\([^)]*\)/g) || [];

  // Check activeFormats writers across entire src/
  const activeFormatsMentions: string[] = [];
  for (const f of currentFiles) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    const relP = path.relative(ROOT, f).replace(/\\/g, '/');
    lines.forEach((l, i) => {
      if (l.includes('activeFormats') || l.includes('setActiveFormats')) {
        activeFormatsMentions.push(`${relP}:${i + 1}: ${l.trim()}`);
      }
    });
  }

  return {
    backupLocalStorageKeysCount: lsKeysBackup.size,
    missingLsKeys,
    backupHasSaveDraftReady,
    headerSaveDraftCalls,
    activeFormatsMentions,
  };
}

// ============================================================================
// 4. Check ReaderScreen vs Reader props
// ============================================================================
function checkReaderScreenWiring(program: ts.Program) {
  const rsSf = program.getSourceFile(path.join(ROOT, 'src/components/screens/ReaderScreen.tsx'));
  const rSf = program.getSourceFile(path.join(ROOT, 'src/components/Reader.tsx'));
  if (!rsSf || !rSf) return null;
  return {
    readerScreenText: rsSf.getFullText(),
  };
}

const program = createTsProgram();
const suiteAccesses = checkAllSuiteAccesses(program);
const modalChildren = checkAppModalsChildren(program);
const backupChecks = checkBackupEffectsAndStorage();
const readerCheck = checkReaderScreenWiring(program);

const report = {
  suiteIssues: suiteAccesses.issues,
  modalChildren,
  backupChecks,
  readerScreenLines: readerCheck?.readerScreenText.split('\n').length,
};

fs.writeFileSync(path.join(ROOT, 'fix_test_patcn/audit_deep_wiring_raw.json'), JSON.stringify(report, null, 2), 'utf8');

console.log('=== DEEP WIRING AUDIT ===');
console.log(`Suite property/destructure issues: ${suiteAccesses.issues.length}`);
for (const i of suiteAccesses.issues) {
  console.log(`  [${i.file}:${i.line}] ${i.kind} ${i.suite}.${i.prop} -> NOT RETURNED BY HOOK!`);
}
console.log(`Modal children mismatches: ${modalChildren.length}`);
for (const mc of modalChildren) {
  console.log(`  [${mc.modal}] missing=${mc.missingProps.join(', ')} | extra=${mc.extraProps.join(', ')}`);
}
console.log('Missing localStorage keys from backup:', backupChecks.missingLsKeys);
console.log('Header saveDraft calls:', backupChecks.headerSaveDraftCalls);
