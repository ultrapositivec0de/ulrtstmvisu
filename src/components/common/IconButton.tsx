import React from 'react';
import { cn } from '../../lib/utils';

export interface IconButtonProps {
  icon: any;
  onClick: (e?: React.MouseEvent | any) => void;
  title?: string;
  className?: string;
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  title,
  className,
  active = false
}) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()}
    title={title}
    className={cn(
      "p-2 rounded-md transition-all duration-200 flex items-center justify-center shrink-0",
      "hover:bg-slate-700/50 active:scale-95",
      active ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400",
      className
    )}
  >
    <Icon className="w-[clamp(1rem,1.1vw,1.25rem)] h-[clamp(1rem,1.1vw,1.25rem)]" />
  </button>
);
