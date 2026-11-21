import React, { useState } from 'react';
import {
  AlignLeft,
  AlignRight,
  Check,
  Copy,
  Database,
  Eraser,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CachedImageRecord } from '../../services/imageCacheDb';
import { copyTextWithFallback } from '../../utils/postFormatting';
import { useCachedImageUrl } from '../../hooks/useCachedImageUrl';
import { useLightboxStore } from '../../store/lightboxStore';
import { formatBytesCompact } from '../../services/cacheManagerService';

export type CachedImageFilter = 'all' | 'uploaded' | 'post_cache';

interface CachedImageCardProps {
  record: CachedImageRecord;
  galleryView: 'grid' | 'list';
  isSelected: boolean;
  onToggleSelect: (canonicalUrl: string) => void;
  onInsert: (url: string, name: string, pos: 'left' | 'plain' | 'right') => void;
  onDelete: (canonicalUrl: string, mode: 'blob_only' | 'full') => void;
  t: (key: any) => string;
}

const CachedImageCard: React.FC<CachedImageCardProps> = React.memo(({
  record,
  galleryView,
  isSelected,
  onToggleSelect,
  onInsert,
  onDelete,
  t,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const displayUrl = useCachedImageUrl(record.canonicalUrl, record.canonicalUrl);
  const hasBlob = Boolean(record.blob && record.byteSize > 0);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyTextWithFallback(record.canonicalUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onToggleSelect(record.canonicalUrl)}
      className={cn(
        'group relative rounded-lg overflow-hidden border transition-colors cursor-pointer bg-[var(--bg-card)] flex-none',
        galleryView === 'grid'
          ? 'flex flex-col w-full'
          : 'flex flex-row items-center p-1.5 gap-2',
        isSelected
          ? 'border-cyan-500 ring-1 ring-cyan-500/40'
          : 'border-[var(--border-color)] hover:border-slate-500'
      )}
    >
      {galleryView === 'list' && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(record.canonicalUrl);
          }}
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
            isSelected
              ? 'bg-cyan-500 border-cyan-400 text-white'
              : 'bg-[var(--bg-main)] border-slate-600 text-transparent group-hover:border-cyan-500/60'
          )}
          aria-pressed={isSelected}
        >
          <Check size={11} className="stroke-[3]" />
        </button>
      )}

      <div
        className={cn(
          'relative overflow-hidden bg-[var(--bg-main)] flex items-center justify-center shrink-0',
          galleryView === 'grid' ? 'aspect-square w-full' : 'w-11 h-11 rounded'
        )}
      >
        {!imgError ? (
          <img
            src={displayUrl}
            alt={record.originalName}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              useLightboxStore.getState().openLightbox(record.canonicalUrl, record.originalName);
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-slate-500 p-2 text-center">
            <ImageIcon size={18} />
            <span className="text-[8px] truncate max-w-full">{record.serverHashName}</span>
          </div>
        )}

        {galleryView === 'grid' && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(record.canonicalUrl);
            }}
            className={cn(
              'absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-md border flex items-center justify-center transition-all',
              isSelected
                ? 'bg-cyan-500 border-cyan-300 text-white opacity-100'
                : 'bg-slate-950/75 border-slate-500/80 text-transparent opacity-80 lg:opacity-0 lg:group-hover:opacity-100 hover:border-cyan-400'
            )}
            aria-pressed={isSelected}
          >
            <Check size={12} className="stroke-[3]" />
          </button>
        )}

        {galleryView === 'grid' && (
          <div className="absolute inset-x-0 bottom-0 bg-[var(--bg-overlay-surface)] backdrop-blur-dynamic border-t border-[var(--border-subtle)] px-1 py-1 flex items-center justify-center gap-1 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 z-10">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onInsert(record.canonicalUrl, record.originalName, 'left');
              }}
              className="p-1 bg-slate-800/85 rounded flex-1 hover:bg-cyan-600 text-slate-100 flex justify-center items-center"
              title={t('leftText')}
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onInsert(record.canonicalUrl, record.originalName, 'plain');
              }}
              className="p-1 bg-slate-800/85 rounded flex-1 hover:bg-cyan-600 text-slate-100 flex justify-center items-center"
              title={t('asIs')}
            >
              <FileText size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onInsert(record.canonicalUrl, record.originalName, 'right');
              }}
              className="p-1 bg-slate-800/85 rounded flex-1 hover:bg-cyan-600 text-slate-100 flex justify-center items-center"
              title={t('rightText')}
            >
              <AlignRight size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCopy}
              className="p-1 bg-slate-800/85 rounded flex-1 hover:bg-cyan-600 text-slate-100 flex justify-center items-center"
              title={copied ? t('lightboxUrlCopied') : t('lightboxCopyUrl')}
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            {hasBlob && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(record.canonicalUrl, 'blob_only');
                }}
                className="p-1 bg-slate-800/85 rounded flex-1 hover:bg-amber-600 text-slate-100 flex justify-center items-center"
                title={t('cachedPurgeBlobOnly')}
              >
                <Eraser size={13} />
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(record.canonicalUrl, 'full');
              }}
              className="p-1 bg-slate-800/85 rounded flex-1 hover:bg-red-600 text-slate-100 flex justify-center items-center"
              title={t('cachedDeleteFull')}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <div className={cn('min-w-0 flex flex-col justify-center', galleryView === 'grid' ? 'p-1.5 gap-0.5' : 'flex-1 gap-0.5')}>
        <p className="text-[10px] font-semibold text-[var(--text-main)] truncate leading-tight" title={record.originalName}>
          {record.originalName}
        </p>
        <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-mono tabular-nums truncate">
          <span>{hasBlob ? formatBytesCompact(record.byteSize) : t('cachedLinkOnlyBadge')}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate" title={record.canonicalUrl}>{record.serverHashName}</span>
        </div>

        {galleryView === 'list' && (
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={t('leftText')}
              onClick={(e) => {
                e.stopPropagation();
                onInsert(record.canonicalUrl, record.originalName, 'left');
              }}
              className="text-[var(--text-muted)] hover:text-cyan-400"
            >
              <AlignLeft size={12} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={t('asIs')}
              onClick={(e) => {
                e.stopPropagation();
                onInsert(record.canonicalUrl, record.originalName, 'plain');
              }}
              className="text-[var(--text-muted)] hover:text-cyan-400"
            >
              <FileText size={12} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={t('rightText')}
              onClick={(e) => {
                e.stopPropagation();
                onInsert(record.canonicalUrl, record.originalName, 'right');
              }}
              className="text-[var(--text-muted)] hover:text-cyan-400"
            >
              <AlignRight size={12} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={copied ? t('lightboxUrlCopied') : t('lightboxCopyUrl')}
              onClick={handleCopy}
              className="text-[var(--text-muted)] hover:text-cyan-400"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
            {hasBlob && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                title={t('cachedPurgeBlobOnly')}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(record.canonicalUrl, 'blob_only');
                }}
                className="text-[var(--text-muted)] hover:text-amber-400"
              >
                <Eraser size={12} />
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={t('cachedDeleteFull')}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(record.canonicalUrl, 'full');
              }}
              className="text-[var(--text-muted)] hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

CachedImageCard.displayName = 'CachedImageCard';

export interface CachedImagesPanelProps {
  records: CachedImageRecord[];
  galleryView: 'grid' | 'list';
  filter: CachedImageFilter;
  setFilter: (f: CachedImageFilter) => void;
  selectedUrls: Set<string>;
  onToggleSelect: (url: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onInsert: (url: string, name: string, pos: 'left' | 'plain' | 'right') => void;
  onInsertGrid: () => void;
  onDeleteSingle: (url: string, mode: 'blob_only' | 'full') => void;
  onDeleteSelected: (mode: 'blob_only' | 'full') => void;
  isCollapsed?: boolean;
  t: (key: any) => string;
}

export const CachedImagesPanel: React.FC<CachedImagesPanelProps> = ({
  records,
  galleryView,
  filter,
  setFilter,
  selectedUrls,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onInsert,
  onInsertGrid,
  onDeleteSingle,
  onDeleteSelected,
  isCollapsed,
  t,
}) => {
  if (isCollapsed) {
    return (
      <div className="flex flex-col gap-2">
        {records.slice(0, 12).map((rec) => (
          <button
            key={rec.canonicalUrl}
            type="button"
            onClick={() => onInsert(rec.canonicalUrl, rec.originalName, 'plain')}
            className="relative rounded-lg overflow-hidden border border-[var(--border-color)] hover:border-cyan-500 aspect-square w-full bg-[var(--bg-card)]"
            title={rec.originalName}
          >
            <CollapsedThumb url={rec.canonicalUrl} alt={rec.originalName} />
          </button>
        ))}
      </div>
    );
  }

  const totalBytes = records.reduce((acc, r) => acc + (r.blob ? (r.byteSize || r.blob.size) : 0), 0);
  const selectedCount = selectedUrls.size;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex items-center justify-between gap-2 shrink-0 border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'all', label: t('cachedFilterAll') },
              { id: 'uploaded', label: t('cachedFilterUploaded') },
              { id: 'post_cache', label: t('cachedFilterPosts') },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'px-2 py-1 text-[10px] font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors',
                filter === tab.id
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono tabular-nums text-slate-400 whitespace-nowrap shrink-0">
          {records.length} · {formatBytesCompact(totalBytes)}
        </span>
      </div>

      {records.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0 text-[10px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={selectedCount === records.length ? onClearSelection : onSelectAll}
              className="px-2 py-1 rounded border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-300 whitespace-nowrap shrink-0"
            >
              {selectedCount === records.length ? t('cachedClearSelection') : t('cachedSelectAll')}
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={onInsertGrid}
                className="px-2 py-1 rounded border border-cyan-700/60 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 flex items-center gap-1 whitespace-nowrap shrink-0"
                title={t('createGrid')}
              >
                <LayoutGrid size={11} />
                <span className="font-mono tabular-nums">{selectedCount}</span>
              </button>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteSelected('blob_only')}
                className="px-2 py-1 rounded border border-amber-700/50 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 flex items-center gap-1 whitespace-nowrap shrink-0"
                title={t('cachedPurgeBlobOnly')}
              >
                <Eraser size={11} />
                <span>{t('cachedBulkPurgeBlob')}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteSelected('full')}
                className="px-2 py-1 rounded border border-rose-700/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Trash2 size={11} />
                <span>{t('cachedBulkDeleteFull').replace('{count}', String(selectedCount))}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-10 px-3 text-center text-slate-500 gap-2">
          <Database size={22} />
          <p className="text-[11px] leading-relaxed max-w-[220px]">{t('cachedImagesEmpty')}</p>
        </div>
      ) : (
        <div
          className={cn(
            'overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-0.5',
            galleryView === 'grid'
              ? 'grid grid-cols-[repeat(auto-fill,minmax(115px,1fr))] auto-rows-min gap-2.5 content-start'
              : 'flex flex-col gap-1.5'
          )}
        >
          {records.map((rec) => (
            <CachedImageCard
              key={rec.canonicalUrl}
              record={rec}
              galleryView={galleryView}
              isSelected={selectedUrls.has(rec.canonicalUrl)}
              onToggleSelect={onToggleSelect}
              onInsert={onInsert}
              onDelete={onDeleteSingle}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CollapsedThumb: React.FC<{ url: string; alt: string }> = ({ url, alt }) => {
  const src = useCachedImageUrl(url, url);
  return <img src={src} alt={alt} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />;
};

export default CachedImagesPanel;
