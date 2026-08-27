# Agent Instructions & Project Rules

## Temporary Scripts & Diagnostic Files
- **Directory**: `./fix_test_patcn/`
- **Rule**: All temporary scripts, test files, fix scripts, patches, search tools, or diagnostic utilities (e.g., `test-*.ts`, `fix-*.cjs`, `patch_*.ts`, `find_*.ts`, etc.) **MUST** be created inside the `./fix_test_patcn/` directory.
- **Root Cleanliness**: Do not create temporary test, fix, or patch files directly in the root directory (`/`). Keep the project root clean and dedicated exclusively to primary application files, configuration, and source code.
- **Persistence**: Do **NOT** delete any files, scripts, or directories inside `./fix_test_patcn/` unless the user explicitly instructs you to do so. These files must be preserved for historical, diagnostic, and audit reference.
