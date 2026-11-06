import React from 'react';
import { TOCHeadingItem } from './types';
import { PostRenderer } from '../reader/PostRenderer';

interface DocReaderContentProps {
  title: string;
  tags?: string;
  content: string;
  headings: TOCHeadingItem[];
  isDarkMode?: boolean;
  visualStyle?: string;
  editorFontSize?: number;
  wysiwygSpacing?: number;
  beautifyEnabled?: boolean;
}

export const DocReaderContent: React.FC<DocReaderContentProps> = React.memo(({
  title,
  tags,
  content,
  headings: _headings,
  isDarkMode = true,
  visualStyle = 'dark',
  editorFontSize = 16,
  wysiwygSpacing = 1.6,
  beautifyEnabled = false
}) => {
  return (
    <PostRenderer
      body={content}
      title={title}
      tags={tags}
      mode="preview"
      isDarkMode={isDarkMode}
      visualStyle={visualStyle}
      fontSize={editorFontSize}
      lineHeight={wysiwygSpacing}
      beautifyEnabled={beautifyEnabled}
    />
  );
});

DocReaderContent.displayName = 'DocReaderContent';
export default DocReaderContent;
