# Етап 1. Уніфікація ідентифікатора NeutralinoJS та виправлення експорту Linux

## Мета
Привести ідентифікатор NeutralinoJS до єдиної схеми проєкту `org.ultraeditor.neutralino` та виправити експорт дописів/бекапів на Linux у контейнері NeutralinoJS.

## Кроки реалізації
1. Оновити `applicationId` на `org.ultraeditor.neutralino` у:
   - `neutralino-build/neutralino.config.json`
   - `neutralino-build/.tmp/neutralino.config.json`
   - перевірити відсутність застарілих `org.ultrapositive.steemeditorpro` у скриптах/конфігах (не змінювати зовнішні GitHub URL у workflow).
2. Виправити `src/utils/fileSaver.ts` для Neutralino на Linux:
   - Перед викликом `Neutralino.os.showSaveDialog` визначати реальний стартовий каталог через `os.getPath('downloads') || os.getPath('documents') || os.getPath('home')` і формувати повний `defaultPath = "${baseDir}/${defaultFilename}"`.
   - Замінити ненадійний текстовий метод `writePlainTextFile` на перевірений `Neutralino.filesystem.writeFile` (текст) або `writeBinaryFile` (бінарні дані), із перевіркою результату.
   - Додати нормалізацію відповіді `showSaveDialog` (рядок або масив/об’єкт, скасування vs збій діалогу на GTK/Wayland/Portal): якщо діалог викинув виняток або недоступний у системі, не провалюватись у неробочий `<a download>` всередині WebKitGTK, а виконувати безпечний прямий запис у `${downloadsDir}/${defaultFilename}` (з унікалізацією імені при колізії) і повертати шлях або `true`.
3. Синхронізувати `NativeService.saveFileNativeOrWeb` у `src/services/nativeService.ts` із `saveFileNatively`, щоб у Neutralino не падало в браузерний `<a>` фолбек.
4. Перевірити `src/hooks/useAppBackup.ts` (`downloadFile`) і `src/hooks/useImportExport.ts`, щоб користувач отримував точне підтвердження або шлях збереження.
