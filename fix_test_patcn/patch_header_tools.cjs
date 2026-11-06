const fs = require('fs');
const path = require('path');

const headerPath = path.join(__dirname, '../src/components/header/Header.tsx');
let content = fs.readFileSync(headerPath, 'utf8');

// 1. Mobile tools replacement
const mobileOld = `                {/* Group 1: Text Formatting */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center">
                  <IconButton icon={Bold} onClick={() => { TOOLS_MAP['B']?.action(); setShowMobileToolsOpen(false); }} title={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
                  <IconButton icon={Italic} onClick={() => { TOOLS_MAP['I']?.action(); setShowMobileToolsOpen(false); }} title={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
                  <IconButton icon={Strikethrough} onClick={() => { TOOLS_MAP['S']?.action(); setShowMobileToolsOpen(false); }} title={t('strike')} className="shrink-0 size-8" active={activeFormats.strikethrough} />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['sub']?.action(); setShowMobileToolsOpen(false); }} title={t('subscript')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0", activeFormats.sub ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400")}>X₂</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['sup']?.action(); setShowMobileToolsOpen(false); }} title={t('superscript')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0", activeFormats.sup ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400")}>X²</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['Color']?.action(); setShowMobileToolsOpen(false); }} title={t('redText')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0 transition-colors", activeFormats.phishy ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "text-red-500")}>A</button>
                </div>
                {/* Group 2: Headings */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['H1']?.action(); setShowMobileToolsOpen(false); }} title={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['H2']?.action(); setShowMobileToolsOpen(false); }} title={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['H3']?.action(); setShowMobileToolsOpen(false); }} title={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
                </div>
                {/* Group 3: Alignment */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={AlignLeft} onClick={() => { TOOLS_MAP['Left']?.action(); setShowMobileToolsOpen(false); }} title={t('leftText')} className="shrink-0 size-8" />
                  <IconButton icon={AlignCenter} onClick={() => { TOOLS_MAP['Center']?.action(); setShowMobileToolsOpen(false); }} title={t('center')} className="shrink-0 size-8" />
                  <IconButton icon={AlignRight} onClick={() => { TOOLS_MAP['Right']?.action(); setShowMobileToolsOpen(false); }} title={t('rightText')} className="shrink-0 size-8" />
                  <IconButton icon={AlignJustify} onClick={() => { TOOLS_MAP['Justify']?.action(); setShowMobileToolsOpen(false); }} title={t('justify')} className="shrink-0 size-8" />
                </div>
                {/* Group 4: Lists, Quotes & Breaks */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center">
                  <IconButton icon={Quote} onClick={() => { TOOLS_MAP['Quote']?.action(); setShowMobileToolsOpen(false); }} title={t('quote')} className="shrink-0 size-8" />
                  <IconButton icon={ListIcon} onClick={() => { TOOLS_MAP['List']?.action(); setShowMobileToolsOpen(false); }} title={t('listBullet')} className="shrink-0 size-8" />
                  <IconButton icon={ListOrdered} onClick={() => { TOOLS_MAP['Num']?.action(); setShowMobileToolsOpen(false); }} title={t('listOrdered')} className="shrink-0 size-8" />
                  <IconButton icon={Minus} onClick={() => { TOOLS_MAP['HR']?.action(); setShowMobileToolsOpen(false); }} title={t('hr')} className="shrink-0 size-8" />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['Esc']?.action(); setShowMobileToolsOpen(false); }} title={t('escapeChar')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[11px] font-mono font-bold text-slate-400 shrink-0">\\</button>
                </div>
                {/* Group 5: Code & Links */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  <span className="shrink-0 mr-auto">Code</span>
                  <div className="flex items-center gap-1">
                    <IconButton icon={LinkIcon} onClick={() => { TOOLS_MAP['Link']?.action(); setShowMobileToolsOpen(false); }} title={t('link')} className="shrink-0 size-8" />
                    <IconButton icon={Terminal} onClick={() => { TOOLS_MAP['Inline']?.action(); setShowMobileToolsOpen(false); }} title={t('inlineCode')} className="shrink-0 size-8" active={activeFormats.code} />
                    <IconButton icon={Code} onClick={() => { TOOLS_MAP['Code']?.action(); setShowMobileToolsOpen(false); }} title={t('codeBlock')} className="shrink-0 size-8" />
                    <IconButton icon={Indent} onClick={() => { TOOLS_MAP['Indent']?.action(); setShowMobileToolsOpen(false); }} title={t('indent')} className="shrink-0 size-8" />
                  </div>
                </div>
                {/* Group 6: Tables */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  <span className="shrink-0 mr-auto">{t('table')}</span>
                  <div className="flex items-center gap-1">
                    <IconButton icon={LayoutGrid} onClick={(e) => { TOOLS_MAP['Table']?.action(e); setShowMobileToolsOpen(false); }} title={t('table')} className="shrink-0 size-8" />
                    <IconButton icon={SplitSquareHorizontal} onClick={() => { TOOLS_MAP['Separator']?.action(); setShowMobileToolsOpen(false); }} title="1 Col" className="shrink-0 size-8" />
                    <IconButton icon={TableIcon} onClick={() => { TOOLS_MAP['Import']?.action(); setShowMobileToolsOpen(false); }} title={t('importTable')} className="shrink-0 size-8" />
                  </div>
                </div>
                {/* Group 7: Media & Gallery */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  <span className="shrink-0 mr-auto">{t('gallery')}</span>
                  <div className="flex items-center gap-1">
                    <IconButton icon={ImageIcon} onClick={() => { TOOLS_MAP['Img']?.action(); setShowMobileToolsOpen(false); }} title={t('insertLocalImage')} className="shrink-0 size-8" />
                    <IconButton icon={Images} onClick={() => { TOOLS_MAP['Gallery']?.action(); setShowMobileToolsOpen(false); }} title={t('miniGallery')} className="shrink-0 size-8" />
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['Caption']?.action(); setShowMobileToolsOpen(false); }} title={t('captionShort')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-tighter">Cap</button>
                  </div>
                </div>
                {/* Group 8: Inserts & Templates */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={AtSign} onClick={() => { TOOLS_MAP['Mentions']?.action(); setShowMobileToolsOpen(false); }} title={t('mentions')} className="shrink-0 size-8" />
                  <IconButton icon={FileText} onClick={() => { TOOLS_MAP['Templates']?.action(); setShowMobileToolsOpen(false); }} title={t('templates')} className="shrink-0 size-8" />
                </div>`;

const mobileNew = `                {/* Group 1: Text Formatting */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center">
                  <IconButton id="mobile-tool-B" data-tool="B" icon={Bold} onClick={() => { TOOLS_MAP['B']?.action(); setShowMobileToolsOpen(false); }} title={t('bold')} ariaLabel={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
                  <IconButton id="mobile-tool-I" data-tool="I" icon={Italic} onClick={() => { TOOLS_MAP['I']?.action(); setShowMobileToolsOpen(false); }} title={t('italic')} ariaLabel={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
                  <IconButton id="mobile-tool-S" data-tool="S" icon={Strikethrough} onClick={() => { TOOLS_MAP['S']?.action(); setShowMobileToolsOpen(false); }} title={t('strike')} ariaLabel={t('strike')} className="shrink-0 size-8" active={activeFormats.strikethrough} />
                  <button id="mobile-tool-sub" data-tool="sub" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['sub']?.action(); setShowMobileToolsOpen(false); }} title={t('subscript')} aria-label={t('subscript')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0", activeFormats.sub ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400")}>X₂</button>
                  <button id="mobile-tool-sup" data-tool="sup" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['sup']?.action(); setShowMobileToolsOpen(false); }} title={t('superscript')} aria-label={t('superscript')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0", activeFormats.sup ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400")}>X²</button>
                  <button id="mobile-tool-Color" data-tool="Color" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['Color']?.action(); setShowMobileToolsOpen(false); }} title={t('redText')} aria-label={t('redText')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0 transition-colors", activeFormats.phishy ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "text-red-500")}>A</button>
                </div>
                {/* Group 2: Headings */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <button id="mobile-tool-H1" data-tool="H1" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['H1']?.action(); setShowMobileToolsOpen(false); }} title={t('h1')} aria-label={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
                  <button id="mobile-tool-H2" data-tool="H2" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['H2']?.action(); setShowMobileToolsOpen(false); }} title={t('h2')} aria-label={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
                  <button id="mobile-tool-H3" data-tool="H3" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['H3']?.action(); setShowMobileToolsOpen(false); }} title={t('h3')} aria-label={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
                </div>
                {/* Group 3: Alignment */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton id="mobile-tool-Left" data-tool="Left" icon={AlignLeft} onClick={() => { TOOLS_MAP['Left']?.action(); setShowMobileToolsOpen(false); }} title={t('leftText')} ariaLabel={t('leftText')} className="shrink-0 size-8" />
                  <IconButton id="mobile-tool-Center" data-tool="Center" icon={AlignCenter} onClick={() => { TOOLS_MAP['Center']?.action(); setShowMobileToolsOpen(false); }} title={t('center')} ariaLabel={t('center')} className="shrink-0 size-8" />
                  <IconButton id="mobile-tool-Right" data-tool="Right" icon={AlignRight} onClick={() => { TOOLS_MAP['Right']?.action(); setShowMobileToolsOpen(false); }} title={t('rightText')} ariaLabel={t('rightText')} className="shrink-0 size-8" />
                  <IconButton id="mobile-tool-Justify" data-tool="Justify" icon={AlignJustify} onClick={() => { TOOLS_MAP['Justify']?.action(); setShowMobileToolsOpen(false); }} title={t('justify')} ariaLabel={t('justify')} className="shrink-0 size-8" />
                </div>
                {/* Group 4: Lists, Quotes & Breaks */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center">
                  <IconButton id="mobile-tool-Quote" data-tool="Quote" icon={Quote} onClick={() => { TOOLS_MAP['Quote']?.action(); setShowMobileToolsOpen(false); }} title={t('quote')} ariaLabel={t('quote')} className="shrink-0 size-8" />
                  <IconButton id="mobile-tool-List" data-tool="List" icon={ListIcon} onClick={() => { TOOLS_MAP['List']?.action(); setShowMobileToolsOpen(false); }} title={t('listBullet')} ariaLabel={t('listBullet')} className="shrink-0 size-8" />
                  <IconButton id="mobile-tool-Num" data-tool="Num" icon={ListOrdered} onClick={() => { TOOLS_MAP['Num']?.action(); setShowMobileToolsOpen(false); }} title={t('listOrdered')} ariaLabel={t('listOrdered')} className="shrink-0 size-8" />
                  <IconButton id="mobile-tool-HR" data-tool="HR" icon={Minus} onClick={() => { TOOLS_MAP['HR']?.action(); setShowMobileToolsOpen(false); }} title={t('hr')} ariaLabel={t('hr')} className="shrink-0 size-8" />
                  <button id="mobile-tool-Esc" data-tool="Esc" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['Esc']?.action(); setShowMobileToolsOpen(false); }} title={t('escapeChar')} aria-label={t('escapeChar')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[11px] font-mono font-bold text-slate-400 shrink-0">\\</button>
                </div>
                {/* Group 5: Code & Links */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  <span className="shrink-0 mr-auto">Code</span>
                  <div className="flex items-center gap-1">
                    <IconButton id="mobile-tool-Link" data-tool="Link" icon={LinkIcon} onClick={() => { TOOLS_MAP['Link']?.action(); setShowMobileToolsOpen(false); }} title={t('link')} ariaLabel={t('link')} className="shrink-0 size-8" />
                    <IconButton id="mobile-tool-Inline" data-tool="Inline" icon={Terminal} onClick={() => { TOOLS_MAP['Inline']?.action(); setShowMobileToolsOpen(false); }} title={t('inlineCode')} ariaLabel={t('inlineCode')} className="shrink-0 size-8" active={activeFormats.code} />
                    <IconButton id="mobile-tool-Code" data-tool="Code" icon={Code} onClick={() => { TOOLS_MAP['Code']?.action(); setShowMobileToolsOpen(false); }} title={t('codeBlock')} ariaLabel={t('codeBlock')} className="shrink-0 size-8" />
                    <IconButton id="mobile-tool-Indent" data-tool="Indent" icon={Indent} onClick={() => { TOOLS_MAP['Indent']?.action(); setShowMobileToolsOpen(false); }} title={t('indent')} ariaLabel={t('indent')} className="shrink-0 size-8" />
                  </div>
                </div>
                {/* Group 6: Tables */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  <span className="shrink-0 mr-auto">{t('table')}</span>
                  <div className="flex items-center gap-1">
                    <IconButton id="mobile-tool-Table" data-tool="Table" icon={LayoutGrid} onClick={(e) => { TOOLS_MAP['Table']?.action(e); setShowMobileToolsOpen(false); }} title={t('table')} ariaLabel={t('table')} className="shrink-0 size-8" />
                    <IconButton id="mobile-tool-Separator" data-tool="Separator" icon={SplitSquareHorizontal} onClick={() => { TOOLS_MAP['Separator']?.action(); setShowMobileToolsOpen(false); }} title={t('tableSelector1ColSep')} ariaLabel={t('tableSelector1ColSep')} className="shrink-0 size-8" />
                    <IconButton id="mobile-tool-Import" data-tool="Import" icon={TableIcon} onClick={() => { TOOLS_MAP['Import']?.action(); setShowMobileToolsOpen(false); }} title={t('importTable')} ariaLabel={t('importTable')} className="shrink-0 size-8" />
                  </div>
                </div>
                {/* Group 7: Media & Gallery */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  <span className="shrink-0 mr-auto">{t('gallery')}</span>
                  <div className="flex items-center gap-1">
                    <IconButton id="mobile-tool-Img" data-tool="Img" icon={ImageIcon} onClick={() => { TOOLS_MAP['Img']?.action(); setShowMobileToolsOpen(false); }} title={t('insertLocalImage')} ariaLabel={t('insertLocalImage')} className="shrink-0 size-8" />
                    <IconButton id="mobile-tool-Gallery" data-tool="Gallery" icon={Images} onClick={() => { TOOLS_MAP['Gallery']?.action(); setShowMobileToolsOpen(false); }} title={t('miniGallery')} ariaLabel={t('miniGallery')} className="shrink-0 size-8" />
                    <button id="mobile-tool-Caption" data-tool="Caption" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { TOOLS_MAP['Caption']?.action(); setShowMobileToolsOpen(false); }} title={t('captionShort')} aria-label={t('captionShort')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-tighter">Cap</button>
                  </div>
                </div>
                {/* Group 8: Inserts & Templates */}
                <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton id="mobile-tool-Mentions" data-tool="Mentions" icon={AtSign} onClick={() => { TOOLS_MAP['Mentions']?.action(); setShowMobileToolsOpen(false); }} title={t('mentions')} ariaLabel={t('mentions')} className="shrink-0 size-8" />
                  <IconButton id="mobile-tool-Templates" data-tool="Templates" icon={FileText} onClick={() => { TOOLS_MAP['Templates']?.action(); setShowMobileToolsOpen(false); }} title={t('templates')} ariaLabel={t('templates')} className="shrink-0 size-8" />
                </div>`;

if (!content.includes(mobileOld)) {
  console.error("Could not find mobileOld chunk in Header.tsx");
  process.exit(1);
}
content = content.replace(mobileOld, mobileNew);

// 2. Desktop tools replacement
const desktopOld = `<div className="tools-scroll-container mx-auto flex items-center justify-start gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap w-full lg:w-auto">
              <IconButton icon={Bold} onClick={() => TOOLS_MAP['B']?.action()} title={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
              <IconButton icon={Italic} onClick={() => TOOLS_MAP['I']?.action()} title={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
              <IconButton icon={Strikethrough} onClick={() => TOOLS_MAP['S']?.action()} title={t('strike')} className="shrink-0 size-8" active={activeFormats.strikethrough} />
              <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['sub']?.action()} title={t('subscript')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0", activeFormats.sub ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50" : "text-slate-400")}>X₂</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['sup']?.action()} title={t('superscript')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0", activeFormats.sup ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50" : "text-slate-400")}>X²</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['Color']?.action()} title={t('redText')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0 transition-colors", activeFormats.phishy ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "text-red-500")}>A</button>
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['H1']?.action()} title={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['H2']?.action()} title={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['H3']?.action()} title={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton icon={AlignLeft} onClick={() => TOOLS_MAP['Left']?.action()} title={t('leftText')} className="shrink-0 size-8" />
              <IconButton icon={AlignCenter} onClick={() => TOOLS_MAP['Center']?.action()} title={t('center')} className="shrink-0 size-8" />
              <IconButton icon={AlignRight} onClick={() => TOOLS_MAP['Right']?.action()} title={t('rightText')} className="shrink-0 size-8" />
              <IconButton icon={AlignJustify} onClick={() => TOOLS_MAP['Justify']?.action()} title={t('justify')} className="shrink-0 size-8" />
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton icon={Quote} onClick={() => TOOLS_MAP['Quote']?.action()} title={t('quote')} className="shrink-0 size-8" />
              <IconButton icon={ListIcon} onClick={() => TOOLS_MAP['List']?.action()} title={t('listBullet')} className="shrink-0 size-8" />
              <IconButton icon={ListOrdered} onClick={() => TOOLS_MAP['Num']?.action()} title={t('listOrdered')} className="shrink-0 size-8" />
              <IconButton icon={Minus} onClick={() => TOOLS_MAP['HR']?.action()} title={t('hr')} className="shrink-0 size-8" />
              <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['Esc']?.action()} title={t('escapeChar')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[11px] font-mono font-bold text-slate-400 shrink-0">\\</button>
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton icon={LinkIcon} onClick={() => TOOLS_MAP['Link']?.action()} title={t('link')} className="shrink-0 size-8" />
              <IconButton icon={Terminal} onClick={() => TOOLS_MAP['Inline']?.action()} title={t('inlineCode')} className="shrink-0 size-8" active={activeFormats.code} />
              <IconButton icon={Code} onClick={() => TOOLS_MAP['Code']?.action()} title={t('codeBlock')} className="shrink-0 size-8" />
              <IconButton icon={Indent} onClick={() => TOOLS_MAP['Indent']?.action()} title={t('indent')} className="shrink-0 size-8" />
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton icon={LayoutGrid} onClick={(e) => TOOLS_MAP['Table']?.action(e)} title={t('table')} className="shrink-0 size-8" />
              <IconButton icon={SplitSquareHorizontal} onClick={() => TOOLS_MAP['Separator']?.action()} title="1 Col" className="shrink-0 size-8" />
              <IconButton icon={TableIcon} onClick={() => TOOLS_MAP['Import']?.action()} title={t('importTable')} className="shrink-0 size-8" />
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton icon={ImageIcon} onClick={() => TOOLS_MAP['Img']?.action()} title={t('insertLocalImage')} className="shrink-0 size-8" />
              <IconButton icon={Images} onClick={() => TOOLS_MAP['Gallery']?.action()} title={t('miniGallery')} className="shrink-0 size-8" />
              <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['Caption']?.action()} title={t('captionShort')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-tighter">Cap</button>
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton icon={AtSign} onClick={() => TOOLS_MAP['Mentions']?.action()} title={t('mentions')} className="shrink-0 size-8" />
              <IconButton icon={FileText} onClick={() => TOOLS_MAP['Templates']?.action()} title={t('templates')} className="shrink-0 size-8" />
            </div>`;

const desktopNew = `<div className="tools-scroll-container mx-auto flex items-center justify-start gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap w-full lg:w-auto">
              <IconButton id="header-tool-B" data-tool="B" icon={Bold} onClick={() => TOOLS_MAP['B']?.action()} title={t('bold')} ariaLabel={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
              <IconButton id="header-tool-I" data-tool="I" icon={Italic} onClick={() => TOOLS_MAP['I']?.action()} title={t('italic')} ariaLabel={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
              <IconButton id="header-tool-S" data-tool="S" icon={Strikethrough} onClick={() => TOOLS_MAP['S']?.action()} title={t('strike')} ariaLabel={t('strike')} className="shrink-0 size-8" active={activeFormats.strikethrough} />
              <button id="header-tool-sub" data-tool="sub" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['sub']?.action()} title={t('subscript')} aria-label={t('subscript')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0", activeFormats.sub ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50" : "text-slate-400")}>X₂</button>
              <button id="header-tool-sup" data-tool="sup" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['sup']?.action()} title={t('superscript')} aria-label={t('superscript')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0", activeFormats.sup ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50" : "text-slate-400")}>X²</button>
              <button id="header-tool-Color" data-tool="Color" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['Color']?.action()} title={t('redText')} aria-label={t('redText')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0 transition-colors", activeFormats.phishy ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "text-red-500")}>A</button>
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <button id="header-tool-H1" data-tool="H1" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['H1']?.action()} title={t('h1')} aria-label={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
              <button id="header-tool-H2" data-tool="H2" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['H2']?.action()} title={t('h2')} aria-label={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
              <button id="header-tool-H3" data-tool="H3" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['H3']?.action()} title={t('h3')} aria-label={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton id="header-tool-Left" data-tool="Left" icon={AlignLeft} onClick={() => TOOLS_MAP['Left']?.action()} title={t('leftText')} ariaLabel={t('leftText')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Center" data-tool="Center" icon={AlignCenter} onClick={() => TOOLS_MAP['Center']?.action()} title={t('center')} ariaLabel={t('center')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Right" data-tool="Right" icon={AlignRight} onClick={() => TOOLS_MAP['Right']?.action()} title={t('rightText')} ariaLabel={t('rightText')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Justify" data-tool="Justify" icon={AlignJustify} onClick={() => TOOLS_MAP['Justify']?.action()} title={t('justify')} ariaLabel={t('justify')} className="shrink-0 size-8" />
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton id="header-tool-Quote" data-tool="Quote" icon={Quote} onClick={() => TOOLS_MAP['Quote']?.action()} title={t('quote')} ariaLabel={t('quote')} className="shrink-0 size-8" />
              <IconButton id="header-tool-List" data-tool="List" icon={ListIcon} onClick={() => TOOLS_MAP['List']?.action()} title={t('listBullet')} ariaLabel={t('listBullet')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Num" data-tool="Num" icon={ListOrdered} onClick={() => TOOLS_MAP['Num']?.action()} title={t('listOrdered')} ariaLabel={t('listOrdered')} className="shrink-0 size-8" />
              <IconButton id="header-tool-HR" data-tool="HR" icon={Minus} onClick={() => TOOLS_MAP['HR']?.action()} title={t('hr')} ariaLabel={t('hr')} className="shrink-0 size-8" />
              <button id="header-tool-Esc" data-tool="Esc" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['Esc']?.action()} title={t('escapeChar')} aria-label={t('escapeChar')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[11px] font-mono font-bold text-slate-400 shrink-0">\\</button>
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton id="header-tool-Link" data-tool="Link" icon={LinkIcon} onClick={() => TOOLS_MAP['Link']?.action()} title={t('link')} ariaLabel={t('link')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Inline" data-tool="Inline" icon={Terminal} onClick={() => TOOLS_MAP['Inline']?.action()} title={t('inlineCode')} ariaLabel={t('inlineCode')} className="shrink-0 size-8" active={activeFormats.code} />
              <IconButton id="header-tool-Code" data-tool="Code" icon={Code} onClick={() => TOOLS_MAP['Code']?.action()} title={t('codeBlock')} ariaLabel={t('codeBlock')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Indent" data-tool="Indent" icon={Indent} onClick={() => TOOLS_MAP['Indent']?.action()} title={t('indent')} ariaLabel={t('indent')} className="shrink-0 size-8" />
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton id="header-tool-Table" data-tool="Table" icon={LayoutGrid} onClick={(e) => TOOLS_MAP['Table']?.action(e)} title={t('table')} ariaLabel={t('table')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Separator" data-tool="Separator" icon={SplitSquareHorizontal} onClick={() => TOOLS_MAP['Separator']?.action()} title={t('tableSelector1ColSep')} ariaLabel={t('tableSelector1ColSep')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Import" data-tool="Import" icon={TableIcon} onClick={() => TOOLS_MAP['Import']?.action()} title={t('importTable')} ariaLabel={t('importTable')} className="shrink-0 size-8" />
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton id="header-tool-Img" data-tool="Img" icon={ImageIcon} onClick={() => TOOLS_MAP['Img']?.action()} title={t('insertLocalImage')} ariaLabel={t('insertLocalImage')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Gallery" data-tool="Gallery" icon={Images} onClick={() => TOOLS_MAP['Gallery']?.action()} title={t('miniGallery')} ariaLabel={t('miniGallery')} className="shrink-0 size-8" />
              <button id="header-tool-Caption" data-tool="Caption" type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => TOOLS_MAP['Caption']?.action()} title={t('captionShort')} aria-label={t('captionShort')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-tighter">Cap</button>
              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
              <IconButton id="header-tool-Mentions" data-tool="Mentions" icon={AtSign} onClick={() => TOOLS_MAP['Mentions']?.action()} title={t('mentions')} ariaLabel={t('mentions')} className="shrink-0 size-8" />
              <IconButton id="header-tool-Templates" data-tool="Templates" icon={FileText} onClick={() => TOOLS_MAP['Templates']?.action()} title={t('templates')} ariaLabel={t('templates')} className="shrink-0 size-8" />
            </div>`;

if (!content.includes(desktopOld)) {
  console.error("Could not find desktopOld chunk in Header.tsx");
  process.exit(1);
}
content = content.replace(desktopOld, desktopNew);

fs.writeFileSync(headerPath, content, 'utf8');
console.log("Successfully patched Header.tsx with unified IDs and data-tool attributes!");
