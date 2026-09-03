import { useState, useCallback, useMemo, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { ImageItem, AuthType } from '../types';
import ExifReader from 'exifreader';
import { SecurityService } from '../services/securityService';
import { Buffer } from 'buffer';
import { useImageSearch } from './useImageSearch';

const STORAGE_KEY_IMAGES = 'steem_uploaded_images_v2';

export const sanitizeFilename = (name: string): string => {
  const ukrToLatin: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
    'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ь': '', 'ю': 'yu', 'я': 'ya', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E',
    'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
  };
  
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  const base = parts.join('.');
  const result = base.split('').map(char => ukrToLatin[char] || char).join('');
  
  return result
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.-]/g, '')
    .substring(0, 40) + (ext ? '.' + ext : '');
};

export interface SteemGalleryConfig {
  t: (key: any) => string;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  promptDialog: (message: string, defaultValue?: string, title?: string, inputType?: 'text' | 'password') => Promise<string | null>;
  insertAtCursor: (text: string, selection?: 'select' | 'end') => void;
  setActiveModal: (modal: string | null) => void;
  initVault: () => Promise<void>;
  isUnlocked: boolean;
  isVaultInitialized: boolean;
  setVaultPin: Dispatch<SetStateAction<string>>;
  setPubLog: Dispatch<SetStateAction<{ msg: string; type: 'success' | 'error' | 'loading' | null }>>;
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
  selectedVaultUser: string;
  vaultAccounts: string[];
  pexelsApiKey: string | null;
  pixabayApiKey: string | null;
  unsplashAccessKey: string | null;
  performanceMode: boolean;
  onImageInserted?: () => void;
  setIsMiniGalleryOpen: Dispatch<SetStateAction<boolean>>;
}

export function useSteemGallery(config: SteemGalleryConfig) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const isImagesLoaded = useRef(false);
  const [sourceInput, setSourceInput] = useState('');
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(() => localStorage.getItem('steem_gallery_collapsed') === 'true');
  const [galleryView, setGalleryView] = useState<'grid' | 'list'>('grid');

  const {
    galleryMode,
    setGalleryMode,
    gallerySearch,
    setGallerySearch,
    isSearchingPexels,
    setIsSearchingPexels,
    pexelsResults,
    setPexelsResults,
    pexelsPage,
    setPexelsPage,
    handleExternalSearch,
  } = useImageSearch(config);
  const [isTrafficOptimized, setIsTrafficOptimized] = useState(() => {
    return localStorage.getItem('steem_traffic_optimized') === 'true';
  });

  const [isGallerySettingsCollapsed, setIsGallerySettingsCollapsed] = useState(false);
  const [gridLayout, setGridLayout] = useState<'col' | 'col-table' | 'row' | 'grid-2' | 'col-img-text' | 'col-text-img'>('col');
  const [gridWithCaptions, setGridWithCaptions] = useState(false);
  const [singleCaptionAlign, setSingleCaptionAlign] = useState<'center' | 'left' | 'right'>('center');
  const [isTextWrapEnabled, setIsTextWrapEnabled] = useState(() => {
    return localStorage.getItem('steem_text_wrap_enabled') !== 'false';
  });
  const [isExifEnabled, setIsExifEnabled] = useState(() => localStorage.getItem('steem_exif_enabled') === 'true');
  const [imageInsertFormat, setImageInsertFormat] = useState<'html' | 'markdown'>(() => {
    return (localStorage.getItem('steem_image_insert_format') as 'html' | 'markdown') || 'markdown';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [imageUploadAccount, setImageUploadAccount] = useState('');

  const [pexelsSettings, setPexelsSettings] = useState(() => {
    const saved = localStorage.getItem('steem_pexels_settings');
    return saved ? JSON.parse(saved) : { withAttribution: true, linkEmbedded: true };
  });

  // Load and sync localStorage settings
  useEffect(() => {
    localStorage.setItem('steem_gallery_collapsed', String(isGalleryCollapsed));
  }, [isGalleryCollapsed]);

  useEffect(() => {
    localStorage.setItem('steem_traffic_optimized', String(isTrafficOptimized));
  }, [isTrafficOptimized]);

  useEffect(() => {
    localStorage.setItem('steem_text_wrap_enabled', String(isTextWrapEnabled));
  }, [isTextWrapEnabled]);

  useEffect(() => {
    localStorage.setItem('steem_exif_enabled', String(isExifEnabled));
  }, [isExifEnabled]);

  useEffect(() => {
    localStorage.setItem('steem_image_insert_format', imageInsertFormat);
  }, [imageInsertFormat]);

  useEffect(() => {
    localStorage.setItem('steem_pexels_settings', JSON.stringify(pexelsSettings));
  }, [pexelsSettings]);

  useEffect(() => {
    localStorage.setItem('steem_gallery_cache_results', JSON.stringify(pexelsResults));
  }, [pexelsResults]);

  useEffect(() => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    if (!hasKeychain && config.vaultAccounts.length > 0) {
      if (!imageUploadAccount || !config.vaultAccounts.includes(imageUploadAccount)) {
        // eslint-disable-next-line
        setImageUploadAccount(config.selectedVaultUser || config.vaultAccounts[0]);
      }
    }
  }, [config.vaultAccounts, config.selectedVaultUser, imageUploadAccount]);

  const filteredLocalImages = useMemo(() => {
    if (!gallerySearch.trim()) return images;
    return images.filter(img => 
      img.name.toLowerCase().includes(gallerySearch.toLowerCase()) || 
      img.url.toLowerCase().includes(gallerySearch.toLowerCase())
    );
  }, [images, gallerySearch]);

  const parseImages = useCallback((input: string) => {
    setSourceInput(input);
    const urlPattern = /(https?:\/\/[^[\]\s<>"'()]+?\.(?:jpg|jpeg|png|webp|gif|svg))/gi;
    const matches = input.match(urlPattern) || [];
    const uniqueUrls = Array.from(new Set(matches));
    
    setImages(prev => {
      const existingUrls = new Set(prev.map(img => img.url));
      const newImages = uniqueUrls.map(url => ({
        url,
        name: url.split('/').pop()?.split('?')[0] || 'image',
        selected: false
      })).filter(img => !existingUrls.has(img.url));
      
      const keptImages = prev.filter(img => uniqueUrls.includes(img.url));
      return [...keptImages, ...newImages];
    });
  }, []);

  const toggleImageSelection = useCallback((filteredIdx: number) => {
    const url = filteredLocalImages[filteredIdx]?.url;
    if (!url) return;
    setImages(prev => {
      const idx = prev.findIndex(i => i.url === url);
      if (idx === -1) return prev;
      const newImages = [...prev];
      newImages[idx] = { ...newImages[idx], selected: !newImages[idx].selected };
      return newImages;
    });
  }, [filteredLocalImages]);

  const moveImageLocal = useCallback((filteredIdx: number, direction: -1 | 1) => {
    const targetFilteredIdx = filteredIdx + direction;
    if (targetFilteredIdx < 0 || targetFilteredIdx >= filteredLocalImages.length) return;

    const url1 = filteredLocalImages[filteredIdx].url;
    const url2 = filteredLocalImages[targetFilteredIdx].url;

    setImages(prev => {
      const idx1 = prev.findIndex(i => i.url === url1);
      const idx2 = prev.findIndex(i => i.url === url2);
      if (idx1 === -1 || idx2 === -1) return prev;

      const newImages = [...prev];
      const temp = newImages[idx1];
      newImages[idx1] = newImages[idx2];
      newImages[idx2] = temp;
      return newImages;
    });
  }, [filteredLocalImages]);

  // Load saved images on mount
  useEffect(() => {
    config.initVault();

    const savedLinks = localStorage.getItem('steem_editor_source_links');
    if (savedLinks) {
      // eslint-disable-next-line
      parseImages(savedLinks);
    } else {
      const savedImages = localStorage.getItem(STORAGE_KEY_IMAGES);
      if (savedImages) {
        try {
          const parsed = JSON.parse(savedImages);
          if (Array.isArray(parsed)) {
            setImages(parsed);
          }
        } catch (e) {
          console.error("Failed to load images", e);
        }
      }
    }

    setTimeout(() => {
      isImagesLoaded.current = true;
    }, 1000);
  }, [parseImages]);

  // Save images on change (once loaded)
  useEffect(() => {
    if (isImagesLoaded.current) {
      localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
    }
  }, [images]);

  const toggleGalleryMode = useCallback((mode: 'local' | 'pexels' | 'unsplash' | 'pixabay') => {
    setGalleryMode(mode);
    setGallerySearch('');
  }, []);

  const getExifTableFromBlob = useCallback(async (file: File | Blob): Promise<string> => {
    if (!isExifEnabled) return '';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer);
      if (!tags) return '';

      const make = tags['Make']?.description || '';
      const model = tags['Model']?.description || '';
      const fNumber = tags['FNumber']?.description ? `f/${tags['FNumber'].description}` : '';
      const iso = tags['ISOSpeedRatings']?.description ? `ISO ${tags['ISOSpeedRatings'].description}` : '';
      const shutter = tags['ExposureTime']?.description || '';
      const focal = tags['FocalLength']?.description || '';

      if (!make && !model && !iso) return '';

      let table = '\n| Param | Camera Info |\n| --- | --- |\n';
      if (make || model) table += `| 📸 | ${make} ${model} |\n`;
      if (fNumber) table += `| 🔘 | ${fNumber} |\n`;
      if (shutter) table += `| ⏲️ | ${shutter} |\n`;
      if (iso) table += `| 🎞️ | ${iso} |\n`;
      if (focal) table += `| 🔍 | ${focal} |\n`;
      
      return table + '\n';
    } catch (e) {
      console.error('Exif error:', e);
      return '';
    }
  }, [isExifEnabled]);

  const shortenName = useCallback((name: string, max: number = 30) => {
    if (name.length <= max) return name;
    return name.substring(0, max) + '...';
  }, []);

  const insertExternalImage = useCallback((photo: any, position: 'left' | 'right' | 'center' | 'plain') => {
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

      if (!isTextWrapEnabled && (position === 'left' || position === 'right')) finalMd += '\n<div class="clearfix"></div>\n';
      config.insertAtCursor(finalMd);
      if (config.onImageInserted) config.onImageInserted();
      return;
    }

    const imgHtml = `<img src="${url}" alt="${name}">`;
    let html = '';
    if (position === 'plain') html = imgHtml + (attribution ? '<br/>' + attribution : '');
    else if (position === 'left' || position === 'right') html = `<div class="pull-${position}">${imgHtml}<br/>${attribution}</div>`;
    else if (position === 'center') html = `<center>${imgHtml}<br/>${attribution}</center>`;

    if (!isTextWrapEnabled && (position === 'left' || position === 'right')) html += '\n<div class="clearfix"></div>\n';
    config.insertAtCursor(html);
    if (config.onImageInserted) config.onImageInserted();
  }, [shortenName, pexelsSettings, singleCaptionAlign, imageInsertFormat, isTextWrapEnabled, config]);

  const insertImage = useCallback((url: string, name: string, position: 'left' | 'right' | 'center' | 'plain') => {
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

      config.insertAtCursor(finalMd + exifTable, 'end');
      if (config.onImageInserted) config.onImageInserted();
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

    config.insertAtCursor(html + exifTable, 'end');
    if (config.onImageInserted) config.onImageInserted();
  }, [shortenName, images, gridWithCaptions, singleCaptionAlign, imageInsertFormat, isTextWrapEnabled, config]);

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
        result += `| ${config.t('galleryGrid')} |\n| --- |\n`;
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
        selected.forEach(() => result += `   |`);
        result += `\n|`;
        selected.forEach(() => result += ` --- |`);
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
        selected.forEach((item) => {
          const mdImg = getMarkdownImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `[${mdImg}](${item.url})` : mdImg;
          result += `<div class="pull-left">\n\n${linkedImg}\n\n</div>\n\n${config.t('textPlaceholder')}\n\n<div class="clearfix"></div>\n\n`;
        });
      } else if (gridLayout === 'col-text-img') {
        selected.forEach((item) => {
          const mdImg = getMarkdownImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `[${mdImg}](${item.url})` : mdImg;
          result += `<div class="pull-right">\n\n${linkedImg}\n\n</div>\n\n${config.t('textPlaceholder')}\n\n<div class="clearfix"></div>\n\n`;
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
        selected.forEach((item) => {
          const imgHtml = getHtmlImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `<a href="${item.url}">${imgHtml}</a>` : imgHtml;
          result += `<div class="pull-left">${linkedImg}</div>\n${config.t('textPlaceholder')}\n<div class="clearfix"></div>\n\n`;
        });
      } else if (gridLayout === 'col-text-img') {
        selected.forEach((item) => {
          const imgHtml = getHtmlImg(item, isLocal);
          const linkedImg = (pexelsSettings.linkEmbedded && !isLocal) ? `<a href="${item.url}">${imgHtml}</a>` : imgHtml;
          result += `<div class="pull-right">${linkedImg}</div>\n${config.t('textPlaceholder')}\n<div class="clearfix"></div>\n\n`;
        });
      }
    }

    config.insertAtCursor(result, 'end');
    if (config.onImageInserted) config.onImageInserted();

    setImages(prev => prev.map(img => ({ ...img, selected: false })));
    setPexelsResults(prev => prev.map(p => ({ ...p, selected: false })));
  }, [galleryMode, images, pexelsResults, pexelsSettings, gridWithCaptions, singleCaptionAlign, imageInsertFormat, gridLayout, config]);

  const uploadExternalImage = useCallback(async (url: string, fileName: string = 'image.jpg') => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const uploadAuthType = imageUploadAccount ? 'VAULT' : (hasKeychain ? 'KEYCHAIN' : 'VAULT');
    let activeUser = imageUploadAccount;
    
    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        activeUser = config.selectedVaultUser || (config.vaultAccounts.length > 0 ? config.vaultAccounts[0] : '');
      } else {
        activeUser = config.username;
      }
    }
    
    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        config.notify(config.t('needVaultAccount'), 'error');
        config.setActiveModal('keys');
        return;
      } else {
        const inputUser = await config.promptDialog(config.t('username'));
        if (!inputUser) return;
        activeUser = inputUser.replace('@', '').trim();
        config.setUsername(activeUser);
      }
    }

    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      let unlocked = false;
      let pinErrorMsg = '';
      while (!unlocked) {
        const pass = await config.promptDialog(
          pinErrorMsg ? `${config.t('pinError')} (${pinErrorMsg}). ${config.t('enterPin')}` : config.t('enterPin'),
          '',
          undefined,
          'password'
        );
        if (!pass) return;
        try {
          await SecurityService.unlock(pass);
          config.initVault();
          unlocked = true;
        } catch (e: any) {
          pinErrorMsg = e.message || 'Incorrect PIN';
          config.notify(`❌ ${pinErrorMsg}`, 'error');
        }
      }
    } else if (uploadAuthType === 'KEYCHAIN') {
      if (!(window as any).steem_keychain) {
        config.notify(config.t('noKeychain'), 'error');
        return;
      }
    }

    setIsUploading(true);
    config.setPubLog({ msg: config.t('preparingUpload').replace('{name}', fileName), type: 'loading' });
    
    try {
      let blob: Blob;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        blob = await res.blob();
      } catch {
        config.setPubLog({ msg: config.t('proxyAttempt'), type: 'loading' });
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(config.t('proxyError'));
        blob = await res.blob();
      }

      const file = new File([blob], fileName, { type: blob.type });
      let signature = '';
      if (uploadAuthType === 'VAULT') {
        const arrayBuffer = await blob.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
        const dataToSign = Buffer.concat([prefix, fileBuffer]);
        signature = await SecurityService.signBuffer(dataToSign, activeUser);
      } else {
        signature = await SecurityService.signImageChallengeWithKeychain(file, activeUser);
      }

      const formData = new FormData();
      formData.append("file", file);
      const uploadUrl = `https://steemitimages.com/${activeUser}/${signature}`;
      const response = await fetch(uploadUrl, { method: "POST", body: formData });
      
      if (!response.ok) throw new Error(config.t('serverError') + response.status);
      const data = await response.json();
      const finalUrl = data.url || data.link || data.data?.url;
      
      if (finalUrl) {
        const newImg: ImageItem = { url: finalUrl, name: fileName, selected: false };
        setImages(prev => [newImg, ...prev]);
        setSourceInput(prev => finalUrl + "\n" + prev);
      }
    } catch (err: any) {
      console.error(err);
      config.setPubLog({ msg: `❌ ${config.t('error')}: ${err.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
      setTimeout(() => config.setPubLog({ msg: '', type: null }), 3000);
    }
  }, [imageUploadAccount, config]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    const rawFiles = e.target.files; if (!rawFiles || rawFiles.length === 0) return;
    const files = Array.from(rawFiles);
    
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const uploadAuthType = imageUploadAccount ? 'VAULT' : (hasKeychain ? 'KEYCHAIN' : 'VAULT');
    let activeUser = imageUploadAccount;
    
    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        activeUser = config.selectedVaultUser || (config.vaultAccounts.length > 0 ? config.vaultAccounts[0] : '');
      } else {
        activeUser = config.username;
      }
    }
    
    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        config.notify(config.t('needVaultAccount'), 'error');
        config.setActiveModal('keys');
        return;
      } else {
        const inputUser = await config.promptDialog(config.t('username'));
        if (!inputUser) return;
        activeUser = inputUser.replace('@', '').trim();
        config.setUsername(activeUser);
      }
    }

    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      let unlocked = false;
      let pinErrorMsg = '';
      while (!unlocked) {
        const pass = await config.promptDialog(
          pinErrorMsg ? `${config.t('pinError')} (${pinErrorMsg}). ${config.t('enterPin')}` : config.t('enterPin'),
          '',
          undefined,
          'password'
        );
        if (!pass) return;
        try {
          await SecurityService.unlock(pass);
          config.initVault();
          unlocked = true;
        } catch (e: any) {
          pinErrorMsg = e.message || 'Incorrect PIN';
          config.notify(`❌ ${pinErrorMsg}`, 'error');
        }
      }
    } else if (uploadAuthType === 'KEYCHAIN') {
      if (!(window as any).steem_keychain) {
        config.notify(config.t('noKeychain'), 'error');
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    
    const uploadVaultWithProgress = (file: File, signature: string, user: string, index: number): Promise<any> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        const uploadUrl = `https://steemitimages.com/${user}/${signature}`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            config.setPubLog({ 
               msg: config.t('uploadProgress')
                .replace('{current}', (index + 1).toString())
                .replace('{total}', files.length.toString())
                .replace('{name}', `${file.name} (${percent}%)`), 
              type: 'loading' 
            });
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(config.t('serverError') + xhr.status));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.timeout = 300000;
        xhr.send(formData);
      });
    };

    for (let i = 0; i < files.length; i++) {
      const originalFile = files[i];
      const sanitizedName = sanitizeFilename(originalFile.name);
      const file = new File([originalFile], sanitizedName, { type: originalFile.type });
      
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const exifTable = await getExifTableFromBlob(originalFile);

        let signature = '';
        if (uploadAuthType === 'VAULT') {
          const arrayBuffer = await file.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);
          const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
          const dataToSign = Buffer.concat([prefix, fileBuffer]);
          
          let attempt = 0;
          let uploaded = false;
          while (attempt < 3 && !uploaded) {
            attempt++;
            try {
              config.setPubLog({ 
                msg: `[${i + 1}/${files.length}] ` + config.t('signingImage').replace('{name}', file.name) + (attempt > 1 ? ` (спроба ${attempt})` : ''), 
                type: 'loading' 
              });
              signature = await SecurityService.signBuffer(dataToSign, activeUser);
              const data = await uploadVaultWithProgress(file, signature, activeUser, i);
              const url = data.url || data.link || data.data?.url;
              if (url) {
                setImages(prev => [
                  ...prev.slice(0, i),
                  { url, name: file.name, selected: false, exif: exifTable },
                  ...prev.slice(i)
                ]);
                setSourceInput(prev => url + "\n" + prev);
                successCount++;
                uploaded = true;
                if (i === 0) {
                  insertImage(url, file.name, 'plain');
                }
              }
            } catch (err) {
              if (attempt >= 3) throw err;
              await new Promise(r => setTimeout(r, 1500 * attempt));
            }
          }
        } else {
          config.setPubLog({ 
            msg: `[${i + 1}/${files.length}] ` + config.t('uploadProgress').replace('{current}', (i + 1).toString()).replace('{total}', files.length.toString()).replace('{name}', file.name), 
            type: 'loading' 
          });

          signature = await SecurityService.signImageChallengeWithKeychain(file, activeUser);
          
          const formData = new FormData();
          formData.append("file", file);
          const resp = await fetch(`https://steemitimages.com/${activeUser}/${signature}`, { method: "POST", body: formData });
          if (!resp.ok) throw new Error(config.t('serverError') + resp.status);
          const data = await resp.json();
          const url = data.url || data.link || data.data?.url;
          if (url) {
            setImages(prev => [
              ...prev.slice(0, i),
              { url, name: file.name, selected: false, exif: exifTable },
              ...prev.slice(i)
            ]);
            setSourceInput(prev => url + "\n" + prev);
            successCount++;
            if (i === 0) {
              insertImage(url, file.name, 'plain');
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        config.setPubLog({ msg: `❌ ${config.t('fileError')} ${i + 1}: ${file.name} - ${err.message}`, type: 'error' });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    setIsUploading(false);
    if (successCount > 0) {
      config.setPubLog({ 
        msg: config.t('uploadComplete').replace('{count}', successCount.toString()).replace('{total}', files.length.toString()), 
        type: 'success' 
      });
      setTimeout(() => config.setPubLog({ msg: '', type: null }), 3000);
      if (files.length > 1) {
        config.setIsMiniGalleryOpen(true);
      }
    }
  }, [imageUploadAccount, config, isUploading, getExifTableFromBlob, insertImage]);

  return {
    images,
    setImages,
    sourceInput,
    setSourceInput,
    isGalleryCollapsed,
    setIsGalleryCollapsed,
    galleryMode,
    setGalleryMode,
    galleryView,
    setGalleryView,
    gallerySearch,
    setGallerySearch,
    isSearchingPexels,
    setIsSearchingPexels,
    pexelsResults,
    setPexelsResults,
    pexelsPage,
    setPexelsPage,
    isTrafficOptimized,
    setIsTrafficOptimized,
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
    isExifEnabled,
    setIsExifEnabled,
    imageInsertFormat,
    setImageInsertFormat,
    isUploading,
    setIsUploading,
    imageUploadAccount,
    setImageUploadAccount,
    pexelsSettings,
    setPexelsSettings,
    filteredLocalImages,
    parseImages,
    toggleImageSelection,
    moveImageLocal,
    toggleGalleryMode,
    handleExternalSearch,
    insertExternalImage,
    insertImage,
    insertGrid,
    uploadExternalImage,
    handleFileUpload
  };
}
