import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { ImageItem } from '../../types';
import { PexelsSettings } from './useStockPhotos';

export type GalleryGridLayout = 'col' | 'col-table' | 'row' | 'grid-2' | 'col-img-text' | 'col-text-img';
export type ImagePosition = 'left' | 'right' | 'center' | 'plain';
export type SingleCaptionAlign = 'center' | 'left' | 'right';

export interface UseGalleryLayoutMarkupConfig {
  images: ImageItem[];
  setImages: Dispatch<SetStateAction<ImageItem[]>>;
  pexelsResults: any[];
  setPexelsResults: Dispatch<SetStateAction<any[]>>;
  galleryMode: 'local' | 'pexels' | 'unsplash' | 'pixabay';
  pexelsSettings: PexelsSettings;
  insertAtCursor: (text: string, selection?: 'select' | 'end') => void;
  onImageInserted?: () => void;
  t: (key: any) => string;
}

export function useGalleryLayoutMarkup({
  images,
  setImages,
  pexelsResults,
  setPexelsResults,
  galleryMode,
  pexelsSettings,
  insertAtCursor,
  onImageInserted,
  t,
}: UseGalleryLayoutMarkupConfig) {
  const [isGallerySettingsCollapsed, setIsGallerySettingsCollapsed] = useState(false);
  const [gridLayout, setGridLayout] = useState<GalleryGridLayout>('col');
  const [gridWithCaptions, setGridWithCaptions] = useState(false);
  const [singleCaptionAlign, setSingleCaptionAlign] = useState<SingleCaptionAlign>('center');

  const [isTextWrapEnabled, setIsTextWrapEnabled] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('steem_text_wrap_enabled') !== 'false';
  });

  const [imageInsertFormat, setImageInsertFormat] = useState<'html' | 'markdown'>(() => {
    if (typeof localStorage === 'undefined') return 'markdown';
    return (localStorage.getItem('steem_image_insert_format') as 'html' | 'markdown') || 'markdown';
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('steem_text_wrap_enabled', String(isTextWrapEnabled));
    }
  }, [isTextWrapEnabled]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('steem_image_insert_format', imageInsertFormat);
    }
  }, [imageInsertFormat]);

  const shortenName = useCallback((name: string, max: number = 30) => {
    if (name.length <= max) return name;
    return name.substring(0, max) + '...';
  }, []);

  const insertExternalImage = useCallback((photo: any, position: ImagePosition) => {
    const url = photo.url.split('?')[0];
    const name = shortenName(photo.alt || 'Photo');
    const photographer = photo.author;
    const photographerUrl = photo.authorUrl;

    let attribution = '';
    if (pexelsSettings.withAttribution) {
      const source = (photo.source || 'pexels').toLowerCase();
      const sourceName = source === 'unsplash' ? 'Unsplash' : source === 'pixabay' ? 'Pixabay' : 'Pexels';
      attribution = `<div align="${singleCaptionAlign}"><sup>By <a href="${photographerUrl}">${photographer}</a> on <a href="https://${source}.com">${sourceName}</a></sup></div>`;
    }

    if (imageInsertFormat === 'markdown') {
      const externalLinkUrl = photo.pageURL || photo.url.split('?')[0];
      let md = `![${name}](${url})`;
      if (pexelsSettings.linkEmbedded) {
        md = `[${md}](${externalLinkUrl})`;
      }

      let finalMd: string;
      if (position === 'plain') {
        finalMd = md + (attribution ? '\n\n' + attribution : '');
      } else if (position === 'center') {
        finalMd = `<center>\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</center>`;
      } else {
        finalMd = `<div class="pull-${position}">\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</div>`;
      }

      if (!isTextWrapEnabled && (position === 'left' || position === 'right')) {
        finalMd += '\n<div class="clearfix"></div>\n';
      }
      insertAtCursor(finalMd);
      if (onImageInserted) onImageInserted();
      return;
    }

    const imgHtml = `<img src="${url}" alt="${name}">`;
    let html = '';
    if (position === 'plain') html = imgHtml + (attribution ? '<br/>' + attribution : '');
    else if (position === 'left' || position === 'right') html = `<div class="pull-${position}">${imgHtml}<br/>${attribution}</div>`;
    else if (position === 'center') html = `<center>${imgHtml}<br/>${attribution}</center>`;

    if (!isTextWrapEnabled && (position === 'left' || position === 'right')) {
      html += '\n<div class="clearfix"></div>\n';
    }
    insertAtCursor(html);
    if (onImageInserted) onImageInserted();
  }, [shortenName, pexelsSettings, singleCaptionAlign, imageInsertFormat, isTextWrapEnabled, insertAtCursor, onImageInserted]);

  const insertImage = useCallback((url: string, name: string, position: ImagePosition) => {
    const sName = shortenName(name);
    const localImg = images.find(i => i.url === url);
    const exifTable = localImg?.exif || '';

    let attribution = '';
    if (gridWithCaptions) {
      attribution = `<div align="${singleCaptionAlign}"><sup> ✍️ </sup></div>`;
    }

    if (imageInsertFormat === 'markdown') {
      const md = `![${sName}](${url})`;
      let finalMd: string;
      if (position === 'plain') {
        finalMd = md + (attribution ? '\n\n' + attribution : '');
      } else if (position === 'center') {
        finalMd = `<center>\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</center>`;
      } else {
        finalMd = `<div class="pull-${position}">\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</div>`;
      }

      if (!isTextWrapEnabled && (position === 'left' || position === 'right')) {
        finalMd += '\n<div class="clearfix"></div>\n';
      }

      insertAtCursor(finalMd + exifTable, 'end');
      if (onImageInserted) onImageInserted();
      return;
    }

    const imgHtml = `<img src="${url}" alt="${sName}">`;
    let html = '';

    if (position === 'plain') {
      html = imgHtml + (attribution ? '<br/>' + attribution : '');
    } else if (position === 'left' || position === 'right') {
      html = `<div class="pull-${position}">${imgHtml}<br/>${attribution}</div>`;
    } else if (position === 'center') {
      html = `<center>${imgHtml}<br/>${attribution}</center>`;
    }

    if (!isTextWrapEnabled && (position === 'left' || position === 'right')) {
      html += '\n<div class="clearfix"></div>\n';
    }

    insertAtCursor(html + exifTable, 'end');
    if (onImageInserted) onImageInserted();
  }, [shortenName, images, gridWithCaptions, singleCaptionAlign, imageInsertFormat, isTextWrapEnabled, insertAtCursor, onImageInserted]);

  const insertGrid = useCallback(() => {
    const selected = galleryMode === 'local'
      ? images.filter(img => img.selected)
      : pexelsResults.filter(p => p.selected);

    if (selected.length === 0) return;

    let result = '';

    const getCaption = (item: any, index: number, isLocal: boolean, htmlMode: boolean = false) => {
      if (isLocal) return ` ✍️ `;

      const photo = item as any;
      const author = photo.photographer || item.author || 'Author';
      const source = (photo.source || 'pexels').toLowerCase();
      const authorUrl = photo.photographer_url || item.authorUrl || '#';
      const sourceName = source === 'unsplash' ? 'Unsplash' : source === 'pixabay' ? 'Pixabay' : 'Pexels';

      if (pexelsSettings.withAttribution) {
        if (htmlMode) {
          return `By <a href="${authorUrl}">${author}</a> on <a href="https://${source}.com">${sourceName}</a>`;
        }
        return `By [${author}](${authorUrl}) on [${sourceName}](https://${source}.com)`;
      }
      return ` ✍️ `;
    };

    const getMarkdownImg = (item: any, isLocal: boolean) => {
      if (isLocal) return `![${(item as ImageItem).name}](${item.url})`;
      const photo = item as any;
      let url = photo.src?.large2x || photo.src?.large || item.url;
      if (url?.includes('?')) url = url.split('?')[0];
      return `![Photo by ${photo.photographer || item.author || 'Author'}](${url})`;
    };

    const getHtmlImg = (item: any, isLocal: boolean) => {
      if (isLocal) return `<img src="${item.url}" style="width:100%">`;
      const photo = item as any;
      let url = photo.src?.large2x || photo.src?.large || item.url;
      if (url?.includes('?')) url = url.split('?')[0];
      return `<img src="${url}" style="width:100%">`;
    };

    const generateCell = (item: any, idx: number, isLocal: boolean, isHtml: boolean) => {
      const photo = item as any;
      const externalLinkUrl = item.url || item.pageURL || photo?.photographer_url || item.url;
      const imgMarkup = isHtml ? getHtmlImg(item, isLocal) : getMarkdownImg(item, isLocal);
      const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `<a href="${externalLinkUrl}">${imgMarkup}</a>` : imgMarkup;
      const caption = getCaption(item, idx, isLocal, isHtml);

      if (isHtml) {
        return `  <td style="padding:4px; vertical-align:top; width:50%">\n    ${linkedImg}\n    ${gridWithCaptions ? `<br/><div align="${singleCaptionAlign}"><sup>${caption}</sup></div>` : ''}\n  </td>`;
      }
      return `${linkedImg}${gridWithCaptions ? `\n\n<div align="${singleCaptionAlign}"><sup>${caption}</sup></div>` : ''}`;
    };

    const isLocal = galleryMode === 'local';

    if (imageInsertFormat === 'markdown') {
      if (gridLayout === 'col') {
        selected.forEach((item, idx) => {
          const mdImg = getMarkdownImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `[${mdImg}](${item.url})` : mdImg;
          result += `${linkedImg}\n`;
          if (gridWithCaptions) {
            result += `<div align="${singleCaptionAlign}"><sup>${getCaption(item, idx, isLocal, false)}</sup></div>\n`;
          }
          result += `\n`;
        });
      } else if (gridLayout === 'col-table') {
        result += `| ${t('galleryGrid')} |\n| --- |\n`;
        selected.forEach((item, idx) => {
          const mdImg = getMarkdownImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `[${mdImg}](${item.url})` : mdImg;
          let cell = linkedImg;
          if (gridWithCaptions) {
            cell += `<br/><sup>${getCaption(item, idx, isLocal, true)}</sup>`;
          }
          result += `| <center>${cell}</center> |\n`;
        });
        result += `\n`;
      } else if (gridLayout === 'grid-2') {
        result += `<table style="width:100%">\n`;
        for (let i = 0; i < selected.length; i += 2) {
          result += ` <tr>\n`;
          result += generateCell(selected[i], i, isLocal, true) + `\n`;
          if (selected[i + 1]) {
            result += generateCell(selected[i + 1], i + 1, isLocal, true) + `\n`;
          } else {
            result += `  <td style="width:50%"></td>\n`;
          }
          result += ` </tr>\n`;
        }
        result += `</table>\n\n`;
      } else if (gridLayout === 'row') {
        result += `|`;
        selected.forEach(() => { result += `   |`; });
        result += `\n|`;
        selected.forEach(() => { result += ` --- |`; });
        result += `\n|`;
        selected.forEach((item, idx) => {
          const mdImg = getMarkdownImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `[${mdImg}](${item.url})` : mdImg;
          let cell = linkedImg;
          if (gridWithCaptions) {
            cell += `<br/><sup>${getCaption(item, idx, isLocal, true)}</sup>`;
          }
          result += ` <center>${cell}</center> |`;
        });
        result += `\n\n`;
      } else if (gridLayout === 'col-img-text') {
        selected.forEach((item, idx) => {
          const mdImg = getMarkdownImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `[${mdImg}](${item.url})` : mdImg;
          const caption = gridWithCaptions ? `<br/><sup>${getCaption(item, idx, isLocal, true)}</sup>` : '';
          result += `<table style="width:100%">\n <tr>\n  <td style="width:50%; vertical-align:top; padding:6px">\n    ${linkedImg}${caption}\n  </td>\n  <td style="width:50%; vertical-align:top; padding:6px">\n    ${t('textPlaceholder')}\n  </td>\n </tr>\n</table>\n\n`;
        });
      } else if (gridLayout === 'col-text-img') {
        selected.forEach((item, idx) => {
          const mdImg = getMarkdownImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `[${mdImg}](${item.url})` : mdImg;
          const caption = gridWithCaptions ? `<br/><sup>${getCaption(item, idx, isLocal, true)}</sup>` : '';
          result += `<table style="width:100%">\n <tr>\n  <td style="width:50%; vertical-align:top; padding:6px">\n    ${t('textPlaceholder')}\n  </td>\n  <td style="width:50%; vertical-align:top; padding:6px">\n    ${linkedImg}${caption}\n  </td>\n </tr>\n</table>\n\n`;
        });
      }
    } else {
      if (gridLayout === 'col') {
        selected.forEach((item, idx) => {
          const imgHtml = getHtmlImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `<a href="${item.url}">${imgHtml}</a>` : imgHtml;
          result += `<center>\n  ${linkedImg}\n`;
          if (gridWithCaptions) {
            result += `  <br/>\n  <div align="${singleCaptionAlign}"><sup>${getCaption(item, idx, isLocal, true)}</sup></div>\n`;
          }
          result += `</center>\n<br/>\n\n`;
        });
      } else if (gridLayout === 'col-table' || gridLayout === 'row' || gridLayout === 'grid-2') {
        result += `<table style="width:100%">\n`;
        if (gridLayout === 'col-table') {
          selected.forEach((item, idx) => {
            const imgHtml = getHtmlImg(item, isLocal);
            const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `<a href="${item.url}">${imgHtml}</a>` : imgHtml;
            result += ` <tr>\n  <td style="padding:4px; text-align:center">\n    ${linkedImg}\n    ${gridWithCaptions ? `<br/><sup>${getCaption(item, idx, isLocal, true)}</sup>` : ''}\n  </td>\n </tr>\n`;
          });
        } else if (gridLayout === 'row') {
          result += ` <tr>\n`;
          selected.forEach((item, idx) => {
            const imgHtml = getHtmlImg(item, isLocal);
            const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `<a href="${item.url}">${imgHtml}</a>` : imgHtml;
            result += `  <td style="padding:4px; text-align:center; vertical-align:top">\n    ${linkedImg}\n    ${gridWithCaptions ? `<br/><sup>${getCaption(item, idx, isLocal, true)}</sup>` : ''}\n  </td>\n`;
          });
          result += ` </tr>\n`;
        } else if (gridLayout === 'grid-2') {
          for (let i = 0; i < selected.length; i += 2) {
            result += ` <tr>\n`;
            result += generateCell(selected[i], i, isLocal, true) + `\n`;
            if (selected[i + 1]) {
              result += generateCell(selected[i + 1], i + 1, isLocal, true) + `\n`;
            } else {
              result += `  <td style="width:50%"></td>\n`;
            }
            result += ` </tr>\n`;
          }
        }
        result += `</table>\n\n`;
      } else if (gridLayout === 'col-img-text') {
        selected.forEach((item, idx) => {
          const imgHtml = getHtmlImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `<a href="${item.url}">${imgHtml}</a>` : imgHtml;
          const caption = gridWithCaptions ? `<br/><sup>${getCaption(item, idx, isLocal, true)}</sup>` : '';
          result += `<table style="width:100%">\n <tr>\n  <td style="width:50%; vertical-align:top; padding:6px">\n    ${linkedImg}${caption}\n  </td>\n  <td style="width:50%; vertical-align:top; padding:6px">\n    ${t('textPlaceholder')}\n  </td>\n </tr>\n</table>\n\n`;
        });
      } else if (gridLayout === 'col-text-img') {
        selected.forEach((item, idx) => {
          const imgHtml = getHtmlImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `<a href="${item.url}">${imgHtml}</a>` : imgHtml;
          const caption = gridWithCaptions ? `<br/><sup>${getCaption(item, idx, isLocal, true)}</sup>` : '';
          result += `<table style="width:100%">\n <tr>\n  <td style="width:50%; vertical-align:top; padding:6px">\n    ${t('textPlaceholder')}\n  </td>\n  <td style="width:50%; vertical-align:top; padding:6px">\n    ${linkedImg}${caption}\n  </td>\n </tr>\n</table>\n\n`;
        });
      }
    }

    insertAtCursor(result, 'end');
    if (onImageInserted) onImageInserted();

    setImages(prev => prev.map(img => ({ ...img, selected: false })));
    setPexelsResults(prev => prev.map(p => ({ ...p, selected: false })));
  }, [galleryMode, images, pexelsResults, pexelsSettings, gridWithCaptions, singleCaptionAlign, imageInsertFormat, gridLayout, insertAtCursor, onImageInserted, t, setImages, setPexelsResults]);

  return {
    isGallerySettingsCollapsed,
    setIsGallerySettingsCollapsed,
    gridLayout,
    setGridLayout,
    gridWithCaptions,
    setGridWithCaptions,
    singleCaptionAlign,
    setSingleCaptionAlign,
    isTextWrapEnabled,
    setIsTextWrapEnabled,
    imageInsertFormat,
    setImageInsertFormat,
    shortenName,
    insertExternalImage,
    insertImage,
    insertGrid,
  };
}
