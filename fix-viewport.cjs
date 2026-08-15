const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `  const [isEditorFullScreen, setIsEditorFullScreen] = useState(false);`;
const repl1 = `  const [isEditorFullScreen, setIsEditorFullScreen] = useState(false);
  const [vvHeight, setVvHeight] = useState<number | null>(null);

  useEffect(() => {
    const handleVVResize = () => {
      if (window.visualViewport) {
        setVvHeight(window.visualViewport.height);
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVVResize);
      handleVVResize();
    }
    return () => {
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', handleVVResize);
    };
  }, []);`;

content = content.replace(target1, repl1);

const target2 = `isEditorFullScreen && "bg-slate-950 p-0 fixed inset-0 z-[250]"`;
const repl2 = `isEditorFullScreen && "bg-slate-950 p-0 fixed top-0 left-0 right-0 z-[250]"`;
content = content.replace(target2, repl2);

const target3 = `                isFullScreen && "bg-slate-950 p-4 lg:p-12 overflow-y-auto fixed inset-0 z-[250]"`
const repl3 = `                isFullScreen && "bg-slate-950 p-4 lg:p-12 overflow-y-auto fixed top-0 left-0 right-0 z-[250]"`
content = content.replace(target3, repl3);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed viewport height definition');
