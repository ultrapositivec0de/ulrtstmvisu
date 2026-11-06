const fs = require('fs');
const path = require('path');

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('dist') && !filePath.includes('.aistudio')) {
        walkDir(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const rootDir = '/app';
const allFiles = walkDir(rootDir);
const srcFiles = allFiles.filter(f => f.includes('/src/'));

console.log(`Total source files found: ${srcFiles.length}`);

let report = `# Повний аналіз архітектури проєкту та звіт щодо рефакторингу\n\n`;
report += `Дата формування: ${new Date().toISOString()}\n\n`;
report += `## 1. Загальний огляд вихідних файлів у src/\n\n`;
report += `| Файл | Розмір (байт) | Кількість рядків | Орієнтовно токенів (символи / 4) |\n`;
report += `|---|---|---|---|\n`;

let totalChars = 0;

srcFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const size = Buffer.byteLength(content, 'utf8');
  const lines = content.split('\n').length;
  const tokens = Math.round(content.length / 4);
  totalChars += content.length;
  const relPath = path.relative(rootDir, file);
  report += `| \`${relPath}\` | ${size} | ${lines} | ~${tokens} |\n`;
});

report += `\n**Загальний розмір вихідного коду src/:** ~${totalChars} символів (~${Math.round(totalChars / 4)} токенів у ${srcFiles.length} файлах).\n\n`;

// Let's analyze major components like App.tsx, Reader.tsx, etc.
const majorFiles = srcFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

report += `## 2. Глибокий аналіз ключових компонентів та монолітів\n\n`;

majorFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(rootDir, filePath);
  const lines = content.split('\n').length;
  if (lines < 150 && !relPath.includes('App.tsx') && !relPath.includes('Reader')) return;

  const importMatches = content.match(/import\s+.*?from\s+['"].*?['"]/g) || [];
  const stateMatches = content.match(/const\s+\[\s*(\w+).*?\]\s*=\s*useState/g) || [];
  const funcMatches = content.match(/(?:const|function)\s+(\w+)\s*(?:=\s*(?:\([^)]*\)|[\w]+)\s*=>|\()/g) || [];
  const effectMatches = content.match(/useCallback|useEffect|useMemo|useRef/g) || [];

  report += `### \`${relPath}\`\n\n`;
  report += `- **Рядки:** ${lines}\n`;
  report += `- **Символи:** ${content.length}\n`;
  report += `- **Токени (оцінка):** ~${Math.round(content.length / 4)}\n`;
  report += `- **Імпорті:** ${importMatches.length}\n`;
  report += `- **Станів (useState):** ${stateMatches.length}\n`;
  if (stateMatches.length > 0) {
    report += `  - Приклади станів: \`${stateMatches.slice(0, 10).map(s => s.replace(/const\s+\[/, '').replace(/\s*=\s*useState.*/, '')).join(', ')}\`\n`;
  }
  report += `- **Функції / обробники:** ${funcMatches.length}\n`;
  report += `- **Хуки (useEffect, useCallback тощо):** ${effectMatches.length}\n\n`;
});

report += `## 3. Аналіз складності перенесення та економії токенів\n\n`;
report += `### Економія токенів при рефакторингу монолітів\n`;
report += `- Великі компоненти (такі як \`App.tsx\` або \`Reader.tsx\`) мають значний обсяг (понад 1000-3000 рядків), що створює суттєве навантаження на контекстне вікно LLM (від 1000 до 3000 токенів за одне зчитування).\n`;
- `При кожному редагуванні або виправленні помилки в таких файлах модель змушена обробляти весь великий файл, що збільшує ризики галюцинацій та холостий хід токенів.\n`;
report += `- Виділення підкомпонентів та кастомних хуків скорочує розмір файлів до оптимальних 150-300 рядків.\n\n`;

report += `### Матриця складності та підходу до рефакторингу\n\n`;
report += `| Модуль / Компонент | Складність перенесення | Залежності та зв'язки | Підхід до рефакторингу |\n`;
report += `|---|---|---|---|\n`;
report += `| **Стейт та сховище (Hooks/Zustand)** | Середня | LocalStorage, Settings, App state | Виносити в окремі кастомні хуки у \`src/hooks/\` або Zustand стори невеликими ітераціями. |\n`;
report += `| **Хедер, панелі інструментів і віджети** | Низька-Середня | Диспетчери подій, модалки, локалізація | Можна виносити покомпонентно у \`src/components/\` з чіткими пропсами чи підписками на стори. |\n`;
report += `| **Рендерер документу / Рідер / Редактор** | Висока | DOM-дерево, виділення тексту, обробка списків, таблиць, цитат, гарячі клавіші | Покроковий покроковий рефакторинг: спочатку чисті парсери та утиліти в \`src/utils/\`, потім виділення логіки виділення курсора, потім відокремлення підкомпонентів візуального режиму. |\n`;
report += `| **Головний каркас (\`App.tsx\`)** | Висока | Роутинг, глобальні модалки, нотифікації, теми | Декомпозиція на layout-обгортки та окремі вкладки екранів. |\n\n`;

report += `## 4. Покроковий план рефакторингу невеликими кроками\n\n`;
report += `1. **Крок 1: Утиліти та чисті функції**\n`;
report += `   - Винести логіку форматування тексту, списків, таблиць та цитат у чисті модулі з юніт-тестами у \`fix_test_patcn/\`.\n`;
report += `2. **Крок 2: Ізоляція хуків та бізнес-логіки**\n`;
report += `   - Винести стан редагування, синхронізації та налаштувань у кастомні хуки.\n`;
report += `3. **Крок 3: Декомпозиція UI-модулів**\n`;
report += `   - Розбити великі файли на менші компоненти, перевіряючи збірку (\`compile_applet\`) та лінтер (\`lint_applet\`) після кожного етапу.\n`;
report += `4. **Крок 4: Фінальна верифікація крос-платформної збірки**\n`;
report += `   - Перевірити роботу в веб-версії, Tauri та Neutralino.\n\n`;

const reportPath = '/app/fix_test_patcn/project_analysis_report.md';
fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Report successfully written to ${reportPath}`);
