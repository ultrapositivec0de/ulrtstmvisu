import React, { useCallback } from 'react';
import { useEditorStore } from '../store';

interface LineComponentProps {
  index: number;
}

export const LineComponent = React.memo(({ index }: LineComponentProps) => {
  // Підписуємося ТІЛЬКИ на конкретний рядок за його індексом.
  // Це гарантує, що зміна іншого рядка не викличе перерендер цього компонента.
  const line = useEditorStore(state => state.lines[index]);
  const updateLine = useEditorStore(state => state.updateLine);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateLine(index, e.target.value);
  }, [index, updateLine]);

  return (
    <div className="flex group relative">
      <div className="w-8 text-right pr-2 text-slate-600 text-xs select-none pt-1 opacity-50 group-hover:opacity-100">
        {index + 1}
      </div>
      <input
        type="text"
        className="flex-1 bg-transparent text-slate-300 outline-none p-1 font-mono text-sm"
        value={line || ''}
        onChange={handleChange}
        placeholder={index === 0 ? "Введіть текст..." : ""}
      />
    </div>
  );
});

LineComponent.displayName = 'LineComponent';
