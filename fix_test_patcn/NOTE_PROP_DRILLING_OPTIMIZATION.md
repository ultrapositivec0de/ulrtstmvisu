# Замітка: Оптимізація Prop Drilling у Модальних Вікнах та Оверлеях

## 1. Поточний стан
- Для збереження 100% сумісності та уникнення регресій у поведінці компонентів під час Етапу 1, було створено `AppModalsHost.tsx`, який об'єднує `<AppModals />` та 7 додаткових оверлеїв (`AccountPromptModal`, `NotificationToast`, `TableSelectorPopup`, `AudioPresetsModal`, `SystemDialogModal`, `ImageLightboxModal`, `pubLog`).
- Зараз у `App.tsx` формується типізований об'єкт `modalsProps: AppModalsProps` із ~70 полів і передається в `AppModalsHost`.
- У `AppModalsHost` було оперативно виправлено передачу `t={t}` у `TableSelectorPopup`, що повернуло локалізовані підписи кнопок швидких шаблонів таблиць замість довгих технічних ідентифікаторів ключів.

---

## 2. План подальшої оптимізації (після завершення основних етапів декомпозиції)
1. **Злиття `AppModals.tsx` в `AppModalsHost.tsx`**:
   - Позбутися проміжного шару `AppModals.tsx` шляхом прямого розміщення перемикача модалок у `AppModalsHost`.
2. **Підключення окремих модалок напряму до сховищ Zustand**:
   - `SettingsModal`: читатиме `themeColor`, `activeAssortment`, `editorFont`, `visualStyle`, `isDarkMode`, `isPwaInstalled` безпосередньо з `useAppUIStore`.
   - `DraftsModal`: підписати на `useEditorStore` для роботи з чернетками та бекапами.
   - `PublishModal`: підписати на `usePublishStore` або модуль публікації (заголовок, теги, бенефіціари, черга).
   - `AudioPresetsModal`: підписати на `useModalStore` для відкриття/закриття замість локального boolean стейту.
3. **Результат оптимізації**:
   - Об'єкт `modalsProps` повністю зникне з `App.tsx`.
   - `AppModalsHost` викликатиметься в `App.tsx` як автономний компонент `<AppModalsHost />` або з мінімальною кількістю пропсів, заощаджуючи ще ~500 рядків коду та значний обсяг контексту токенів.
