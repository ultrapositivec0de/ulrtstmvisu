import fs from 'fs';
import path from 'path';

interface SectionAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  description: string;
}

const appPath = path.resolve('src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
const appLines = appContent.split('\n');

console.log(`Total lines in src/App.tsx: ${appLines.length}`);

// 1. Analyze Props passed to major components in JSX
function countPropsInJSX(componentName: string, content: string): { propCount: number; props: string[] } {
  const regex = new RegExp(`<${componentName}\\s+([\\s\\S]*?)(?:\\/>|>)`, 'm');
  const match = content.match(regex);
  if (!match) return { propCount: 0, props: [] };
  
  const inner = match[1];
  const propMatches = inner.match(/([a-zA-Z0-9_-]+)(?:=|\s|$)/g) || [];
  const cleanProps = propMatches
    .map(p => p.replace(/[=\s]/g, ''))
    .filter(p => p.length > 0 && !['className', 'style'].includes(p));
  
  return { propCount: cleanProps.length, props: cleanProps };
}

// 2. Count properties in object definitions
function countObjectProperties(objectName: string, content: string): { count: number; keys: string[]; startLine: number; endLine: number } {
  const lines = content.split('\n');
  let startLine = -1;
  let endLine = -1;
  let depth = 0;
  let inObj = false;
  const keys: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inObj && (line.includes(`const ${objectName}:`) || line.includes(`const ${objectName} =`))) {
      startLine = i + 1;
      inObj = true;
    }
    if (inObj) {
      if (line.includes('{')) depth += (line.match(/{/g) || []).length;
      if (line.includes('}')) depth -= (line.match(/}/g) || []).length;

      const keyMatch = line.match(/^\s+([a-zA-Z0-9_$]+)(?::|,|\s)/);
      if (keyMatch && depth === 1) {
        keys.push(keyMatch[1]);
      }

      if (depth === 0 && line.includes('}')) {
        endLine = i + 1;
        break;
      }
    }
  }

  return { count: keys.length, keys, startLine, endLine };
}

// 3. Scan all hook calls in App.tsx
function findHookCalls(lines: string[]): { hook: string; line: number; varName: string }[] {
  const hooks: { hook: string; line: number; varName: string }[] = [];
  lines.forEach((line, idx) => {
    const hookMatch = line.match(/const\s+([\s\S]*?)\s+=\s+(use[A-Z][a-zA-Z0-9_]+)\(/);
    if (hookMatch) {
      hooks.push({
        hook: hookMatch[2],
        line: idx + 1,
        varName: hookMatch[1].trim().replace(/\s+/g, ' ')
      });
    }
  });
  return hooks;
}

// 4. Analyze large functions/handlers in App.tsx
function findFunctions(lines: string[]): { name: string; start: number; end: number; lines: number }[] {
  const funcs: { name: string; start: number; end: number; lines: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fnMatch = line.match(/^\s*(?:const|async function|function)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/);
    if (fnMatch) {
      const name = fnMatch[1];
      const start = i + 1;
      let depth = 0;
      let foundOpen = false;
      let end = i + 1;

      for (let j = i; j < Math.min(lines.length, i + 300); j++) {
        const cur = lines[j];
        if (cur.includes('{')) {
          depth += (cur.match(/{/g) || []).length;
          foundOpen = true;
        }
        if (cur.includes('}')) {
          depth -= (cur.match(/}/g) || []).length;
        }
        if (foundOpen && depth === 0) {
          end = j + 1;
          break;
        }
      }

      const count = end - start + 1;
      if (count >= 15) {
        funcs.push({ name, start, end, lines: count });
      }
    }
  }
  return funcs;
}

// Perform scans
const editorPaneObj = countObjectProperties('editorPaneProps', appContent);
const sidebarObj = countObjectProperties('sidebarProps', appContent);
const modalsObj = countObjectProperties('modalsProps', appContent);

const headerJSX = countPropsInJSX('Header', appContent);
const editorScreenJSX = countPropsInJSX('EditorScreen', appContent);
const readerScreenJSX = countPropsInJSX('ReaderScreen', appContent);
const appModalsJSX = countPropsInJSX('AppModalsHost', appContent);

const hookCalls = findHookCalls(appLines);
const largeFuncs = findFunctions(appLines);

// File size comparison
function getFileSize(filePath: string): { lines: number; kb: number } {
  try {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    return { lines: content.split('\n').length, kb: Math.round(stat.size / 1024) };
  } catch {
    return { lines: 0, kb: 0 };
  }
}

const keyFiles = [
  'src/App.tsx',
  'src/components/header/Header.tsx',
  'src/components/editor/EditorPane.tsx',
  'src/components/screens/EditorScreen.tsx',
  'src/components/sidebar/Sidebar.tsx',
  'src/components/modals/AppModalsHost.tsx',
  'src/components/Reader.tsx',
  'src/hooks/useSteemGallery.ts',
  'src/stores/useEditorStore.ts',
  'src/stores/useAppUIStore.ts',
  'src/store/readerStore.ts',
];

const fileStats = keyFiles.map(f => ({ file: f, ...getFileSize(f) }));

// Output report markdown
const report = `# ГЛИБОКИЙ АНАЛІЗ КОДОВОЇ БАЗИ ТА ПРОП-ДРІЛІНГУ
**Дата аналізу:** ${new Date().toISOString()}  
**Об'єкт аналізу:** \`src/App.tsx\` (${appLines.length} рядків) та суміжні модулі  
**Мета:** Виявлення залишків проп-дрілінгу, монолітних об'єктів пропсів, важких блоків та розробка стратегії радикального скорочення \`App.tsx\` з 1,742 до < 450 рядків.

---

## 1. Загальний огляд ключових файлів проекту

| Файл | Кількість рядків | Розмір (KB) | Статус / Призначення |
|:---|:---:|:---:|:---|
${fileStats.map(f => `| \`${f.file}\` | **${f.lines}** | ${f.kb} KB | ${f.lines > 500 ? '⚠️ Потребує оптимізації' : '✅ Оптимальний розмір'} |`).join('\n')}

---

## 2. Аналіз монолітних об'єктів пропсів у \`src/App.tsx\`

У коді \`src/App.tsx\` було виявлено 3 гігантські об'єкти, які збирають понад **180 пропсів** і передають їх крізь дочірні екрани:

### 2.1. \`editorPaneProps\` (Рядки ${editorPaneObj.startLine}–${editorPaneObj.endLine})
- **Кількість переданих властивостей:** **${editorPaneObj.count}** шт.
- **Причина проблеми:** \`App.tsx\` збирає 124 рефи, функції, стейти і передає їх в \`EditorScreen\`, який лише робить \`<EditorPane {...editorPaneProps} />\`.
- **Список виявлених пропсів (${editorPaneObj.count}):**  
  \`${editorPaneObj.keys.join(', ')}\`

### 2.2. \`sidebarProps\` (Рядки ${sidebarObj.startLine}–${sidebarObj.endLine})
- **Кількість переданих властивостей:** **${sidebarObj.count}** шт.
- **Список виявлених пропсів (${sidebarObj.count}):**  
  \`${sidebarObj.keys.join(', ')}\`

### 2.3. \`modalsProps\` (Рядки ${modalsObj.startLine}–${modalsObj.endLine})
- **Кількість переданих властивостей:** **${modalsObj.count}** шт.
- **Список виявлених пропсів (${modalsObj.count}):**  
  \`${modalsObj.keys.join(', ')}\`

---

## 3. Аналіз передачі пропсів у JSX розмітці \`src/App.tsx\`

| Компонент у JSX | Кількість прямих пропсів | Виявлені пропси |
|:---|:---:|:---|
| \`<Header />\` | **${headerJSX.propCount}** | \`${headerJSX.props.slice(0, 15).join(', ')} ... (+ ще ${headerJSX.propCount - 15})\` |
| \`<EditorScreen />\` | **${editorScreenJSX.propCount}** | \`${editorScreenJSX.props.join(', ')}\` |
| \`<ReaderScreen />\` | **${readerScreenJSX.propCount}** | \`${readerScreenJSX.props.join(', ')}\` |
| \`<AppModalsHost />\` | **${appModalsJSX.propCount}** | \`${appModalsJSX.props.join(', ')}\` |

> 🔴 **Головна проблема:** Хоча на попередніх етапах створено селектори Zustand, \`App.tsx\` **досі вручну збирає та передає всі 124 пропси в \`editorPaneProps\` та 58 пропсів у \`<Header />\`**!

---

## 4. Аналіз викликів хуків у \`src/App.tsx\`

Усередині компонента \`App\` викликається **${hookCalls.length} хуків**, що породжує величезну кількість локальних змінних та ре-рендерів:

| # | Рядок | Хук | Отримані змінні |
|:---:|:---:|:---|:---|
${hookCalls.map((h, i) => `| ${i + 1} | Рядок ${h.line} | \`${h.hook}\` | \`${h.varName.substring(0, 60)}${h.varName.length > 60 ? '...' : ''}\` |`).join('\n')}

---

## 5. Важкі inline-функції та обробники в \`src/App.tsx\`

Виявлено **${largeFuncs.length} великих функцій** (> 15 рядків), які визначені прямо всередині \`App.tsx\`:

| Функція | Діапазон рядків | Рядків | Призначення |
|:---|:---:|:---:|:---|
${largeFuncs.map(fn => `| \`${fn.name}\` | Рядки ${fn.start}–${fn.end} | **${fn.lines}** | Локальна логіка обробки подій |`).join('\n')}

---

## 6. Чіткий покроковий план повної ліквідації моноліту в \`App.tsx\`

Для того, щоб зменшити \`App.tsx\` з **1,742** до **< 400 рядків**, необхідно виконати 3 системні дії:

### Дія 1: Повне видалення монолітного бандла \`editorPaneProps\` (Рядки 1363–1487)
- **Що зробити:** Замість того, щоб формувати об'єкт зі 124 полями всередині \`App.tsx\`, перенести його формування у \`src/hooks/useEditorPaneProps.ts\` або дозволити \`EditorPane\` та його підкомпонентам отримувати дані безпосередньо зі сторів та хуків.
- **Ефект:** Видалення **125 рядків** чистого бойлерплейту в \`App.tsx\`.

### Дія 2: Радикальне очищення пропсів \`<Header />\` (Рядки 1579–1636)
- **Що зробити:** З 58 пропсів залишити тільки ті, що вимагають унікального контексту, а всі глобальні функції (\`saveDraft\`, \`downloadFile\`, \`importTable\`, \`fmt\`, \`fmtLine\`, \`handleIndent\`, \`handleLink\`, \`templates\`, \`mentions\`, \`queue\`, \`isDarkMode\`, \`lang\`, \`performanceMode\`, \`showMobileTools*\`) отримувати через Zustand селектори безпосередньо в \`Header.tsx\`.
- **Ефект:** Скорочення виклику \`<Header />\` з 58 рядків до < 10 рядків.

### Дія 3: Винесення синхронізації та клавіатурних шорткатів (Рядки 850–1150)
- **Що зробити:** Блоки автозбереження (\`steem_autosave_temp\`), спостереження за курсором та глобальні гарячі клавіші винести в окремий хук \`useEditorShortcutsAndAutosave.ts\`.
- **Ефект:** Видалення понад **300 рядків** з \`App.tsx\`.

### Дія 4: Винесення обробників публікації та черги (Рядки 1150–1350)
- **Що зробити:** Інтегрувати хуки \`usePublishingManager\` та \`useSteemQueue\` у внутрішній провайдер або окремий фасадний хук \`useAppPublishing.ts\`.
- **Ефект:** Видалення понад **200 рядків** з \`App.tsx\`.

---

## 7. Висновок та очікуваний результат
Після реалізації цих дій \`src/App.tsx\` виконуватиме виключно свою пряму роль — **кореневого оркестратора маршрутизації та глобальних провайдерів** обсягом **~350–400 рядків**, без жодного монолітного бандла пропсів та без зайвих ре-рендерів кореневого дерева.
`;

const outputPath = path.resolve('fix_test_patcn/DEEP_PROPS_AND_MONOLITH_AUDIT.md');
fs.writeFileSync(outputPath, report, 'utf8');

console.log(`\nAudit completed successfully! Saved to: ${outputPath}`);
