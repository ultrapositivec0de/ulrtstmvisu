import React from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Shield, 
  Info, 
  Terminal, 
  ChevronRight, 
  FileText, 
  Copy 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appAgent: string;
  setAppAgent: (val: string) => void;
  changelog: ChangelogEntry[];
  getChangelogText: () => string;
  t: (key: any) => string;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  appAgent,
  setAppAgent,
  changelog,
  getChangelogText,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div key="modal-about" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-none p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-500 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-cyan-500 rounded-2xl flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6 shadow-none">U</div>
          <h2 className="text-3xl font-bold mb-2 tracking-tight">Ultra Steem <span className="text-cyan-400">Editor</span></h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-4">{t('aboutDesc')}</p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
            <Shield size={14} /> Web Crypto AES-GCM Secured
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          {/* Credits Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <Info size={18} /> {t('credits')}
            </h3>
            <div className="space-y-4 text-xs text-slate-400">
              <div>
                <p className="font-bold text-slate-200">{t('author')}</p>
                <p className="text-slate-400">@ultrapositive / ultrapositive.eth</p>
              </div>
              <div>
                <p className="font-bold text-slate-200">{t('license')}</p>
                <span className="text-slate-300 font-bold">Apache 2.0</span>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('appAgent')}</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={appAgent} 
                    onChange={(e) => {
                      setAppAgent(e.target.value);
                      localStorage.setItem('steem_app_agent', e.target.value);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <p className="text-[9px] text-slate-600 italic">{t('appAgentDesc')}</p>
              </div>
            </div>
          </div>

          {/* Tech Stack Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Terminal size={18} /> {t('packagesUsed')}
              </h3>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {[
                  { n: 'react', v: '19.0.0', d: 'Ядро інтерфейсу, реактивність та керування станом компонентів.' },
                  { n: '@blazeapps/dsteem', v: '0.12.2', d: 'Повноцінна клієнтська інтеграція з блокчейном Steem (транзакції, підписи, апвоути).' },
                  { n: 'motion', v: '13.1.0', d: 'Професійні та плавні анімації інтерфейсу для відмінного UX.' },
                  { n: 'marked', v: '18.0.7', d: 'Швидкісний і безпечний парсер Markdown розмітки в чистий HTML.' },
                  { n: 'dompurify', v: '3.4.13', d: 'Надійне очищення HTML від XSS-загроз при читанні стрічки дописів.' },
                  { n: 'lucide-react', v: '1.31.0', d: 'Набір сучасних та лаконічних векторних іконок для UI.' },
                  { n: 'buffer', v: '6.0.3', d: 'Поліфіл буфера для криптографічних підписів у браузерному оточенні.' },
                  { n: 'fflate', v: '0.8.3', d: 'Ультра-швидке та легковажне стиснення й розархівування чернеток у ZIP.' },
                  { n: 'exifreader', v: '4.38.1', d: 'Зчитування та аналіз метаданих EXIF з фотографій для параметрів зйомки.' },
                  { n: 'idb-keyval', v: '6.2.2', d: 'Надшвидке сховище автозбереження чернеток в IndexedDB браузера.' },
                  { n: 'idiomorph', v: '0.7.4', d: 'Інтелектуальне зіставлення (morphing) DOM для безшовної синхронізації без втрати фокусу й курсору.' },
                  { n: 'zustand', v: '5.0.14', d: 'Легковажне керування глобальним станом застосунку.' }
                ].map(pkg => (
                  <div key={pkg.n} className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col gap-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-cyan-400 font-mono leading-none">{pkg.n}</span>
                      <span className="text-[8px] text-slate-500 font-mono font-bold">v.{pkg.v}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-normal">{pkg.d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => window.open('https://github.com/ultrapositivecode/steem-editor-pro-react', '_blank')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-700/50 group"
              >
                 GitHub <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          
          {/* Changelog Section */}
          <div className="col-span-1 md:col-span-2 space-y-4 pt-6 mt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
               <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                 <FileText size={18} /> Changelog & Updates
               </h3>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(getChangelogText());
                   const btn = document.getElementById('copy-log-btn');
                   if (btn) {
                     const orig = btn.innerText;
                     btn.innerText = "COPIED!";
                     setTimeout(() => {
                       btn.innerText = orig;
                     }, 2000);
                   }
                 }}
                 id="copy-log-btn"
                 className="text-[9px] font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest px-2 py-1 bg-slate-800/50 rounded flex gap-1 items-center"
               >
                 <Copy size={10} /> COPY LOG
               </button>
            </div>
            
            <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-xl p-4">
               {changelog.map((log, index) => (
                 <div key={`${log.version}-${index}`} className={cn("space-y-2", index > 0 && "pt-3 border-t border-slate-800/50")}>
                   <div className="flex items-center gap-2">
                     <span className={cn("text-xs font-bold px-2 py-0.5 rounded", index === 0 ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 bg-slate-800")}>{log.version}</span>
                     <span className="text-[10px] text-slate-500">{log.date}</span>
                   </div>
                   <ul className={cn("text-sm list-inside list-disc space-y-2 pl-1", index === 0 ? "text-slate-300" : "text-slate-400 space-y-1")}>
                     {log.changes.map((change, i) => (
                       <li key={i}>{change}</li>
                     ))}
                   </ul>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
