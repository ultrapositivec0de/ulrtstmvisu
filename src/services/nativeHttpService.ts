/**
 * Native HTTP Service for Cross-Platform Desktop & Mobile Wrappers
 * 
 * Bypasses WebKit/Chromium browser-level CORS restrictions in:
 * - Tauri (Linux, Windows, macOS, Android via Rust reqwest / @tauri-apps/plugin-http)
 * - Neutralinojs (Linux, Windows, macOS via Neutralino native OS commands / curl)
 * - Android WebView (via window.AndroidBridge if present)
 */

export interface NativeUploadResult {
  handled: boolean;
  success: boolean;
  url?: string;
  error?: string;
}

export class NativeHttpService {
  /**
   * Detects if running inside Tauri desktop/mobile environment
   */
  static isTauri(): boolean {
    return (
      typeof window !== 'undefined' &&
      (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__)
    );
  }

  /**
   * Detects if running inside Neutralinojs desktop environment
   */
  static isNeutralino(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('Neutralino' in window || !!(window as any).Neutralino)
    );
  }

  /**
   * Detects if running inside Android native app wrapper
   */
  static isAndroidBridge(): boolean {
    return (
      typeof window !== 'undefined' &&
      (!!(window as any).AndroidBridge ||
        !!(window as any).Android ||
        navigator.userAgent.includes('SteemEditorNative'))
    );
  }

  /**
   * Returns true if any native host environment is active
   */
  static isNativeEnvironment(): boolean {
    return this.isTauri() || this.isNeutralino() || this.isAndroidBridge();
  }

  /**
   * Attempts to upload via Tauri's native Rust HTTP client (bypasses browser CORS completely)
   */
  private static async uploadViaTauri(
    file: File | Blob,
    uploadUrl: string,
    fileName: string,
  ): Promise<NativeUploadResult> {
    try {
      let tauriFetch: typeof fetch | null = null;

      // 1. Try Tauri runtime global or dynamic plugin if present
      const tauri = (window as any).__TAURI__;
      if (tauri?.http?.fetch) {
        tauriFetch = tauri.http.fetch;
      } else if (tauri?.fetch) {
        tauriFetch = tauri.fetch;
      } else {
        try {
          const pluginName = '@tauri-apps/plugin-http';
          const httpPlugin = await import(/* @vite-ignore */ pluginName);
          if (httpPlugin?.fetch) {
            tauriFetch = httpPlugin.fetch as typeof fetch;
          }
        } catch {
          // Plugin not available at runtime
        }
      }

      if (!tauriFetch) {
        return { handled: false, success: false };
      }

      const formData = new FormData();
      formData.append('file', file, fileName);

      const resp = await tauriFetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        return {
          handled: true,
          success: false,
          error: `Tauri HTTP error: ${resp.status} ${errorText}`.trim(),
        };
      }

      const data = await resp.json();
      const url = data?.url || data?.link || data?.data?.url;

      if (url) {
        return { handled: true, success: true, url };
      }

      return {
        handled: true,
        success: false,
        error: data?.error?.message || data?.message || 'No URL returned from server',
      };
    } catch (e: any) {
      console.warn('[NativeHttpService] Tauri upload failed:', e);
      return { handled: false, success: false, error: e?.message || String(e) };
    }
  }

  /**
   * Attempts to upload via Neutralino's native OS layer
   */
  private static async uploadViaNeutralino(
    file: File | Blob,
    uploadUrl: string,
    fileName: string,
  ): Promise<NativeUploadResult> {
    const neu = (window as any).Neutralino;
    if (!neu?.os?.execCommand || !neu?.filesystem) {
      return { handled: false, success: false };
    }

    let tempPath = '';
    try {
      const arrayBuffer = await file.arrayBuffer();
      tempPath = `.tmp_upload_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Write temporary file via Neutralino filesystem
      await neu.filesystem.writeBinaryFile(tempPath, arrayBuffer);

      // Execute native curl command with a safety timeout (10s max) so UI never hangs indefinitely
      const escapedUrl = uploadUrl.replace(/"/g, '\\"');
      const escapedPath = tempPath.replace(/"/g, '\\"');
      const cmd = `curl -s -X POST -F "file=@${escapedPath}" "${escapedUrl}"`;

      const execPromise = neu.os.execCommand(cmd);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
      const result = await Promise.race([execPromise, timeoutPromise]);

      // Clean up temporary file in background
      if (tempPath) {
        neu.filesystem.remove(tempPath).catch(() => {});
      }

      if (result && (result as any).stdOut) {
        try {
          const data = JSON.parse((result as any).stdOut);
          const url = data?.url || data?.link || data?.data?.url;
          if (url) {
            return { handled: true, success: true, url };
          }
          if (data?.error) {
            console.warn('[NativeHttpService] Neutralino curl returned server error:', data.error);
          }
        } catch {
          // stdout wasn't valid JSON
        }
      }

      // If curl timed out, failed, or returned invalid output, fallback to Web prediction
      return { handled: false, success: false };
    } catch (e: any) {
      console.warn('[NativeHttpService] Neutralino upload failed, falling back to Web prediction:', e);
      if (tempPath) {
        try {
          await neu.filesystem.remove(tempPath);
        } catch {
          // Ignore cleanup error
        }
      }
      return { handled: false, success: false, error: e?.message || String(e) };
    }
  }

  /**
   * Attempts to upload via AndroidBridge native interface
   */
  private static async uploadViaAndroidBridge(
    file: File | Blob,
    uploadUrl: string,
    fileName: string,
  ): Promise<NativeUploadResult> {
    const bridge = (window as any).AndroidBridge || (window as any).Android;
    if (!bridge) {
      return { handled: false, success: false };
    }

    if (typeof bridge.uploadImage === 'function') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            '',
          ),
        );
        const resStr = await Promise.resolve(bridge.uploadImage(uploadUrl, base64, fileName));
        if (resStr) {
          try {
            const data = JSON.parse(resStr);
            const url = data?.url || data?.link;
            if (url) return { handled: true, success: true, url };
          } catch {
            if (typeof resStr === 'string' && resStr.startsWith('http')) {
              return { handled: true, success: true, url: resStr };
            }
          }
        }
      } catch (err: any) {
        console.warn('[NativeHttpService] AndroidBridge upload error:', err);
      }
    }

    return { handled: false, success: false };
  }

  /**
   * Main entry point: tries native runtimes in order (Tauri -> Neutralino -> Android)
   * If not in a native runtime or native call fails, returns { handled: false } so web prediction fallback is invoked.
   */
  static async tryUpload(
    file: File | Blob,
    uploadUrl: string,
    fileName = 'image.png',
  ): Promise<NativeUploadResult> {
    if (this.isTauri()) {
      const res = await this.uploadViaTauri(file, uploadUrl, fileName);
      if (res.handled) return res;
    }

    if (this.isNeutralino()) {
      // Neutralino WebView supports standard in-memory Web Prediction natively without needing disk writes or shell curl.
      // Returning handled: false allows Neutralino to seamlessly use the fast fetch + DOM Image prediction pipeline.
      return { handled: false, success: false };
    }

    if (this.isAndroidBridge()) {
      const res = await this.uploadViaAndroidBridge(file, uploadUrl, fileName);
      if (res.handled) return res;
    }

    return { handled: false, success: false };
  }
}
