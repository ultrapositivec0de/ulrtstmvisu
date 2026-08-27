const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const replacement = `  const {
    images, setImages, sourceInput, setSourceInput,
    isGalleryCollapsed, setIsGalleryCollapsed, isGallerySettingsCollapsed, setIsGallerySettingsCollapsed,
    isUploading, setIsUploading, imageUploadAccount, setImageUploadAccount,
    gallerySearch, setGallerySearch, galleryView, setGalleryView,
    galleryMode, setGalleryMode, pexelsPage, setPexelsPage,
    pexelsResults, setPexelsResults, isSearchingPexels, setIsSearchingPexels,
    gridLayout, setGridLayout, gridWithCaptions, setGridWithCaptions,
    singleCaptionAlign, setSingleCaptionAlign, pexelsSettings, setPexelsSettings,
    isTextWrapEnabled, setIsTextWrapEnabled, isExifEnabled, setIsExifEnabled,
    imageInsertFormat, setImageInsertFormat, isTrafficOptimized, setIsTrafficOptimized,
    filteredLocalImages, parseImages, toggleImageSelection, moveImageLocal,
    toggleGalleryMode, handleExternalSearch, insertExternalImage, insertImage,
    insertGrid, uploadExternalImage, handleFileUpload
  } = gallery;

  useEffect(() => {
    lastKeyboardToggleTimeRef.current = Date.now();
  }, [isKeyboardOpen]);`;

content = content.replace(`  useEffect(() => {
    lastKeyboardToggleTimeRef.current = Date.now();
  }, [isKeyboardOpen]);`, replacement);

fs.writeFileSync('src/App.tsx', content);
