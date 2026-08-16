import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');

const updatedCode = code.replace(
  /const \[keyboardOffset, setKeyboardOffset\] = useState\(0\);/,
  `const [viewportHeight, setViewportHeight] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 0);
  const [keyboardOffset, setKeyboardOffset] = useState(0);`
).replace(
  /const handleVisualViewportChange = \(\) => \{[\s\S]*?const diff = layoutHeight - visualHeight - vv\.offsetTop;/,
  `const handleVisualViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const layoutHeight = window.innerHeight;
      const visualHeight = vv.height;
      setViewportHeight(visualHeight);
      const diff = layoutHeight - visualHeight - vv.offsetTop;`
).replace(
  /window\.visualViewport\.addEventListener\('resize', handleVisualViewportChange\);/,
  `handleVisualViewportChange();
    window.visualViewport.addEventListener('resize', handleVisualViewportChange);`
).replace(
  /"flex flex-col h-screen font-sans overflow-hidden transition-colors duration-500 selection:bg-\[rgb\(var\(--accent-color\)\/0\.3\)\]",/,
  `"flex flex-col w-full font-sans overflow-hidden transition-colors duration-500 selection:bg-[rgb(var(--accent-color)/0.3)]",`
).replace(
  /<div className=\{cn\(\n\s*"flex flex-col w-full font-sans overflow-hidden transition-colors duration-500 selection:bg-\[rgb\(var\(--accent-color\)\/0\.3\)\]",[\s\S]*?performanceMode && "perf-mode"\n\s*\)\}>/,
  match => match.replace(')>', `)} style={{ height: viewportHeight > 0 ? \`\${viewportHeight}px\` : '100dvh' }}>`)
);

fs.writeFileSync('src/App.tsx', updatedCode);
console.log("Updated App.tsx");
