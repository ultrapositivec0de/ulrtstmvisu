import React from 'react';
import { cn } from '../../lib/utils';
import Reader, { type ReaderProps } from '../Reader';

export interface ReaderScreenProps extends ReaderProps {
  isVisible: boolean;
}

export const ReaderScreen: React.FC<ReaderScreenProps> = ({ isVisible, ...readerProps }) => {
  return (
    <div className={cn("flex-1 overflow-hidden bg-slate-900 flex flex-col", !isVisible && "hidden")}>
      <Reader {...readerProps} />
    </div>
  );
};
