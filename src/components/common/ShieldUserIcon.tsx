import React from 'react';

export const ShieldUserIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <g transform="matrix(1.1 0 0 1.1 -1.2 -1.2)">
      <path d="M12 22s9-4 9-10V5l-9-3-9 3v7c0 6 9 10 9 10" />
      <path d="M8 17a4 4 0 0 1 8 0" />
      <circle cx="12" cy="9.5" r="3" />
    </g>
  </svg>
);
