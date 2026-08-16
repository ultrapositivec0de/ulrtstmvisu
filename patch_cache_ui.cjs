const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetUI = `                    {/* Desktop PWA Install (Visible only when PWA logic triggers or if we want a manual button) */}
                    {isPwaInstallable && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-cyan-500/30 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg"><Download size={18} /></div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{t('installApp')}</h3>
                            <p className="text-xs text-slate-400">{t('installAppDesc')}</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleInstallPwa}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/20"
                        >
                          Install
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {settingsTab === 'gallery' && (`

const newUI = `                    {/* Desktop PWA Install (Visible only when PWA logic triggers or if we want a manual button) */}
                    {isPwaInstallable && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-cyan-500/30 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg"><Download size={18} /></div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{t('installApp')}</h3>
                            <p className="text-xs text-slate-400">{t('installAppDesc')}</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleInstallPwa}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/20"
                        >
                          Install
                        </button>
                      </div>
                    )}

                    {/* NATIVE CACHE CLEAR (Visible only in Native Apps) */}
                    {typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).Neutralino) && (
                      <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Trash2 size={18} /></div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{t('clearNativeCache') || 'Clear System Cache'}</h3>
                            <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight">Clear images, loaded lists & temporary files. Drafts & templates will NOT be deleted.</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleClearCache}
                          className="px-4 py-2 bg-rose-600/80 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-900/20 shrink-0"
                        >
                          {t('clearNativeCache') || 'Clear'}
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {settingsTab === 'gallery' && (`

content = content.replace(targetUI, newUI);

fs.writeFileSync('src/App.tsx', content);
