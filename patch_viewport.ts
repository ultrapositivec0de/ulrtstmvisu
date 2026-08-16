import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const match = code.match(/const \[keyboardOffset, setKeyboardOffset\] = useState\(0\);/);
console.log(match ? "Found keyboardOffset" : "Not found");
