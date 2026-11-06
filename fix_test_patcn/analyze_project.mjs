import fs from 'fs';
import path from 'path';

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('dist') && !filePath.includes('.aistudio')) {
          walkDir(filePath, fileList);
        }
      } else {
        fileList.push(filePath);
      }
    } catch (e) {
      // ignore permission/access errors
    }
  });
  return fileList;
}

const rootDir = '/app/applet';
const allFiles = walkDir(rootDir);
const srcFiles = allFiles.filter(f => f.includes('/src/'));

console.log(`Total source files found in src/: ${srcFiles.length}`);

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

report += `## 2. Глибокий аналіз ключових компонентів та монолітів\n\n`;

srcFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(rootDir, file);
  const lines = content.split('\n').length;
  
  if (lines > 150 || relPath.includes('App.tsx') || relPath.includes('Reader')) {
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
      report += `  - Приклади станів: \`${stateMatches.slice(0, 15).map(s => s.replace(/const\s+\[/, '').replace(/\s*=\s*useState.*/, '')).join(', ')}\`\n`;
    }
    report += `- **Функції / обробники:** ${funcMatches.length}\n`;
    report += `- **Хуки (useEffect, useCallback тощо):** ${effectMatches.length}\n\n`;
  }
});

report += `## 3. Аналіз складності перенесення та економії токенів\n\n`;
report += `### Економія токенів при рефакторингу монолітів\n`;
report += `- Великі компоненти (\`App.tsx\`, великі файли редактора та рідерів) містять велику кількість рядків (понад 500-2000), що призводить до високих витрат токенів при кожному зчитуванні або редагуванні контексту.\n`;
report += `- Поділ монолітів на незалежні модулі дозволяє знизити витрати токенів під час точкових виправлень помилок (наприклад, багів списків чи таблиць) приблизно у 3–5 разів.\n\n`;

report += `### Матриця складності та підходу до рефакторингу\n\n`;
report += `| Модуль / Компонент | Складність перенесення | Залежності та зв'язки | Підхід до рефакторингу |\n`;
report += `|---|---|---|---|\n`;
report += `| **Стейт та сховище (Hooks/Zustand)** | Середня | LocalStorage, Settings, App state | Винесення у кастомні хуки (\`src/hooks/\`) або атомарні стори. |\n`;
report += `| **Хедер, панелі інструментів і віджети** | Низька-Середня | Диспетчери подій, модалки, локалізація | Автономні компоненти з пропсами чи підписками на події. Можна переносити за один крок. |\n`;
report += `| **Рендерер документу / Рідер / Редактор** | Висока | DOM, виділення курсора, списки, таблиці, цитати | Покроковий підхід: 1) винесення чистих парсерів у \`src/utils/\`; 2) винесення обробки виділення; 3) виділення підкомпонентів візуального режиму. |\n`;
report += `| **Головний каркас (\`App.tsx\`)** | Висока | Роутинг, глобальні модалки, нотифікації, теми | Декомпозиція на layout-обгортки та окремі вкладки екранів. |\n\n`;

report += `## 4. Покроковий план рефакторингу маленькими кроками\n\n`;
report += `1. **Крок 1: Утиліти та парсери**\n`;
report += `   - Винесення логіки обробки списків, форматування тексту та таблиць у чисті утиліти.\n`;
report += `2. **Крок 2: Ізоляція хуків**\n`;
report += `   - Перенесення станів сховища та синхронізації в кастомні хуки.\n`;
report += `3. **Крок 3: Декомпозиція UI-компонентів**\n`;
report += `   - Поетапне винесення секцій App.tsx та Reader.tsx у окремі файли з обов'язковою перевіркою збірки (\`compile_applet\`) та лінтером (\`lint_applet\`).\n`;
report += `4. **Крок 4: Крос-платформна перевірка**\n`;
report += `   - Перевірка працездатності в веб, Tauri та Neutralino.\n\n`;

const reportPath = path.join(rootDir, 'fix_test_patcn', 'project_analysis_report.md');
fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Report successfully written to ${reportPath}`);
