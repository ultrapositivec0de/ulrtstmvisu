const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/importMd: "Імпорт \.md",/g, 'importMd: "Імпорт .md",\n    clearNativeCache: "Очистити системний кеш",\n    nativeCacheCleared: "Кеш (зображення, списки, тимчасові файли) успішно очищено!",\n    nativeCacheError: "Помилка очищення кешу",');
content = content.replace(/importMd: "Import \.md",/g, 'importMd: "Import .md",\n    clearNativeCache: "Clear System Cache",\n    nativeCacheCleared: "Cache (images, lists, temp files) cleared successfully!",\n    nativeCacheError: "Error clearing cache",');
content = content.replace(/importMd: "Importar \.md",/g, 'importMd: "Importar .md",\n    clearNativeCache: "Borrar caché del sistema",\n    nativeCacheCleared: "¡Caché (imágenes, listas, temp) borrado exitosamente!",\n    nativeCacheError: "Error al borrar caché",');
content = content.replace(/importMd: "\.md 가져오기",/g, 'importMd: ".md 가져오기",\n    clearNativeCache: "시스템 캐시 지우기",\n    nativeCacheCleared: "캐시(이미지, 목록, 임시 파일)가 성공적으로 삭제되었습니다!",\n    nativeCacheError: "캐시 삭제 오류",');

fs.writeFileSync('src/App.tsx', content);
