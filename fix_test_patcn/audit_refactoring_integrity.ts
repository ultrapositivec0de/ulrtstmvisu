import ts from 'typescript';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

// Load tsconfig and create TS Program (excluding .bak and chunks)
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

function getAllSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'chunks' || entry.name === 'node_modules') continue;
      results.push(...getAllSourceFiles(full));
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.includes('.bak') &&
      !entry.name.includes('backup')
    ) {
      results.push(full);
    }
  }
  return results;
}

function rel(p: string) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function getLine(sf: ts.SourceFile, node: ts.Node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

// ============================================================================
// 1. AST Scanner for Stubs, No-ops, Dummy Arrow Functions & Suspect Fallbacks
// ============================================================================
interface StubFinding {
  file: string;
  line: number;
  propOrContext: string;
  expr: string;
  category: 'direct-stub' | 'fallback-stub' | 'empty-handler';
}

function isDummyArrowOrFn(node: ts.Node, sf: ts.SourceFile): string | null {
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const body = node.body;
    // () => {}
    if (ts.isBlock(body) && body.statements.length === 0) {
      return node.getText(sf);
    }
    // () => null | false | true | undefined | []
    if (
      body.kind === ts.SyntaxKind.NullKeyword ||
      body.kind === ts.SyntaxKind.FalseKeyword ||
      body.kind === ts.SyntaxKind.TrueKeyword ||
      (ts.isIdentifier(body) && body.text === 'undefined') ||
      (ts.isArrayLiteralExpression(body) && body.elements.length === 0)
    ) {
      return node.getText(sf);
    }
    // (x) => x (identity pass-through)
    if (
      ts.isIdentifier(body) &&
      node.parameters.length === 1 &&
      ts.isIdentifier(node.parameters[0].name) &&
      body.text === node.parameters[0].name.text
    ) {
      return node.getText(sf);
    }
    // () => ''
    if (ts.isStringLiteral(body) && body.text === '') {
      return node.getText(sf);
    }
  }
  return null;
}

function scanStubs(program: ts.Program): StubFinding[] {
  const findings: StubFinding[] = [];
  for (const sf of program.getSourceFiles()) {
    const r = rel(sf.fileName);
    if (!r.startsWith('src/') || sf.isDeclarationFile) continue;

    function visit(node: ts.Node) {
      // Check PropertyAssignment: { prop: () => ... }
      if (ts.isPropertyAssignment(node)) {
        const propName = node.name.getText(sf);
        const init = node.initializer;
        const dummy = isDummyArrowOrFn(init, sf);
        if (dummy) {
          findings.push({
            file: r,
            line: getLine(sf, node),
            propOrContext: propName,
            expr: dummy,
            category: 'direct-stub',
          });
        } else if (ts.isBinaryExpression(init) && init.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
          // prop: a ?? (() => {})
          let right = init.right;
          while (ts.isParenthesizedExpression(right)) right = right.expression;
          const fbDummy = isDummyArrowOrFn(right, sf);
          if (fbDummy) {
            findings.push({
              file: r,
              line: getLine(sf, node),
              propOrContext: propName,
              expr: init.getText(sf).replace(/\s+/g, ' '),
              category: 'fallback-stub',
            });
          }
        }
      }
      // Check JsxAttribute: onSomething={() => {}}
      if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        const dummy = isDummyArrowOrFn(node.initializer.expression, sf);
        if (dummy) {
          findings.push({
            file: r,
            line: getLine(sf, node),
            propOrContext: node.name.getText(sf),
            expr: dummy,
            category: 'empty-handler',
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  return findings;
}

// ============================================================================
// 2. AST Scanner for Interface Props vs Actual Passed Props at Key Wiring Sites
// ============================================================================
interface PropGapResult {
  targetName: string;
  interfaceFile: string;
  wiringFile: string;
  totalInterfaceProps: number;
  missingProps: {
    name: string;
    optional: boolean;
    typeStr: string;
    usedInComponent: boolean;
    hasComponentDefault: boolean;
    defaultExpr?: string;
  }[];
  extraProps: string[];
}

function getInterfaceMembers(
  sf: ts.SourceFile,
  interfaceName: string
): Map<string, { optional: boolean; typeStr: string }> {
  const map = new Map<string, { optional: boolean; typeStr: string }>();
  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      for (const m of node.members) {
        if (ts.isPropertySignature(m) && m.name) {
          const name = m.name.getText(sf).replace(/['"]/g, '');
          map.set(name, {
            optional: !!m.questionToken,
            typeStr: m.type ? m.type.getText(sf).replace(/\s+/g, ' ') : 'any',
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return map;
}

function getObjectLiteralKeys(sf: ts.SourceFile, varName: string): Set<string> | null {
  let result: Set<string> | null = null;
  function collectObjKeys(obj: ts.ObjectLiteralExpression): Set<string> {
    const keys = new Set<string>();
    for (const p of obj.properties) {
      if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isMethodDeclaration(p)) {
        keys.add(p.name.getText(sf).replace(/['"]/g, ''));
      } else if (ts.isSpreadAssignment(p)) {
        keys.add(`...${p.expression.getText(sf)}`);
      }
    }
    return keys;
  }
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === varName && node.initializer) {
      let expr = node.initializer;
      while (ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr) || ts.isParenthesizedExpression(expr)) {
        expr = expr.expression;
      }
      if (ts.isObjectLiteralExpression(expr)) {
        result = collectObjKeys(expr);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return result;
}

function getReturnObjectKeysInFunction(sf: ts.SourceFile, fnName: string): Set<string> | null {
  let result: Set<string> | null = null;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === fnName && node.body) {
      // Look for return { ... } inside if (isComposite...) or direct return
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

function getJsxAttributeKeys(sf: ts.SourceFile, tagName: string): Set<string> | null {
  let keys: Set<string> | null = null;
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(sf) === tagName) {
        keys = new Set<string>();
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr)) {
            keys.add(attr.name.getText(sf));
          } else if (ts.isJsxSpreadAttribute(attr)) {
            keys.add(`...${attr.expression.getText(sf)}`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return keys;
}

function inspectComponentPropUsage(sf: ts.SourceFile, propName: string): { used: boolean; hasDefault: boolean; defaultExpr?: string } {
  const text = sf.getFullText();
  // Check destructuring defaults like `propName = something`
  const defMatch = text.match(new RegExp(`\\b${propName}\\s*=\\s*([^,\\n}]+)`));
  const occurrences = (text.match(new RegExp(`\\b${propName}\\b`, 'g')) || []).length;
  // Rough heuristic: appears in interface (1) + destructuring (1) + usage (>=1) => >= 3, or props.propName
  return {
    used: occurrences >= 2,
    hasDefault: !!defMatch,
    defaultExpr: defMatch ? defMatch[1].trim() : undefined,
  };
}

function checkPropWiring(program: ts.Program): PropGapResult[] {
  const checks: {
    targetName: string;
    interfaceFile: string;
    interfaceName: string;
    wiringFile: string;
    mode: 'var' | 'fnReturn' | 'jsx';
    wiringKey: string;
  }[] = [
    {
      targetName: 'HeaderProps -> headerProps',
      interfaceFile: 'src/components/header/Header.tsx',
      interfaceName: 'HeaderProps',
      wiringFile: 'src/hooks/useAppWorkspaceSuite.ts',
      mode: 'var',
      wiringKey: 'headerProps',
    },
    {
      targetName: 'ReaderScreenProps -> readerProps',
      interfaceFile: 'src/components/screens/ReaderScreen.tsx',
      interfaceName: 'ReaderScreenProps',
      wiringFile: 'src/hooks/useAppWorkspaceSuite.ts',
      mode: 'var',
      wiringKey: 'readerProps',
    },
    {
      targetName: 'EditorScreenProps -> editorProps',
      interfaceFile: 'src/components/screens/EditorScreen.tsx',
      interfaceName: 'EditorScreenProps',
      wiringFile: 'src/hooks/useAppWorkspaceSuite.ts',
      mode: 'var',
      wiringKey: 'editorProps',
    },
    {
      targetName: 'AppModalsHostProps -> modalsHostProps',
      interfaceFile: 'src/components/modals/AppModalsHost.tsx',
      interfaceName: 'AppModalsHostProps',
      wiringFile: 'src/hooks/useAppWorkspaceSuite.ts',
      mode: 'var',
      wiringKey: 'modalsHostProps',
    },
    {
      targetName: 'SidebarProps -> buildSidebarProps',
      interfaceFile: 'src/components/sidebar/Sidebar.tsx',
      interfaceName: 'SidebarProps',
      wiringFile: 'src/hooks/useSidebarProps.ts',
      mode: 'fnReturn',
      wiringKey: 'buildSidebarProps',
    },
    {
      targetName: 'EditorPaneProps -> buildEditorPaneProps',
      interfaceFile: 'src/components/editor/EditorPane.tsx',
      interfaceName: 'EditorPaneProps',
      wiringFile: 'src/hooks/useEditorPaneProps.ts',
      mode: 'fnReturn',
      wiringKey: 'buildEditorPaneProps',
    },
    {
      targetName: 'AppModalsProps -> buildModalsProps',
      interfaceFile: 'src/components/modals/AppModals.tsx',
      interfaceName: 'AppModalsProps',
      wiringFile: 'src/hooks/useModalsProps.ts',
      mode: 'fnReturn',
      wiringKey: 'buildModalsProps',
    },
    {
      targetName: 'WysiwygCanvasProps -> <WysiwygCanvas>',
      interfaceFile: 'src/components/editor/WysiwygCanvas.tsx',
      interfaceName: 'WysiwygCanvasProps',
      wiringFile: 'src/components/editor/EditorPane.tsx',
      mode: 'jsx',
      wiringKey: 'WysiwygCanvas',
    },
    {
      targetName: 'TamedWidgetProps -> <TamedWidget>',
      interfaceFile: 'src/components/editor/TamedWidget.tsx',
      interfaceName: 'TamedWidgetProps',
      wiringFile: 'src/components/editor/EditorPane.tsx',
      mode: 'jsx',
      wiringKey: 'TamedWidget',
    },
    {
      targetName: 'MiniGalleryStripProps -> <MiniGalleryStrip>',
      interfaceFile: 'src/components/editor/MiniGalleryStrip.tsx',
      interfaceName: 'MiniGalleryStripProps',
      wiringFile: 'src/components/editor/EditorPane.tsx',
      mode: 'jsx',
      wiringKey: 'MiniGalleryStrip',
    },
    {
      targetName: 'EditorTopBarProps -> <EditorTopBar>',
      interfaceFile: 'src/components/editor/EditorTopBar.tsx',
      interfaceName: 'EditorTopBarProps',
      wiringFile: 'src/components/editor/EditorPane.tsx',
      mode: 'jsx',
      wiringKey: 'EditorTopBar',
    },
    {
      targetName: 'PreviewPaneProps -> <PreviewPane>',
      interfaceFile: 'src/components/editor/PreviewPane.tsx',
      interfaceName: 'PreviewPaneProps',
      wiringFile: 'src/components/screens/EditorScreen.tsx',
      mode: 'jsx',
      wiringKey: 'PreviewPane',
    },
    {
      targetName: 'MobileBottomBarProps -> <MobileBottomBar>',
      interfaceFile: 'src/components/common/MobileBottomBar.tsx',
      interfaceName: 'MobileBottomBarProps',
      wiringFile: 'src/components/screens/EditorScreen.tsx',
      mode: 'jsx',
      wiringKey: 'MobileBottomBar',
    },
  ];

  const results: PropGapResult[] = [];
  for (const c of checks) {
    const intSf = program.getSourceFile(path.join(ROOT, c.interfaceFile));
    const wireSf = program.getSourceFile(path.join(ROOT, c.wiringFile));
    if (!intSf || !wireSf) continue;

    const members = getInterfaceMembers(intSf, c.interfaceName);
    let wiredKeys: Set<string> | null = null;
    if (c.mode === 'var') wiredKeys = getObjectLiteralKeys(wireSf, c.wiringKey);
    else if (c.mode === 'fnReturn') wiredKeys = getReturnObjectKeysInFunction(wireSf, c.wiringKey);
    else if (c.mode === 'jsx') wiredKeys = getJsxAttributeKeys(wireSf, c.wiringKey);

    if (!wiredKeys) continue;

    const missing: PropGapResult['missingProps'] = [];
    for (const [name, info] of members.entries()) {
      if (name === 'isVisible') continue; // passed in AppWorkspaceHost
      if (!wiredKeys.has(name)) {
        const usage = inspectComponentPropUsage(intSf, name);
        missing.push({
          name,
          optional: info.optional,
          typeStr: info.typeStr,
          usedInComponent: usage.used,
          hasComponentDefault: usage.hasDefault,
          defaultExpr: usage.defaultExpr,
        });
      }
    }

    const extra: string[] = [];
    for (const k of wiredKeys) {
      if (!k.startsWith('...') && !members.has(k)) {
        extra.push(k);
      }
    }

    results.push({
      targetName: c.targetName,
      interfaceFile: c.interfaceFile,
      wiringFile: c.wiringFile,
      totalInterfaceProps: members.size,
      missingProps: missing,
      extraProps: extra,
    });
  }
  return results;
}

// ============================================================================
// 3. Check Destructuring from `any`-typed Domain Suites & Return Objects
// ============================================================================
interface DestructureMismatch {
  consumerFile: string;
  line: number;
  suiteVar: string;
  hookSource: string;
  missingKeys: string[];
}

function checkSuiteDestructuring(program: ts.Program): DestructureMismatch[] {
  const checker = program.getTypeChecker();
  const hookReturnKeys: Record<string, Set<string>> = {};

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
  };

  for (const [suiteName, info] of Object.entries(suiteHooks)) {
    const sf = program.getSourceFile(path.join(ROOT, info.file));
    if (!sf) continue;
    const keys = getReturnObjectKeysInFunction(sf, info.fn);
    if (keys) hookReturnKeys[suiteName] = keys;
  }

  const mismatches: DestructureMismatch[] = [];
  const consumerFiles = [
    'src/hooks/useAppWorkspaceSuite.ts',
    'src/hooks/useWorkspaceServices.ts',
    'src/hooks/useEditorPaneProps.ts',
    'src/hooks/useSidebarProps.ts',
    'src/hooks/useModalsProps.ts',
    'src/App.tsx',
  ];

  for (const cf of consumerFiles) {
    const sf = program.getSourceFile(path.join(ROOT, cf));
    if (!sf) continue;

    function visit(node: ts.Node) {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isObjectBindingPattern(node.name) &&
        node.initializer
      ) {
        let initName = '';
        if (ts.isIdentifier(node.initializer)) initName = node.initializer.text;
        else if (ts.isPropertyAccessExpression(node.initializer)) initName = node.initializer.name.text;

        const targetSet = hookReturnKeys[initName];
        if (targetSet) {
          const missing: string[] = [];
          for (const el of node.name.elements) {
            const propName = el.propertyName ? el.propertyName.getText(sf) : el.name.getText(sf);
            if (!targetSet.has(propName)) {
              missing.push(propName);
            }
          }
          if (missing.length > 0) {
            mismatches.push({
              consumerFile: cf,
              line: getLine(sf, node),
              suiteVar: initName,
              hookSource: suiteHooks[initName].file,
              missingKeys: missing,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  void checker;
  return mismatches;
}

// ============================================================================
// 4. Zustand Store vs Local State Split-Brain Scanner
// ============================================================================
function checkStoreSplitBrain(files: string[]) {
  const storeFields = [
    { store: 'useModalStore', fields: ['activeModal', 'isSMenuOpen', 'showPwaBanner', 'showPwaInstructionsModal', 'isAudioPresetsModalOpen', 'isAccountPromptModalOpen', 'isTableSelectorOpen'] },
    { store: 'useAppUIStore', fields: ['activeView', 'isSidebarOpen', 'isFullScreen', 'isEditorFullScreen', 'settingsTab'] },
    { store: 'useEditorStore', fields: ['isLivePreviewEnabled', 'syncScrollEnabled', 'beautifyEnabled', 'activeFormats', 'content', 'currentLang'] },
  ];

  const report: Record<string, { readers: string[]; writers: string[]; localStateDefs: string[] }> = {};

  for (const group of storeFields) {
    for (const field of group.fields) {
      const cap = field.charAt(0).toUpperCase() + field.slice(1);
      const setter = `set${cap}`;
      const readers: string[] = [];
      const writers: string[] = [];
      const localStateDefs: string[] = [];

      for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        const r = rel(f);
        if (r.startsWith('src/stores/')) continue;

        lines.forEach((line, idx) => {
          if (line.includes(group.store) && (line.includes(`.${field}`) || line.includes(`${field}:`))) {
            readers.push(`${r}:${idx + 1} -> ${line.trim()}`);
          }
          if (line.includes(group.store) && (line.includes(`.${setter}`) || line.includes(`toggle`))) {
            writers.push(`${r}:${idx + 1} -> ${line.trim()}`);
          }
          if (line.includes(`useState`) && (line.includes(`[${field},`) || line.includes(`[${field} ,`))) {
            localStateDefs.push(`${r}:${idx + 1} -> ${line.trim()}`);
          }
        });
      }

      if (localStateDefs.length > 0 || readers.length > 0 || writers.length > 0) {
        report[`${group.store}.${field}`] = { readers, writers, localStateDefs };
      }
    }
  }
  return report;
}

// ============================================================================
// 5. Pre-Refactor Backup Parity Check (JSX Props & Effects vs Current)
// ============================================================================
function checkPreRefactorParity(program: ts.Program) {
  const backupPath = path.join(ROOT, 'fix_test_patcn/App.tsx.pre_stage_a.bak');
  if (!fs.existsSync(backupPath)) return null;

  const backupText = fs.readFileSync(backupPath, 'utf8');
  const backupSf = ts.createSourceFile('App.tsx.pre_stage_a.bak', backupText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const componentsToCompare = [
    { tag: 'Header', currentFile: 'src/hooks/useAppWorkspaceSuite.ts', currentMode: 'var' as const, currentKey: 'headerProps' },
    { tag: 'EditorPane', currentFile: 'src/hooks/useEditorPaneProps.ts', currentMode: 'fnReturn' as const, currentKey: 'buildEditorPaneProps' },
    { tag: 'Sidebar', currentFile: 'src/hooks/useSidebarProps.ts', currentMode: 'fnReturn' as const, currentKey: 'buildSidebarProps' },
    { tag: 'AppModals', currentFile: 'src/hooks/useModalsProps.ts', currentMode: 'fnReturn' as const, currentKey: 'buildModalsProps' },
    { tag: 'Reader', currentFile: 'src/components/screens/ReaderScreen.tsx', currentMode: 'jsx' as const, currentKey: 'Reader' },
    { tag: 'PreviewPane', currentFile: 'src/components/screens/EditorScreen.tsx', currentMode: 'jsx' as const, currentKey: 'PreviewPane' },
    { tag: 'MobileBottomBar', currentFile: 'src/components/screens/EditorScreen.tsx', currentMode: 'jsx' as const, currentKey: 'MobileBottomBar' },
    { tag: 'TableSelectorPopup', currentFile: 'src/components/modals/AppModalsHost.tsx', currentMode: 'jsx' as const, currentKey: 'TableSelectorPopup' },
    { tag: 'AudioPresetsModal', currentFile: 'src/components/modals/AppModalsHost.tsx', currentMode: 'jsx' as const, currentKey: 'AudioPresetsModal' },
  ];

  const diffs: {
    component: string;
    backupCount: number;
    currentCount: number;
    lostFromBackup: string[];
    addedInCurrent: string[];
  }[] = [];

  for (const item of componentsToCompare) {
    const backupProps = getJsxAttributeKeys(backupSf, item.tag);
    const curSf = program.getSourceFile(path.join(ROOT, item.currentFile));
    if (!backupProps || !curSf) continue;

    let curProps: Set<string> | null = null;
    if (item.currentMode === 'var') curProps = getObjectLiteralKeys(curSf, item.currentKey);
    else if (item.currentMode === 'fnReturn') curProps = getReturnObjectKeysInFunction(curSf, item.currentKey);
    else curProps = getJsxAttributeKeys(curSf, item.currentKey);

    if (!curProps) continue;

    const lost = [...backupProps].filter((p) => !p.startsWith('...') && !curProps!.has(p));
    const added = [...curProps].filter((p) => !p.startsWith('...') && !backupProps.has(p));

    diffs.push({
      component: item.tag,
      backupCount: backupProps.size,
      currentCount: curProps.size,
      lostFromBackup: lost,
      addedInCurrent: added,
    });
  }

  return diffs;
}

// ============================================================================
// Execute All Audits
// ============================================================================
const program = createTsProgram();
const allFiles = getAllSourceFiles(SRC_DIR);

const stubs = scanStubs(program);
const propGaps = checkPropWiring(program);
const destructureMismatches = checkSuiteDestructuring(program);
const splitBrain = checkStoreSplitBrain(allFiles);
const parityDiffs = checkPreRefactorParity(program);

const output = {
  timestamp: new Date().toISOString(),
  stubs,
  propGaps,
  destructureMismatches,
  splitBrain,
  parityDiffs,
};

const outPath = path.join(ROOT, 'fix_test_patcn/audit_refactoring_raw.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

console.log('=== AUDIT SUMMARY ===');
console.log(`Total TS/TSX files scanned: ${allFiles.length}`);
console.log(`Stubs / No-ops found: ${stubs.length}`);
console.log(`Prop wiring targets checked: ${propGaps.length}`);
for (const g of propGaps) {
  if (g.missingProps.length > 0 || g.extraProps.length > 0) {
    console.log(`  [${g.targetName}] missing=${g.missingProps.length} (${g.missingProps.map(m => m.name).join(', ')}), extra=${g.extraProps.length}`);
  }
}
console.log(`Suite destructuring mismatches: ${destructureMismatches.length}`);
for (const d of destructureMismatches) {
  console.log(`  [${d.consumerFile}:${d.line}] from ${d.suiteVar}: missing [${d.missingKeys.join(', ')}]`);
}
if (parityDiffs) {
  console.log('Pre-refactor parity diffs:');
  for (const p of parityDiffs) {
    if (p.lostFromBackup.length > 0) {
      console.log(`  [${p.component}] lost from backup: ${p.lostFromBackup.join(', ')}`);
    }
  }
}
console.log(`Raw JSON saved to: ${rel(outPath)}`);
