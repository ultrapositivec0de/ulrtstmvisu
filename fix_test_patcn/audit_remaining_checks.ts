import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const BAK_PATH = path.join(ROOT, 'fix_test_patcn', 'App.tsx.pre_stage_a.bak');

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.bak')) {
      out.push(full);
    }
  }
  return out;
}

const files = walkTsFiles(SRC_DIR);
const rel = (p: string) => path.relative(ROOT, p).replace(/\\/g, '/');

function getSource(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

// 1. localStorage getItem vs setItem parity
function auditLocalStorage() {
  const gets = new Map<string, string[]>();
  const sets = new Map<string, string[]>();
  const removes = new Map<string, string[]>();

  const scanFile = (label: string, content: string) => {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const m of line.matchAll(/localStorage\.getItem\(\s*(['"`])([^'"`]+)\1/g)) {
        const k = m[2];
        if (!gets.has(k)) gets.set(k, []);
        gets.get(k)!.push(`${label}:${idx + 1}`);
      }
      for (const m of line.matchAll(/localStorage\.setItem\(\s*(['"`])([^'"`]+)\1/g)) {
        const k = m[2];
        if (!sets.has(k)) sets.set(k, []);
        sets.get(k)!.push(`${label}:${idx + 1}`);
      }
      for (const m of line.matchAll(/localStorage\.removeItem\(\s*(['"`])([^'"`]+)\1/g)) {
        const k = m[2];
        if (!removes.has(k)) removes.set(k, []);
        removes.get(k)!.push(`${label}:${idx + 1}`);
      }
    });
  };

  for (const f of files) {
    scanFile(rel(f), getSource(f));
  }

  const readWithoutWrite: Array<{ key: string; reads: string[] }> = [];
  for (const [k, reads] of gets.entries()) {
    if (!sets.has(k)) {
      readWithoutWrite.push({ key: k, reads });
    }
  }

  // Also compare with backup
  const bakContent = fs.existsSync(BAK_PATH) ? getSource(BAK_PATH) : '';
  const bakSets = new Set<string>();
  for (const m of bakContent.matchAll(/localStorage\.setItem\(\s*(['"`])([^'"`]+)\1/g)) {
    bakSets.add(m[2]);
  }
  const lostFromBak = [...bakSets].filter(k => !sets.has(k));

  return {
    readWithoutWrite,
    lostFromBak,
    allReads: Object.fromEntries(gets),
    allWrites: Object.fromEntries(sets),
  };
}

// 2. Check Zustand store selectors & setters across src/
function auditZustandStores() {
  const storeFiles = files.filter(f => rel(f).startsWith('src/store'));
  const results: any[] = [];

  for (const sfPath of storeFiles) {
    const code = getSource(sfPath);
    const sf = ts.createSourceFile(sfPath, code, ts.ScriptTarget.Latest, true);
    const storeHooks: string[] = [];
    const fields = new Set<string>();

    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^use\w+Store$/.test(node.name.text)) {
        storeHooks.push(node.name.text);
      }
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        if (node.name && /State|Store/.test(node.name.text)) {
          node.forEachChild(ch => {
            if (ts.isPropertySignature(ch) && ts.isIdentifier(ch.name)) {
              fields.add(ch.name.text);
            } else if (ts.isTypeLiteralNode(ch)) {
              ch.members.forEach(m => {
                if (ts.isPropertySignature(m) && ts.isIdentifier(m.name)) {
                  fields.add(m.name.text);
                }
              });
            }
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    for (const hookName of storeHooks) {
      const usages: Array<{ file: string; line: number; text: string }> = [];
      for (const f of files) {
        if (f === sfPath) continue;
        const lines = getSource(f).split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(hookName)) {
            usages.push({ file: rel(f), line: idx + 1, text: line.trim() });
          }
        });
      }
      // Check setter usage for each setter field
      const unusedSetters: string[] = [];
      const readFields: Record<string, string[]> = {};
      for (const field of fields) {
        const re = new RegExp(`\\b${field}\\b`);
        const hits: string[] = [];
        for (const f of files) {
          if (f === sfPath) continue;
          const lines = getSource(f).split('\n');
          lines.forEach((line, idx) => {
            if ((line.includes(hookName) || line.includes('getState()')) && re.test(line)) {
              hits.push(`${rel(f)}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
        if (field.startsWith('set') || field.startsWith('toggle')) {
          if (hits.length === 0) unusedSetters.push(field);
        }
        if (hits.length > 0) readFields[field] = hits;
      }
      results.push({
        file: rel(sfPath),
        hookName,
        totalFields: [...fields],
        unusedSetters,
        storeReferencesCount: usages.length,
        storeFieldHits: readFields,
      });
    }
  }
  return results;
}

// 3. Check buildModalsProps fallback resolution vs actual suite returns
function auditModalsPropsResolution() {
  // Parse return keys of each hook used in useWorkspaceServices / App / useAppWorkspaceSuite
  const hookReturnKeys = (fileRel: string): string[] => {
    const p = path.join(ROOT, fileRel);
    if (!fs.existsSync(p)) return [];
    const code = getSource(p);
    const sf = ts.createSourceFile(p, code, ts.ScriptTarget.Latest, true);
    const keys = new Set<string>();
    const visit = (node: ts.Node) => {
      if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression)) {
        for (const prop of node.expression.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            keys.add(prop.name.text);
          } else if (ts.isShorthandPropertyAssignment(prop)) {
            keys.add(prop.name.text);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    return [...keys];
  };

  const domainReturns: Record<string, string[]> = {
    auth: hookReturnKeys('src/hooks/useSteemAuth.ts'),
    postSettings: hookReturnKeys('src/hooks/usePostSettings.ts'),
    draftsManager: hookReturnKeys('src/hooks/useDrafts.ts'),
    publishingQueue: hookReturnKeys('src/hooks/usePublishingQueue.ts'),
    publishingManager: hookReturnKeys('src/hooks/useSteemPublishingManager.ts'),
    tableOps: hookReturnKeys('src/hooks/useTableOperations.ts'),
    appBackup: hookReturnKeys('src/hooks/useAppBackup.ts'),
    gallery: hookReturnKeys('src/hooks/useSteemGallery.ts'),
    pwa: hookReturnKeys('src/hooks/usePwaAndNotifications.ts'),
    themeAndStyles: hookReturnKeys('src/hooks/useThemeAndStyles.ts'),
    appUI: hookReturnKeys('src/hooks/useAppUI.ts'),
    floatingWidget: hookReturnKeys('src/hooks/useFloatingWidgetState.ts'),
    appPublishing: hookReturnKeys('src/hooks/useAppPublishing.ts'),
    editorCore: hookReturnKeys('src/hooks/useEditorCore.ts'),
    editorState: hookReturnKeys('src/hooks/useWorkspaceEditorState.ts'),
  };

  // Also check useSteemPublishingSuite return
  const pubSuiteReturns = hookReturnKeys('src/hooks/useSteemPublishingSuite.ts');

  // Parse useModalsProps call in useAppWorkspaceSuite.ts
  const suiteCode = getSource(path.join(ROOT, 'src/hooks/useAppWorkspaceSuite.ts'));
  const suiteSf = ts.createSourceFile('useAppWorkspaceSuite.ts', suiteCode, ts.ScriptTarget.Latest, true);
  const passedToUseModalsProps = new Set<string>();
  const passedToUseEditorPaneProps = new Set<string>();
  const passedToUseSidebarProps = new Set<string>();
  const headerPropsKeys = new Set<string>();
  const readerPropsKeys = new Set<string>();
  const editorPropsKeys = new Set<string>();
  const modalsHostPropsKeys = new Set<string>();

  const collectObjKeys = (obj: ts.ObjectLiteralExpression, target: Set<string>) => {
    for (const prop of obj.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) target.add(prop.name.text);
      else if (ts.isShorthandPropertyAssignment(prop)) target.add(prop.name.text);
    }
  };

  const visitSuite = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'useModalsProps' && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
        collectObjKeys(node.arguments[0], passedToUseModalsProps);
      }
      if (node.expression.text === 'useEditorPaneProps' && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
        collectObjKeys(node.arguments[0], passedToUseEditorPaneProps);
      }
      if (node.expression.text === 'useSidebarProps' && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
        collectObjKeys(node.arguments[0], passedToUseSidebarProps);
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      if (node.name.text === 'headerProps') collectObjKeys(node.initializer, headerPropsKeys);
      if (node.name.text === 'readerProps') collectObjKeys(node.initializer, readerPropsKeys);
      if (node.name.text === 'editorProps') collectObjKeys(node.initializer, editorPropsKeys);
      if (node.name.text === 'modalsHostProps') collectObjKeys(node.initializer, modalsHostPropsKeys);
    }
    ts.forEachChild(node, visitSuite);
  };
  visitSuite(suiteSf);

  // Check buildModalsProps return object in useModalsProps.ts
  const modalsPropsCode = getSource(path.join(ROOT, 'src/hooks/useModalsProps.ts'));
  const modalsPropsSf = ts.createSourceFile('useModalsProps.ts', modalsPropsCode, ts.ScriptTarget.Latest, true);
  const unresolvedModalFallbacks: Array<{ prop: string; expr: string; line: number }> = [];

  const checkFallbackExpr = (propName: string, expr: ts.Expression): boolean => {
    const txt = expr.getText(modalsPropsSf);
    // Check if rest.X and X is in passedToUseModalsProps
    if (txt.includes(`rest.${propName}`) && passedToUseModalsProps.has(propName)) return true;
    // Check domain.prop references
    for (const [dom, keys] of Object.entries(domainReturns)) {
      const m = txt.match(new RegExp(`\\b${dom}\\??\\.(\\w+)`));
      if (m && keys.includes(m[1])) return true;
    }
    return false;
  };

  const visitModals = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'buildModalsProps') {
      const walkBody = (n: ts.Node) => {
        if (ts.isReturnStatement(n) && n.expression && ts.isObjectLiteralExpression(n.expression)) {
          for (const prop of n.expression.properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              const name = prop.name.text;
              const initTxt = prop.initializer.getText(modalsPropsSf);
              if (initTxt.includes('??') && !checkFallbackExpr(name, prop.initializer)) {
                const line = modalsPropsSf.getLineAndCharacterOfPosition(prop.getStart(modalsPropsSf)).line + 1;
                unresolvedModalFallbacks.push({ prop: name, expr: initTxt, line });
              }
            }
          }
        }
        ts.forEachChild(n, walkBody);
      };
      walkBody(node);
    }
    ts.forEachChild(node, visitModals);
  };
  visitModals(modalsPropsSf);

  // Also check HeaderProps optional keys omitted in headerProps
  const headerCode = getSource(path.join(ROOT, 'src/components/header/Header.tsx'));
  const headerSf = ts.createSourceFile('Header.tsx', headerCode, ts.ScriptTarget.Latest, true);
  const headerInterfaceProps: Array<{ name: string; optional: boolean; type: string }> = [];
  ts.forEachChild(headerSf, n => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === 'HeaderProps') {
      for (const m of n.members) {
        if (ts.isPropertySignature(m) && ts.isIdentifier(m.name)) {
          headerInterfaceProps.push({
            name: m.name.text,
            optional: !!m.questionToken,
            type: m.type ? m.type.getText(headerSf) : 'any',
          });
        }
      }
    }
  });
  const omittedHeaderProps = headerInterfaceProps.filter(p => !headerPropsKeys.has(p.name));

  return {
    domainReturnsCount: Object.fromEntries(Object.entries(domainReturns).map(([k, v]) => [k, v.length])),
    pubSuiteReturns,
    unresolvedModalFallbacks,
    omittedHeaderProps,
    headerPropsKeys: [...headerPropsKeys],
    passedToUseEditorPaneProps: [...passedToUseEditorPaneProps],
  };
}

// 4. Check SettingsModal & all child modals props
function auditSettingsAndChildModals() {
  const settingsCode = getSource(path.join(ROOT, 'src/components/modals/SettingsModal.tsx'));
  const settingsLines = settingsCode.split('\n');
  const clearImagesHits: string[] = [];
  const clearTemplatesHits: string[] = [];
  settingsLines.forEach((l, i) => {
    if (l.includes('clearAllImages')) clearImagesHits.push(`${i + 1}: ${l.trim()}`);
    if (l.includes('clearAllTemplates')) clearTemplatesHits.push(`${i + 1}: ${l.trim()}`);
  });

  // Check ReaderScreen & Reader props
  const readerCode = getSource(path.join(ROOT, 'src/components/Reader.tsx'));
  const readerSf = ts.createSourceFile('Reader.tsx', readerCode, ts.ScriptTarget.Latest, true);
  const readerInterfaceProps: string[] = [];
  ts.forEachChild(readerSf, n => {
    if (ts.isInterfaceDeclaration(n) && /ReaderProps/.test(n.name.text)) {
      for (const m of n.members) {
        if (ts.isPropertySignature(m) && ts.isIdentifier(m.name)) {
          readerInterfaceProps.push(m.name.text);
        }
      }
    }
  });

  const readerScreenCode = getSource(path.join(ROOT, 'src/components/screens/ReaderScreen.tsx'));

  return {
    clearImagesHits,
    clearTemplatesHits,
    readerInterfaceProps,
    readerScreenSnippet: readerScreenCode.slice(0, 1200),
  };
}

// 5. Compare event listeners & useEffects in App.tsx.pre_stage_a.bak vs src/
function auditBackupEffectsAndListeners() {
  if (!fs.existsSync(BAK_PATH)) return { error: 'Backup not found' };
  const bakCode = getSource(BAK_PATH);
  const bakLines = bakCode.split('\n');

  const bakAddListeners: string[] = [];
  bakLines.forEach((l, i) => {
    if (l.includes('addEventListener')) bakAddListeners.push(`${i + 1}: ${l.trim()}`);
  });

  const srcAddListeners: string[] = [];
  for (const f of files) {
    getSource(f).split('\n').forEach((l, i) => {
      if (l.includes('addEventListener')) srcAddListeners.push(`${rel(f)}:${i + 1}: ${l.trim()}`);
    });
  }

  // Check custom hooks & utilities called in App.tsx.pre_stage_a.bak vs App.tsx
  const bakImports = new Set<string>();
  const appImports = new Set<string>();
  for (const m of bakCode.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g)) {
    m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(s => bakImports.add(`${s} <- ${m[2]}`));
  }
  const appCode = getSource(path.join(ROOT, 'src/App.tsx'));
  for (const m of appCode.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g)) {
    m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(s => appImports.add(`${s} <- ${m[2]}`));
  }

  // Check which hooks/utils in bak are NOT in App.tsx (might be moved to sub-hooks)
  const missingInApp = [...bakImports].filter(x => !appImports.has(x));

  return {
    bakAddListeners,
    srcAddListenersCount: srcAddListeners.length,
    srcAddListeners,
    missingInAppFromBak: missingInApp,
  };
}

// 6. Check EditorPane, TamedWidget, MiniGalleryStrip, toolsMap for stubs/disconnected props
function auditEditorAndWidgets() {
  const editorPaneCode = getSource(path.join(ROOT, 'src/components/editor/EditorPane.tsx'));
  const tamedCode = getSource(path.join(ROOT, 'src/components/editor/TamedWidget.tsx'));
  const miniGalleryCode = getSource(path.join(ROOT, 'src/components/editor/MiniGalleryStrip.tsx'));
  const toolsMapCode = getSource(path.join(ROOT, 'src/components/editor/toolsMap.tsx'));

  const findInFile = (label: string, code: string, patterns: string[]) => {
    const hits: string[] = [];
    code.split('\n').forEach((l, i) => {
      for (const p of patterns) {
        if (l.includes(p)) {
          hits.push(`${label}:${i + 1}: ${l.trim()}`);
          break;
        }
      }
    });
    return hits;
  };

  return {
    tamedGetMarkedOrSetContent: findInFile('TamedWidget.tsx', tamedCode, ['getMarked', 'setContent', 'fallbackToolsMap', '() => {}']),
    miniGalleryPropsAndIsOpen: findInFile('MiniGalleryStrip.tsx', miniGalleryCode, ['isOpen', 'onClose', 'getMiniGalleryBottomStyle', 'isMiniGalleryOpen']),
    editorPaneStubSensitiveProps: findInFile('EditorPane.tsx', editorPaneCode, [
      'isImageAndProxyUrl',
      'htmlToMarkdown',
      'convertBareImageUrlsToMarkdown',
      'getMarked',
      'setContent',
      'getMiniGalleryBottomStyle',
      'isMiniGalleryOpen',
      'setIsMiniGalleryOpen',
    ]),
    toolsMapActions: findInFile('toolsMap.tsx', toolsMapCode, ['setShowTableSelector', 'setIsMiniGalleryOpen', 'setActiveModal', 'action:']),
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  localStorage: auditLocalStorage(),
  zustandStores: auditZustandStores(),
  modalsAndHeaderProps: auditModalsPropsResolution(),
  settingsAndChildModals: auditSettingsAndChildModals(),
  backupEffectsAndListeners: auditBackupEffectsAndListeners(),
  editorAndWidgets: auditEditorAndWidgets(),
};

const outPath = path.join(ROOT, 'fix_test_patcn', 'audit_remaining_raw.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log('Wrote:', outPath);
console.log('LocalStorage reads without writes:', report.localStorage.readWithoutWrite.map(x => x.key));
console.log('LocalStorage lostFromBak:', report.localStorage.lostFromBak);
console.log('Unresolved modal fallbacks:', report.modalsAndHeaderProps.unresolvedModalFallbacks);
console.log('Omitted HeaderProps:', report.modalsAndHeaderProps.omittedHeaderProps.map(x => `${x.name}${x.optional ? '?' : '!'}`));
console.log('Settings clearAllImages hits:', report.settingsAndChildModals.clearImagesHits);
console.log('Settings clearAllTemplates hits:', report.settingsAndChildModals.clearTemplatesHits);
