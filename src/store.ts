// Re-export editor store and helper functions for full backward compatibility
export * from './stores/useEditorStore';

// Re-export new modular stores
export { useModalStore, type ModalType, type ModalStoreState } from './stores/useModalStore';
export { useAppUIStore, type AppView, type AppUIStoreState } from './stores/useAppUIStore';
export { useReaderStore, type ReaderFeedMode, type ReaderStoreState } from './stores/useReaderStore';
export { useHistoryStore, type HistorySnapshot, type HistoryStoreState } from './stores/useHistoryStore';
export { useDeviceStore, type DeviceStoreState } from './store/deviceStore';
export { useLightboxStore, type LightboxState } from './store/lightboxStore';
