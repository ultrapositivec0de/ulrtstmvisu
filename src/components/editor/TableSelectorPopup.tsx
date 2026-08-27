import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TableSelectorPopupProps {
  showTableSelector: boolean;
  setShowTableSelector: (show: boolean) => void;
  tableSelectorPos: { x: number; y: number; direction: 'up' | 'down' } | null;
  tableImportFormat: 'markdown' | 'html';
  setTableImportFormat: (format: 'markdown' | 'html') => void;
  insertAtCursor: (text: string) => void;
}

export const TableSelectorPopup: React.FC<TableSelectorPopupProps> = React.memo(({
  showTableSelector,
  setShowTableSelector,
  tableSelectorPos,
  tableImportFormat,
  setTableImportFormat,
  insertAtCursor,
}) => {
  const [tableHover, setTableHover] = useState({ r: 0, c: 0 });
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);

  if (!showTableSelector || !tableSelectorPos) {
    return null;
  }

  const handleInsertMatrix = (rowIndex: number, colIndex: number) => {
    const r = rowIndex; // 0 for header-only
    const c = colIndex + 1;
    let table = '| ' + Array.from({ length: c }).map(() => 'Head').join(' | ') + ' |\n';
    table += '| ' + Array.from({ length: c }).map(() => '---').join(' | ') + ' |\n';
    for (let i = 0; i < r; i++) {
      table += '| ' + Array.from({ length: c }).map(() => 'Cell').join(' | ') + ' |\n';
    }
    insertAtCursor(table + '\n');
    setShowTableSelector(false);
  };

  const handleInsertCustom = () => {
    const r = Math.max(0, customRows);
    const c = Math.max(1, customCols);
    let table = '| ' + Array.from({ length: c }).map(() => 'Head').join(' | ') + ' |\n';
    table += '| ' + Array.from({ length: c }).map(() => '---').join(' | ') + ' |\n';
    for (let i = 0; i < r; i++) {
      table += '| ' + Array.from({ length: c }).map(() => 'Cell').join(' | ') + ' |\n';
    }
    insertAtCursor(table + '\n');
    setShowTableSelector(false);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9998]"
        onClick={() => setShowTableSelector(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: tableSelectorPos.direction === 'down' ? -10 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute bg-slate-900 border border-slate-700 shadow-2xl p-4 rounded-3xl"
          style={{
            left: tableSelectorPos.x,
            top: tableSelectorPos.direction === 'down' ? tableSelectorPos.y : undefined,
            bottom: tableSelectorPos.direction === 'up' ? tableSelectorPos.y : undefined,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insert Table</h3>
          </div>
          
          <div className="flex flex-col gap-2 mb-4 border-b border-slate-800 pb-3">
            <div className="flex justify-center gap-2 mb-2">
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setTableImportFormat('markdown'); }}
                className={cn(
                  "px-3 py-1 rounded text-xs font-bold transition-all",
                  tableImportFormat === 'markdown' ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                Markdown
              </button>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setTableImportFormat('html'); }}
                className={cn(
                  "px-3 py-1 rounded text-xs font-bold transition-all",
                  tableImportFormat === 'html' ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                HTML
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => {
                  insertAtCursor(tableImportFormat === 'markdown' ? '| Head |\n| --- |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n  </tr>\n</table>\n');
                  setShowTableSelector(false);
                }}
                className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30 flex items-center justify-center transition-colors font-medium"
              >
                1 Col Separator
              </button>
              <button 
                type="button"
                onClick={() => {
                  insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head |\n| --- | --- |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n</table>\n');
                  setShowTableSelector(false);
                }}
                className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30 flex items-center justify-center transition-colors font-medium"
              >
                2 Col Header
              </button>
              <button 
                type="button"
                onClick={() => {
                  insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n</table>\n');
                  setShowTableSelector(false);
                }}
                className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] rounded border border-cyan-500/30 flex items-center justify-center transition-colors font-medium"
              >
                2x2 Table
              </button>
              <button 
                type="button"
                onClick={() => {
                  insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head | Head |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n</table>\n');
                  setShowTableSelector(false);
                }}
                className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] rounded border border-cyan-500/30 flex items-center justify-center transition-colors font-medium"
              >
                3x3 Table
              </button>
            </div>
          </div>

          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Or draw standard matrix</div>
          <div className="flex flex-col gap-1 items-center">
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-1">
                {Array.from({ length: 10 }).map((_, colIndex) => {
                  const isHovered = rowIndex <= tableHover.r && colIndex <= tableHover.c;
                  return (
                    <div
                      key={colIndex}
                      onMouseEnter={() => setTableHover({ r: rowIndex, c: colIndex })}
                      onClick={() => handleInsertMatrix(rowIndex, colIndex)}
                      className={cn(
                        "w-4 h-4 border border-slate-700 rounded-[2px] cursor-pointer transition-all",
                        isHovered 
                          ? (rowIndex === 0 ? "bg-purple-500/60 border-purple-400" : "bg-cyan-500/50 border-cyan-400") 
                          : (rowIndex === 0 ? "bg-slate-800/80 border-slate-600 border-b-2 shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10" : "bg-slate-800 hover:border-slate-500")
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-center text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 py-1 rounded flex items-center justify-center gap-2">
            {tableHover.r === 0 ? (
              <><span className="text-purple-400">{tableHover.c + 1} Cols</span> <span className="text-purple-400/70">(Header / Separator)</span></>
            ) : (
              <><span className="text-cyan-400">{tableHover.c + 1} Cols</span> <span className="opacity-50">x</span> <span className="text-cyan-400">{tableHover.r + 1} Rows</span></>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
            <input 
              type="number" 
              min="0" 
              max="50" 
              title="Rows"
              value={customRows}
              onChange={(e) => setCustomRows(parseInt(e.target.value, 10) || 0)}
              id="customTableRowInput"
              className="w-16 bg-slate-800 text-white text-[10px] p-1.5 rounded outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700" 
            />
            <span className="text-slate-500 self-center text-xs">x</span>
            <input 
              type="number" 
              min="1" 
              max="50"
              title="Cols" 
              value={customCols}
              onChange={(e) => setCustomCols(parseInt(e.target.value, 10) || 1)}
              id="customTableColInput"
              className="w-16 bg-slate-800 text-white text-[10px] p-1.5 rounded outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700" 
            />
            <button 
              type="button"
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1"
              onClick={handleInsertCustom}
            >
              <Plus size={10} /> Add
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

TableSelectorPopup.displayName = 'TableSelectorPopup';
