use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const KNOWN_APP_IDENTIFIERS: &[&str] = &[
    "com.ultraeditor.desktop",
    "org.ultraeditor.neutralino",
    "org.ultrapositive.steemeditorpro",
    "ultra-steem-editor",
    "Ultra Steem Editor",
];

const SAFE_CACHE_DIR_NAMES: &[&str] = &[
    "webkitcache",
    "mediacache",
    "cache",
    "code cache",
    "gpucache",
    "dawncache",
    "fscacheddata",
    "scriptcache",
    "shader_cache",
    "shadercache",
    "grshadercache",
];

const PROTECTED_DIR_NAMES: &[&str] = &[
    "indexeddb",
    "localstorage",
    "databases",
    "cookies",
    "sessionstorage",
    "storage",
    "keyval-store",
    "preferences",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinuxCacheDirEntry {
    pub id: String,
    pub label: String,
    pub base_dir: String,
    pub cache_paths: Vec<String>,
    pub size_bytes: u64,
    pub file_count: u64,
    pub is_current_app: bool,
    pub is_protected_info: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearNativeResult {
    pub removed_paths: Vec<String>,
    pub freed_bytes: u64,
    pub errors: Vec<String>,
}

fn dir_stats_recursive(path: &Path) -> (u64, u64) {
    let Ok(meta) = fs::symlink_metadata(path) else {
        return (0, 0);
    };
    if meta.file_type().is_symlink() {
        return (0, 0);
    }
    if meta.is_file() {
        return (meta.len(), 1);
    }
    if !meta.is_dir() {
        return (0, 0);
    }

    let mut total_bytes = 0u64;
    let mut total_files = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let child = entry.path();
            let (b, c) = dir_stats_recursive(&child);
            total_bytes = total_bytes.saturating_add(b);
            total_files = total_files.saturating_add(c);
        }
    }
    (total_bytes, total_files)
}

fn remove_path_best_effort(path: &Path) -> (u64, Vec<String>) {
    let mut freed = 0u64;
    let mut errors = Vec::new();

    let Ok(meta) = fs::symlink_metadata(path) else {
        return (0, errors);
    };
    if meta.file_type().is_symlink() {
        return (0, errors);
    }

    if meta.is_file() {
        let len = meta.len();
        match fs::remove_file(path) {
            Ok(_) => freed = freed.saturating_add(len),
            Err(e) => {
                if e.kind() != std::io::ErrorKind::NotFound {
                    errors.push(format!("{}: {}", path.display(), e));
                }
            }
        }
        return (freed, errors);
    }

    if meta.is_dir() {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let (b, mut errs) = remove_path_best_effort(&entry.path());
                freed = freed.saturating_add(b);
                errors.append(&mut errs);
            }
        }
        if let Err(e) = fs::remove_dir(path) {
            if e.kind() != std::io::ErrorKind::NotFound
                && e.kind() != std::io::ErrorKind::DirectoryNotEmpty
            {
                errors.push(format!("{}: {}", path.display(), e));
            }
        }
    }

    (freed, errors)
}

fn collect_safe_cache_subdirs(
    dir: &Path,
    depth: u8,
    is_strictly_cache_root: bool,
    out: &mut Vec<PathBuf>,
) {
    if depth > 3 || !dir.is_dir() {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let Ok(ft) = entry.file_type() else {
            continue;
        };
        if ft.is_symlink() || !ft.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if PROTECTED_DIR_NAMES.iter().any(|p| name == *p) {
            continue;
        }

        let child_path = entry.path();
        if SAFE_CACHE_DIR_NAMES.iter().any(|c| name == *c)
            || (is_strictly_cache_root && (name == "webkit" || name == "webkitgtk"))
        {
            out.push(child_path);
            continue;
        }

        if depth < 2
            && (name == "ebwebview"
                || name == "default"
                || name == "webkit"
                || name == "webkitgtk"
                || name == "webkitwebsitedata")
        {
            collect_safe_cache_subdirs(&child_path, depth + 1, is_strictly_cache_root, out);
        }
    }
}

fn discover_native_cache_entries(app: &tauri::AppHandle) -> Vec<LinuxCacheDirEntry> {
    let mut results: Vec<LinuxCacheDirEntry> = Vec::new();
    let mut seen_bases: HashSet<PathBuf> = HashSet::new();

    let current_id = app.config().identifier.clone();
    let home_dir = std::env::var_os("HOME").map(PathBuf::from);
    let xdg_cache = std::env::var_os("XDG_CACHE_HOME")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .or_else(|| home_dir.as_ref().map(|h| h.join(".cache")));
    let xdg_data = std::env::var_os("XDG_DATA_HOME")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .or_else(|| home_dir.as_ref().map(|h| h.join(".local/share")));

    let mut inspect_candidate = |id: &str, label: String, base: PathBuf, strictly_cache: bool, is_current: bool| {
        let canonical = fs::canonicalize(&base).unwrap_or_else(|_| base.clone());
        if !base.exists() || !seen_bases.insert(canonical) {
            return;
        }

        let mut cache_subdirs: Vec<PathBuf> = Vec::new();
        collect_safe_cache_subdirs(&base, 0, strictly_cache, &mut cache_subdirs);
        if cache_subdirs.is_empty() {
            return;
        }

        let mut total_bytes = 0u64;
        let mut total_files = 0u64;
        let mut cache_paths = Vec::with_capacity(cache_subdirs.len());
        for sub in cache_subdirs {
            let (b, f) = dir_stats_recursive(&sub);
            total_bytes = total_bytes.saturating_add(b);
            total_files = total_files.saturating_add(f);
            cache_paths.push(sub.to_string_lossy().to_string());
        }

        results.push(LinuxCacheDirEntry {
            id: id.to_string(),
            label,
            base_dir: base.to_string_lossy().to_string(),
            cache_paths,
            size_bytes: total_bytes,
            file_count: total_files,
            is_current_app: is_current,
            is_protected_info: false,
        });
    };

    if let Ok(app_cache) = app.path().app_cache_dir() {
        inspect_candidate(
            &current_id,
            format!("{} (Cache)", current_id),
            app_cache,
            true,
            true,
        );
    }
    if let Ok(app_local) = app.path().app_local_data_dir() {
        inspect_candidate(
            &current_id,
            format!("{} (WebView Cache)", current_id),
            app_local,
            false,
            true,
        );
    }

    for &ident in KNOWN_APP_IDENTIFIERS {
        let is_cur = ident == current_id;
        if let Some(ref cache_root) = xdg_cache {
            inspect_candidate(
                ident,
                format!("~/.cache/{}", ident),
                cache_root.join(ident),
                true,
                is_cur,
            );
        }
        if let Some(ref data_root) = xdg_data {
            inspect_candidate(
                ident,
                format!("~/.local/share/{}", ident),
                data_root.join(ident),
                false,
                is_cur,
            );
        }
    }

    if let Some(ref home) = home_dir {
        let neutralino_backup = home.join(".steem_writer_backup.json");
        if let Ok(meta) = fs::symlink_metadata(&neutralino_backup) {
            if meta.is_file() {
                results.push(LinuxCacheDirEntry {
                    id: "neutralino-backup".to_string(),
                    label: "~/.steem_writer_backup.json (Backup)".to_string(),
                    base_dir: neutralino_backup.to_string_lossy().to_string(),
                    cache_paths: Vec::new(),
                    size_bytes: meta.len(),
                    file_count: 1,
                    is_current_app: false,
                    is_protected_info: true,
                });
            }
        }
    }

    results
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust in your Tauri Desktop App!", name)
}

#[tauri::command]
fn scan_linux_cache_dirs(app: tauri::AppHandle) -> Result<Vec<LinuxCacheDirEntry>, String> {
    Ok(discover_native_cache_entries(&app))
}

#[tauri::command]
fn clear_linux_cache_targets(
    app: tauri::AppHandle,
    paths: Vec<String>,
) -> Result<ClearNativeResult, String> {
    let entries = discover_native_cache_entries(&app);
    let mut allowed: HashSet<PathBuf> = HashSet::new();
    for entry in entries {
        if entry.is_protected_info {
            continue;
        }
        for p in entry.cache_paths {
            let pb = PathBuf::from(&p);
            allowed.insert(fs::canonicalize(&pb).unwrap_or(pb));
        }
    }

    let mut requested: Vec<PathBuf> = if paths.is_empty() {
        allowed.iter().cloned().collect()
    } else {
        paths.into_iter().map(PathBuf::from).collect()
    };

    let mut removed_paths = Vec::new();
    let mut freed_bytes = 0u64;
    let mut errors = Vec::new();

    for req in requested.drain(..) {
        let canonical = fs::canonicalize(&req).unwrap_or_else(|_| req.clone());
        if !allowed.contains(&canonical) {
            errors.push(format!("Skipped non-whitelisted path: {}", req.display()));
            continue;
        }
        let (freed, mut errs) = remove_path_best_effort(&canonical);
        freed_bytes = freed_bytes.saturating_add(freed);
        if errs.is_empty() || freed > 0 {
            removed_paths.push(req.to_string_lossy().to_string());
        }
        errors.append(&mut errs);
    }

    Ok(ClearNativeResult {
        removed_paths,
        freed_bytes,
        errors,
    })
}

#[tauri::command]
fn clear_webview_browsing_data(app: tauri::AppHandle) -> Result<ClearNativeResult, String> {
    clear_linux_cache_targets(app, Vec::new())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Вимикаємо ВСЕ апаратне прискорення для WebKit на Linux
    // Це запобігає білим екранам і зависанню системи (dumped core)
    unsafe {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("GDK_BACKEND", "x11"); // Іноді Wayland викликає падіння
    }
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_linux_cache_dirs,
            clear_linux_cache_targets,
            clear_webview_browsing_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
