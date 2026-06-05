# Changelog

## [2026-05-29] - Visual Polish & UI Responsiveness

### Added
- **UI Feedback**: Added active state indicators to tool controls for immediate user feedback.

### Fixed
- **Portrait Mode Layout**: Restructured tool panels to prevent UI element overlapping on smaller screens/portrait mode.
- **Button Feedback**: Fixed missing click feedback on secondary tool panel buttons.

## [2026-05-24] - Universal Markdown Export & Formatting

### Added
- **Universal Markdown Export**: Drafts are now exported as a ZIP archive of individual `.md` files. This ensures your data is readable by any text editor.
- **Smart Table Padding**: Added an engine that automatically manages whitespace around Markdown tables. No more broken tables in Steemit or other readers!
- **Enhanced Single Post Export**: Exporting the current work field now intelligently includes the title as an H1 heading and tags as structured metadata.
- **ZIP Restore Support**: Restoring backups now supports both legacy JSON and new Markdown ZIP formats.

### Changed
- **Pure Markdown Workflow**: Removed complex JSON-only backups to prioritize portability and readability.

## [2026-05-22] - Curation Logging & Stability

### Added
- **Vote Logging System**: New feature in Curation mode to record all upvotes (posts and comments) with permlinks, author nicknames, and weights.
- **Log Management**: Added "Clear" and "Export MD" buttons to the curation settings.
- **Export to Markdown**: Ability to download a professional `.md` report of curation activities.
- **Persistent Storage**: Data is stored in `LocalStorage`, surviving page reloads and tag changes.

### Fixed
- **Controlled Components Warnings**: Fixed multiple React "changing uncontrolled input to controlled" warnings by ensuring values are never `undefined` (using `|| ""`).
- **Optimistic UI for Curation**: Fixed a bug where voting in curation mode didn't update the local UI state of listed items.
- **Vote Logging Accuracy**: Improved identification of "Post" vs "Comment" in logs.
- **Batch Voting for Comments**: Ensured comments are properly processed and reflected in UI after voting.
