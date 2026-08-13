import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
let updatedCode = code.replace(
  /"flex flex-col w-full font-sans overflow-hidden transition-colors duration-500 selection:bg-\[rgb\(var\(--accent-color\)\/0\.3\)\]",/,
  `"flex flex-col w-full relative font-sans overflow-hidden transition-colors duration-500 selection:bg-[rgb(var(--accent-color)/0.3)]",`
);

updatedCode = updatedCode.replace(
  /"lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 grid grid-cols-5 items-center px-1 z-\[70\] shadow-\[0_-4px_20px_rgba\(0,0,0,0\.5\)\] transition-all duration-150"/,
  `"lg:hidden absolute bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 grid grid-cols-5 items-center px-1 z-[70] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-150"`
).replace(
  /style=\{\{ bottom: keyboardOffset > 0 \? \`\$\{keyboardOffset\}px\` : 0 \}\}/,
  `` // remove this style as it is now absolute to the resized root
);

// Widget positioning
updatedCode = updatedCode.replace(
  /"fixed lg:absolute " \+ \(window\.innerWidth < 1024 \? "bottom-\[4\.5rem\] left-4 right-4 rounded-3xl" : ""\)/,
  `"absolute " + (window.innerWidth < 1024 ? "bottom-[4.5rem] left-4 right-4 rounded-3xl" : "")`
);

fs.writeFileSync('src/App.tsx', updatedCode);
console.log("Updated absolute positioning");
