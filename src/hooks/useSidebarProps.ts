import { useMemo } from 'react';
import { type SidebarProps } from '../components/sidebar/Sidebar';
import { useSteemGallery } from './useSteemGallery';
import { useSteemAuth } from './useSteemAuth';

export type BuildSidebarPropsInput = SidebarProps;

export interface CompositeSidebarPropsInput {
  gallery: ReturnType<typeof useSteemGallery>;
  auth: ReturnType<typeof useSteemAuth>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  getSidebarMotionConfig: () => any;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  performanceMode: boolean;
  setPerformanceMode?: (val: boolean) => void;
  setActiveModal: (modal: any) => void;
  notify: (msg: string, type?: any) => void;
  t: (key: any) => string;
}

export function isCompositeSidebarPropsInput(
  input: BuildSidebarPropsInput | CompositeSidebarPropsInput
): input is CompositeSidebarPropsInput {
  return 'gallery' in input && 'auth' in input;
}

/**
 * buildSidebarProps:
 * Pure utility function to assemble and validate SidebarProps either from
 * direct props or a high-level composite container (gallery, auth, ui).
 */
export function buildSidebarProps(input: BuildSidebarPropsInput | CompositeSidebarPropsInput): SidebarProps {
  if (isCompositeSidebarPropsInput(input)) {
    const { gallery, auth, isSidebarOpen, setIsSidebarOpen, getSidebarMotionConfig, fileInputRef, performanceMode, setPerformanceMode, setActiveModal, notify, t } = input;
    return {
      isSidebarOpen,
      setIsSidebarOpen,
      isGalleryCollapsed: gallery.isGalleryCollapsed,
      setIsGalleryCollapsed: gallery.setIsGalleryCollapsed,
      getSidebarMotionConfig,
      username: auth.username,
      vaultAccounts: auth.vaultAccounts,
      selectedVaultUser: auth.selectedVaultUser,
      imageUploadAccount: gallery.imageUploadAccount,
      setImageUploadAccount: gallery.setImageUploadAccount,
      authType: auth.authType,
      keychainAccounts: auth.keychainAccounts,
      onSelectAccount: (user, type) => {
        auth.switchIdentity(user, type);
        if (type === 'VAULT') {
          gallery.setImageUploadAccount(user);
        } else {
          gallery.setImageUploadAccount('');
        }
      },
      onAddKeychainAccount: auth.addKeychainAccount,
      onOpenVaultManager: () => setActiveModal('keys'),
      galleryMode: gallery.galleryMode,
      toggleGalleryMode: gallery.toggleGalleryMode,
      galleryView: gallery.galleryView,
      setGalleryView: gallery.setGalleryView,
      gallerySearch: gallery.gallerySearch,
      setGallerySearch: gallery.setGallerySearch,
      filteredLocalImages: gallery.filteredLocalImages,
      localSort: gallery.localSort,
      setLocalSort: gallery.setLocalSort,
      images: gallery.images,
      setImages: gallery.setImages,
      toggleImageSelection: gallery.toggleImageSelection,
      moveImageLocal: gallery.moveImageLocal,
      deleteLocalImage: gallery.deleteLocalImage,
      filteredCachedImages: gallery.filteredCachedImages,
      cachedFilter: gallery.cachedFilter,
      setCachedFilter: gallery.setCachedFilter,
      cachedSort: gallery.cachedSort,
      setCachedSort: gallery.setCachedSort,
      selectedCachedUrls: gallery.selectedCachedUrls,
      toggleCachedSelection: gallery.toggleCachedSelection,
      selectAllCached: gallery.selectAllCached,
      clearCachedSelection: gallery.clearCachedSelection,
      deleteSingleCachedImage: gallery.deleteSingleCachedImage,
      deleteSelectedCachedImages: gallery.deleteSelectedCachedImages,
      insertImage: gallery.insertImage,
      insertExternalImage: gallery.insertExternalImage,
      uploadExternalImage: gallery.uploadExternalImage,
      insertGrid: gallery.insertGrid,
      isSearchingPexels: gallery.isSearchingPexels,
      pexelsResults: gallery.pexelsResults,
      setPexelsResults: gallery.setPexelsResults,
      pexelsPage: gallery.pexelsPage,
      handleExternalSearch: gallery.handleExternalSearch,
      authTypeKeychain: auth.authType,
      pexelsApiKey: auth.pexelsApiKey,
      pixabayApiKey: auth.pixabayApiKey,
      unsplashAccessKey: auth.unsplashAccessKey,
      isTrafficOptimized: gallery.isTrafficOptimized,
      setIsTrafficOptimized: gallery.setIsTrafficOptimized,
      performanceMode,
      setPerformanceMode,
      pexelsSettings: gallery.pexelsSettings,
      setPexelsSettings: gallery.setPexelsSettings,
      isGallerySettingsCollapsed: gallery.isGallerySettingsCollapsed,
      setIsGallerySettingsCollapsed: gallery.setIsGallerySettingsCollapsed,
      gridLayout: gallery.gridLayout,
      setGridLayout: gallery.setGridLayout,
      gridWithCaptions: gallery.gridWithCaptions,
      setGridWithCaptions: gallery.setGridWithCaptions,
      singleCaptionAlign: gallery.singleCaptionAlign,
      setSingleCaptionAlign: gallery.setSingleCaptionAlign,
      isTextWrapEnabled: gallery.isTextWrapEnabled,
      setIsTextWrapEnabled: gallery.setIsTextWrapEnabled,
      isExifEnabled: gallery.isExifEnabled,
      setIsExifEnabled: gallery.setIsExifEnabled,
      imageInsertFormat: gallery.imageInsertFormat,
      setImageInsertFormat: gallery.setImageInsertFormat,
      isUploading: gallery.isUploading,
      fileInputRef,
      sourceInput: gallery.sourceInput,
      setSourceInput: gallery.setSourceInput,
      parseImages: gallery.parseImages,
      setActiveModal,
      notify,
      t,
    } as SidebarProps;
  }
  return input;
}

/**
 * useSidebarProps:
 * Encapsulates the aggregation and memoization of SidebarProps outside of App.tsx,
 * supporting either flat or composite hook aggregation.
 */
export function useSidebarProps(input: BuildSidebarPropsInput | CompositeSidebarPropsInput): SidebarProps {
  return useMemo(() => buildSidebarProps(input), [input]);
}
