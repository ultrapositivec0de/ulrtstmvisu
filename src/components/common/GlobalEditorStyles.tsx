import React from 'react';

interface GlobalEditorStylesProps {
  visualStyle: 'standard' | 'neon';
  neonTextColored: boolean;
}

export const GlobalEditorStyles: React.FC<GlobalEditorStylesProps> = React.memo(({
  visualStyle,
  neonTextColored,
}) => {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --accent: var(--accent-hex);
        --accent-rgb: var(--accent-color);
      }
      ${visualStyle === 'neon' ? `
        .theme-neon h1, .theme-neon h2, .theme-neon h3 {
          text-shadow: 0 0 15px rgba(var(--accent-rgb), 0.6), 0 0 5px rgba(var(--accent-rgb), 0.4) !important;
        }
        .theme-neon .markdown-body h1, .theme-neon .markdown-body h2, .theme-neon .markdown-body h3 {
          border-bottom: 1px solid rgba(var(--accent-rgb), 0.3) !important;
        }
        .theme-neon button.bg-cyan-600, .theme-neon button.bg-cyan-500 {
          box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.5), 0 0 10px rgba(var(--accent-rgb), 0.3) !important;
          text-shadow: none !important;
        }
        .theme-neon .logo-s {
          text-shadow: 1px 1px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8), 2px 2px 6px rgba(0,0,0,0.6);
          color: white !important;
          font-weight: 1000;
          -webkit-text-stroke: 0.3px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .theme-neon .neon-tab-glow {
          box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.4), 0 0 5px rgba(var(--accent-rgb), 0.2) !important;
          border: 1px solid rgba(var(--accent-rgb), 0.5) !important;
        }
        ${neonTextColored ? `
          .wysiwyg-editor, .wysiwyg-editor *, #main-editor {
            color: var(--accent) !important;
            caret-color: var(--accent) !important;
          }
          .wysiwyg-editor strong, .wysiwyg-editor b, #main-editor strong, #main-editor b {
            font-weight: 700 !important;
          }
        ` : ''}
      ` : ''}
      .bg-cyan-600, .bg-cyan-500 { background-color: var(--accent) !important; }
      .hover\\:bg-cyan-600:hover, .hover\\:bg-cyan-500:hover { background-color: var(--accent) !important; filter: brightness(0.9); }
      .text-cyan-400, .text-cyan-500 { color: var(--accent) !important; }
      .border-cyan-500, .border-cyan-400 { border-color: var(--accent) !important; }
      .from-cyan-500 { --tw-gradient-from: var(--accent) !important; }
      .to-blue-600 { --tw-gradient-to: var(--accent) !important; filter: brightness(1.1); }
      .shadow-cyan-500\\/20 { --tw-shadow-color: var(--accent) !important; }
      .shadow-cyan-900\\/20 { --tw-shadow-color: var(--accent) !important; opacity: 0.2; }
      .bg-cyan-500\\/10 { background-color: rgba(var(--accent-rgb), 0.1) !important; }
      .border-cyan-500\\/50 { border-color: rgba(var(--accent-rgb), 0.5) !important; }
      .hover\\:bg-cyan-500\\/10:hover { background-color: rgba(var(--accent-rgb), 0.1) !important; }
      @keyframes swing {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(15deg); }
        40% { transform: rotate(-10deg); }
        60% { transform: rotate(5deg); }
        80% { transform: rotate(-5deg); }
      }
      .animate-swing {
        animation: swing 2s ease-in-out infinite;
        transform-origin: top center;
      }

      .toolbar-btn {
        width: var(--toolbar-btn-size, 3rem) !important;
        height: var(--toolbar-btn-size, 3rem) !important;
        font-size: var(--toolbar-btn-font-size, 1rem) !important;
      }
      .toolbar-btn svg {
        width: var(--toolbar-icon-size, 1.25rem) !important;
        height: var(--toolbar-icon-size, 1.25rem) !important;
      }
      
      .wysiwyg-editor p,
      .wysiwyg-editor ul,
      .wysiwyg-editor ol,
      .wysiwyg-editor h1,
      .wysiwyg-editor h2,
      .wysiwyg-editor h3,
      .wysiwyg-editor h4,
      .wysiwyg-editor h5,
      .wysiwyg-editor h6,
      .wysiwyg-editor,
      #main-editor,
      .markdown-body {
        scroll-padding-bottom: 7rem !important;
      }
      .wysiwyg-editor blockquote,
      .wysiwyg-editor pre {
        margin-top: var(--wysiwyg-spacing, 18px) !important;
        margin-bottom: var(--wysiwyg-spacing, 18px) !important;
      }
      .wysiwyg-editor table,
      .wysiwyg-editor img {
        margin-top: var(--wysiwyg-spacing, 18px) !important;
        margin-bottom: var(--wysiwyg-spacing, 18px) !important;
      }

      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }
      
      .prose img {
        border-radius: 0.75rem;
        margin: 1.5rem 0;
      }
      .wysiwyg-editor table {
        border-collapse: collapse;
        width: 100%;
        margin: 1.5rem 0;
        border: 1px dashed rgba(255, 255, 255, 0.15);
      }
      .wysiwyg-editor th, .wysiwyg-editor td {
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 10px 12px !important;
        min-width: 90px;
        height: 42px !important;
        position: relative;
      }
      .wysiwyg-editor th {
        background-color: rgba(255, 255, 255, 0.07);
        font-weight: 700;
        text-align: left;
        color: #22d3ee !important;
      }
      /* Empty cells helper */
      .wysiwyg-editor th:empty::before, .wysiwyg-editor td:empty::before {
        content: "✎...";
        color: rgba(6, 182, 212, 0.45);
        font-size: 0.75rem;
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        font-style: italic;
      }
      .wysiwyg-editor th:focus, .wysiwyg-editor td:focus {
        outline: 2px solid #06b6d4 !important;
        outline-offset: -2px;
        background-color: rgba(6, 182, 212, 0.08) !important;
      }
      .pull-left {
        float: left;
        margin-right: 1.5rem;
        margin-bottom: 1rem;
        max-width: 45%;
      }
      .pull-right {
        float: right;
        margin-left: 1.5rem;
        margin-bottom: 1rem;
        max-width: 45%;
      }
      .text-center {
        text-align: center;
      }
      .text-justify {
        text-align: justify;
      }
      .clearfix::after {
        content: "";
        clear: both;
        display: table;
      }
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `}} />
  );
});

GlobalEditorStyles.displayName = 'GlobalEditorStyles';
