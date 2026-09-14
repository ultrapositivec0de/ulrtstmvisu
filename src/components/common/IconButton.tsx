import React from 'react';
import { cn } from '../../lib/utils';

export interface IconButtonProps {
  icon: any;
  onClick: (e?: React.MouseEvent | any) => void;
  title?: string;
  className?: string;
  active?: boolean;
  size?: number;
  iconClassName?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  title,
  className,
  active = false,
  size,
  iconClassName
}) => (
  <button
    type="button"
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()}
    onPointerDown={(e) => e.preventDefault()}
    title={title}
    style={{
      minWidth: 'var(--header-btn-size, 2rem)',
      minHeight: 'var(--header-btn-size, 2rem)',
    }}
    className={cn(
      "p-1.5 rounded-md transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer",
      "hover:bg-slate-700/50 active:scale-95",
      active ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400",
      className
    )}
  >
    <Icon 
      className={cn("shrink-0 transition-transform", iconClassName)}
      style={{
        width: size ? `${size}px` : 'var(--header-icon-size, 18px)',
        height: size ? `${size}px` : 'var(--header-icon-size, 18px)',
      }}
    />
  </button>
);
