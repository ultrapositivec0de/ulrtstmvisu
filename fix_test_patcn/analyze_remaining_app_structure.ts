import * as fs from 'fs';

const appContent = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = appContent.split('\n');

console.log(`Total lines in src/App.tsx: ${lines.length}`);

// Count hooks calls
const hookCalls: { name: string; line: number }[] = [];
lines.forEach((line, idx) => {
  const match = line.match(/^\s*(?:const\s+.*?=\s*)?(use[A-Z][a-zA-Z0-9]+)\s*\(/);
  if (match) {
    hookCalls.push({ name: match[1], line: idx + 1 });
  }
});

console.log(`\n--- Custom & React Hooks Called (${hookCalls.length}) ---`);
hookCalls.forEach(h => console.log(`Line ${h.line}: ${h.name}`));

// Analyze blocks: State, Effects, Handlers, JSX
let importLines = 0;
let headerPropsLines = 0;
let modalsPropsLines = 0;
let editorPanePropsLines = 0;
let sidebarPropsLines = 0;
let readerScreenPropsLines = 0;
let editorScreenPropsLines = 0;
let jsxLines = 0;

let inHeader = false;
let inModals = false;
let inEditorPane = false;
let inSidebar = false;
let inReaderScreen = false;
let inEditorScreen = false;
let inJSX = false;

lines.forEach((line) => {
  if (line.startsWith('import ')) importLines++;
  if (line.includes('return (') || line.includes('return(')) inJSX = true;

  if (line.includes('const modalsProps: AppModalsProps = useModalsProps({')) inModals = true;
  if (inModals) {
    modalsPropsLines++;
    if (line.includes('});')) inModals = false;
  }

  if (line.includes('const editorPaneProps: EditorPaneProps = useEditorPaneProps({')) inEditorPane = true;
  if (inEditorPane) {
    editorPanePropsLines++;
    if (line.includes('});')) inEditorPane = false;
  }

  if (line.includes('const sidebarProps: SidebarProps = useSidebarProps({')) inSidebar = true;
  if (inSidebar) {
    sidebarPropsLines++;
    if (line.includes('});')) inSidebar = false;
  }

  if (line.includes('<Header')) inHeader = true;
  if (inHeader) {
    headerPropsLines++;
    if (line.includes('/>')) inHeader = false;
  }

  if (line.includes('<ReaderScreen')) inReaderScreen = true;
  if (inReaderScreen) {
    readerScreenPropsLines++;
    if (line.includes('/>')) inReaderScreen = false;
  }

  if (line.includes('<EditorScreen')) inEditorScreen = true;
  if (inEditorScreen) {
    editorScreenPropsLines++;
    if (line.includes('/>')) inEditorScreen = false;
  }

  if (inJSX) jsxLines++;
});

console.log('\n--- Section Metrics ---');
console.log(`Imports: ${importLines} lines`);
console.log(`editorPaneProps object: ${editorPanePropsLines} lines`);
console.log(`modalsProps object: ${modalsPropsLines} lines`);
console.log(`sidebarProps object: ${sidebarPropsLines} lines`);
console.log(`Header JSX: ${headerPropsLines} lines`);
console.log(`ReaderScreen JSX: ${readerScreenPropsLines} lines`);
console.log(`EditorScreen JSX: ${editorScreenPropsLines} lines`);
console.log(`JSX Root Render: ${jsxLines} lines`);
console.log(`Hooks & Component Logic: ${lines.length - importLines - jsxLines - editorPanePropsLines - modalsPropsLines - sidebarPropsLines} lines`);
