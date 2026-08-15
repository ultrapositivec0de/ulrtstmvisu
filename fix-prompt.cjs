const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `  const [systemDialog, setSystemDialog] = useState<{
    type: 'confirm' | 'prompt' | 'alert',
    inputType?: 'text' | 'password',
    title: string,
    message: string,
    resolve: (val: any) => void,
    defaultValue,
        inputType?: string,
    placeholder?: string
  } | null>(null);`;

const repl1 = `  const [systemDialog, setSystemDialog] = useState<{
    type: 'confirm' | 'prompt' | 'alert',
    inputType?: 'text' | 'password',
    title: string,
    message: string,
    resolve: (val: any) => void,
    defaultValue?: string,
    placeholder?: string
  } | null>(null);`;

content = content.replace(target1, repl1);

const target2 = `  const promptDialog = useCallback((message: string, defaultValue,
        inputType: string = "", title?: string, inputType?: "text" | "password") => {
    return new Promise<string | null>((resolve) => {
      setSystemDialog({ 
        type: 'prompt', 
        title: title || t('link'), 
        message, 
        resolve, 
        defaultValue,
        inputType 
      });
    });
  }, [t]);`;

const repl2 = `  const promptDialog = useCallback((message: string, defaultValue: string = "", title?: string, inputType?: "text" | "password") => {
    return new Promise<string | null>((resolve) => {
      setSystemDialog({ 
        type: 'prompt', 
        title: title || t('link'), 
        message, 
        resolve, 
        defaultValue,
        inputType 
      });
    });
  }, [t]);`;

content = content.replace(target2, repl2);

const target3 = `                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">{systemDialog.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{systemDialog.message}</p>
                
                {systemDialog.type === 'prompt' && (
                  <input
                    autoFocus
                    type="text"
                    defaultValue,
        inputType={systemDialog.defaultValue,
        inputType}
                    placeholder={systemDialog.placeholder}
                    className="w-full px-4 py-2 mb-6 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    onKeyDown={(e) => {`;

const repl3 = `                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">{systemDialog.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{systemDialog.message}</p>
                
                {systemDialog.type === 'prompt' && (
                  <input
                    autoFocus
                    type={systemDialog.inputType || "text"}
                    defaultValue={systemDialog.defaultValue}
                    placeholder={systemDialog.placeholder}
                    className="w-full px-4 py-2 mb-6 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    onKeyDown={(e) => {`;

content = content.replace(target3, repl3);

const target4 = `                  title="Rows"
                  defaultValue,
        inputType="3"
                  id="customTableRowInput"`;

const repl4 = `                  title="Rows"
                  defaultValue="3"
                  id="customTableRowInput"`;

content = content.replace(target4, repl4);

const target5 = `                  title="Cols" 
                  defaultValue,
        inputType="3"
                  id="customTableColInput"`;

const repl5 = `                  title="Cols" 
                  defaultValue="3"
                  id="customTableColInput"`;

content = content.replace(target5, repl5);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed promptDialog and systemDialog');
