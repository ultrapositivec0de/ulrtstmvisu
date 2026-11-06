# Unified Global & Reader Account Selector (Keychain & Vault)

A unified account selection and signing method system that enables seamless switching between Keychain and Vault identities across Reader, Gallery, and Editor, with multi-account Keychain management and isolated or synchronized signing modes.

## User Review & Critical Decisions

> [!IMPORTANT]
> The account selector will follow the proven Gallery dropdown pattern (`🛡️ @username (Keychain)` vs `🔑 @username (Vault)`), allowing any username to be signed via Keychain or Vault key storage without forcing Keychain when a Vault account is active.

- **Confirmed Decision 1**: The account selector will be integrated directly into Reader top controls (desktop `ReaderTopHeader` & mobile `ReaderQuickPanel`) and synchronize with global state (`useSteemAuth`) so changes seamlessly reflect in Gallery and Editor.
- **Confirmed Decision 2**: Support multiple Keychain usernames saved in local storage (`steem_keychain_accounts`), allowing quick addition and switching between test/real accounts.
- **Confirmed Decision 3**: Each account in the selector explicitly indicates its signing method (Keychain vs Vault). Selecting a Vault account directs signing operations to the local encrypted Vault key, avoiding unwanted Keychain popups and expiration errors.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a dedicated, accessible account switcher in Reader mode and throughout the app, displaying all configured Keychain usernames and Vault accounts with clear visual indicators of the signing engine (`🛡️ Keychain` vs `🔑 Vault`).
- **Target Audience**: Steem authors and curators managing multiple accounts or switching between browser extension signing and local encrypted keys.
- **Key Value**: Eliminates the conflict where Keychain hijacked all signing operations even when the user intended to sign via Vault, and removes the friction of manual re-authentication when switching between multiple accounts.

---

## 2. User Experience & Visual Design

- **Reader Top Header & Quick Panel Integration**:
  - The current account badge in `ReaderTopHeader` (desktop) and `ReaderQuickPanel` (mobile) becomes an interactive dropdown trigger displaying the active identity (e.g., `🛡️ @alice` or `🔑 @bob`).
  - Clicking opens a sleek popover with global design tokens (`var(--modal-bg)`, `var(--border-color)`):
    - **Keychain Accounts Section**: Lists all added Keychain usernames with a quick `+ Add Keychain User` button.
    - **Vault Accounts Section**: Lists all accounts stored in the local encrypted Vault, with unlock status indicator (`✓ Unlocked` or `🔒 Locked`).
    - Clicking any item instantly switches `authType` and active username.
- **Visual Identity & Theme**:
  - Dark mode native with cyan/emerald accents for Keychain and amber/gold accents for Vault keys.
  - Clear icon badges: `Shield` for Keychain, `Key` for Vault, with lock/unlock status indicators.
- **Feedback & Motion**:
  - Smooth spring popover animation via `motion/react`.
  - Automatic prompt for Vault PIN when selecting a locked Vault account.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Identity Model vs Separate Account States**:
  - *Chosen Approach*: Update the shared `useSteemAuth` hook to manage `keychainAccounts: string[]` alongside `vaultAccounts: string[]`, while exposing `switchAccount(username: string, type: 'KEYCHAIN' | 'VAULT')`.
  - *Why*: Ensures that choosing an account in Reader updates the active identity consistently, while respecting the user's explicit choice of signing provider.
- **Decision 2: Strict Signing Provider Binding**:
  - *Chosen Approach*: In `useReaderBlockchainActions.ts`, honor `effectiveAuth = authType` strictly. If `authType === 'VAULT'`, execute comments and votes via `SecurityService` without falling back to Keychain unless the user explicitly requests Keychain.
  - *Why*: Solves the user's reported bug where Keychain was always triggered even when the user wanted to sign with Vault.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────┐
│                      useSteemAuth                        │
│  - authType: 'KEYCHAIN' | 'VAULT'                        │
│  - username (primary/keychain user)                      │
│  - selectedVaultUser                                     │
│  - keychainAccounts: string[] (localStorage sync)        │
│  - vaultAccounts: string[] (SecurityService)             │
│  - switchIdentity(username, 'KEYCHAIN' | 'VAULT')        │
└──────────────┬────────────────────────────┬──────────────┘
               │                            │
               ▼                            ▼
┌───────────────────────────────┐  ┌───────────────────────┐
│     Reader Mode Controls      │  │   Gallery / Sidebar   │
│  - ReaderTopHeader selector   │  │   - Existing select   │
│  - ReaderQuickPanel (mobile)  │  │     synchronized with │
│  - useReaderBlockchainActions │  │     useSteemAuth      │
│    (routes to Keychain/Vault) │  └───────────────────────┘
└───────────────────────────────┘
```

- **State Model**:
  - `steem_keychain_accounts`: JSON array of usernames stored in `localStorage`.
  - `steem_auth_type`: `'KEYCHAIN' | 'VAULT'`.
  - `activeUser`: dynamic getter resolving to `authType === 'VAULT' ? selectedVaultUser : username`.
- **Localization (i18n)**:
  - Add synchronized keys across `uk.ts`, `en.ts`, `es.ts`, `ko.ts`: `selectAccount`, `keychainAccounts`, `vaultAccounts`, `addKeychainAccount`, `signingWithKeychain`, `signingWithVault`.
