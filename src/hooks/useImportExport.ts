import { useCallback, useState } from 'react';
import { saveFileNatively } from '../utils/fileSaver';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

export interface UseImportExportOptions {
  t: (key: any) => string;
  setContent: (content: string) => void;
  setPubTitle: (title: string) => void;
  setPubTags: (tags: string) => void;
  setSystemDialog: (dialog: any) => void;
}

export function useImportExport({ t, setContent, setPubTitle, setPubTags, setSystemDialog }: UseImportExportOptions) {
  const [isImporting, setIsImporting] = useState(false);

  const handleExportMarkdown = useCallback(async (content: string, title: string) => {
    try {
      const filename = (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'post') + '.md';
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      await saveFileNatively(blob, filename, 'text/markdown');
    } catch (e) {
      console.error('Export markdown failed:', e);
    }
  }, []);

  const handleExportJSON = useCallback(async (data: any, filename: string) => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      await saveFileNatively(blob, filename, 'application/json');
    } catch (e) {
      console.error('Export JSON failed:', e);
    }
  }, []);

  const handleImportMarkdown = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text !== undefined) {
        setContent(text);
        setPubTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [setContent, setPubTitle]);

  const exportBackup = useCallback(async (drafts: any[], notify: any) => {
    try {
      if (drafts.length === 0) {
        notify("No drafts to export", "success");
        return;
      }

      const zipData: Record<string, Uint8Array> = {};
      drafts.forEach((d: any) => {
        const safeTitle = (d.title || `draft-${d.id}`).replace(/[/\\?%*:|"<>]/g, '-');
        
        let content = "";
        if (d.title) content += `# ${d.title}\n\n`;
        content += d.body || "";
        
        if (d.tags || d.category) {
          content += `\n\n---\n- **Tags**: ${d.tags || ""}\n- **Category**: ${d.category || ""}\n`;
        }
        
        if (!content.endsWith("\n")) content += "\n";
        zipData[`${safeTitle}.md`] = strToU8(content);
      });
      
      const zipBuffer = zipSync(zipData);
      const blob = new Blob([zipBuffer], { type: 'application/zip' });
      const filename = `steem_drafts_md_${new Date().toISOString().split('T')[0]}.zip`;
      
      const saved = await saveFileNatively(blob, filename, 'application/zip');
      if (saved) {
        notify("Drafts exported as Markdown files in ZIP!", "success");
      }
    } catch (err: any) {
      notify("Error: " + err.message, "error");
    }
  }, []);

  const importBackup = useCallback(async (file: File, notify: any, setDrafts: any) => {
    try {
      let importedDrafts: any[] = [];
      
      if (file.name.endsWith('.zip')) {
        const buffer = await file.arrayBuffer();
        const unzipped = unzipSync(new Uint8Array(buffer));
        
        if (unzipped['backup.json']) {
          const text = strFromU8(unzipped['backup.json']);
          const parsed = JSON.parse(text);
          if (parsed && parsed.drafts) {
            const draftsArr = typeof parsed.drafts === 'string' ? JSON.parse(parsed.drafts) : parsed.drafts;
            if (Array.isArray(draftsArr)) importedDrafts = draftsArr;
          }
        } else {
          const files = Object.keys(unzipped);
          const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('__MACOSX'));
          
          for (const filename of mdFiles) {
            const content = strFromU8(unzipped[filename]);
            const title = filename.split('/').pop()?.replace('.md', '') || 'Imported Draft';
            importedDrafts.push({
              id: (Date.now() + Math.random()).toString(),
              title: title,
              body: content,
              tags: '',
              category: '',
              updatedAt: Date.now(),
              status: 'working'
            });
          }
        }
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          importedDrafts = parsed;
        } else if (parsed && parsed.drafts) {
          importedDrafts = typeof parsed.drafts === 'string' ? JSON.parse(parsed.drafts) : parsed.drafts;
        }
      }
      
      if (importedDrafts.length > 0) {
        setDrafts((prev: any) => [...prev, ...importedDrafts]);
        notify(`${importedDrafts.length} drafts restored!`, "success");
        return true;
      } else {
        notify("Invalid backup file or no drafts found", "error");
        return false;
      }
    } catch (err: any) {
      notify("Error: " + err.message, "error");
      return false;
    }
  }, []);

  return {
    isImporting,
    handleExportMarkdown,
    handleExportJSON,
    handleImportMarkdown,
    exportBackup,
    importBackup
  };
}
