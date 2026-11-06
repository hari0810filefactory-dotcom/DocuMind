# DocuMind

> **Your Documents. Organized. Understood. Always Accessible.**

DocuMind is an independent, commercial-grade, offline-first intelligent document management platform. It allows individuals, households, and small businesses to securely store, organize, understand, search, retrieve, and manage important documents without reliance on cloud databases or external services.

---

## 1. Project Overview & Architecture

DocuMind runs with a **Local-First Architecture**:
- **Zero Cloud Dependence for Core Vault**: Storing, categorizing, tagging, searching, OCR processing, and reminder calculations execute 100% locally on your device.
- **Offline Intelligence**:
  - In-browser PDF text extraction via **PDF.js**.
  - Local in-browser OCR using **Tesseract.js** in dedicated Web Workers.
  - Deterministic rule-based document classification (12+ standard document types: Identity, Education, Employment, Invoice, Receipt, Insurance, Property, Vehicle, Contract, Business Licence, Tax, Medical, Other).
  - Deterministic metadata extraction for issue dates, expiry dates, amounts, and reference IDs.
  - Local inverted full-text search indexing with highlighted snippet generation.
  - Transparent Document Health Score (0–100) and audit reporting.
- **Optional Online Gemini AI**:
  - Accessible only when online and explicitly approved per request via a detailed data transmission disclosure dialog.
  - Server-side proxy integration protecting API keys from browser bundles.
  - Performs factual executive summaries, strict grounded Q&A, version comparisons, and plain English explanation of complex clauses.

---

## 2. Technology Stack

- **Frontend Framework**: React 19, TypeScript, Vite.
- **Design System**: Tailwind CSS v4, Lucide Icons, Plus Jakarta Sans, JetBrains Mono with tabular numerals.
- **PWA & Offline Shell**: `vite-plugin-pwa`, Service Worker with CacheFirst font caching and precaching.
- **Local Persistence**:
  - **Dexie.js** (IndexedDB) for structured metadata records, versions, categories, reminders, and audit history.
  - **OPFS (Origin Private File System)** for high-speed local file binary storage, with automated fallback to IndexedDB Blob storage.
- **Security & Cryptography**:
  - Web Crypto API (`crypto.subtle`).
  - AES-GCM 256-bit encryption for sensitive local data and backup packages.
  - PBKDF2 key derivation (SHA-256 with 100,000 iterations).
  - In-memory key purging upon manual or automatic inactivity lock.
- **Backup & Archiving**:
  - **JSZip** for full workspace `.zip` and encrypted `.dmbackup` exports.
  - Cryptographic checksums (SHA-256) and manifest verification on restore.

---

## 3. Application Navigation & Pages

1. **Dashboard**: Live document counts, local storage quota, recent documents, category distribution, upcoming reminders, and document health score.
2. **My Documents**: All Documents, Recent, Favorites, Shared with Me, Archived, and Trash with table/grid views.
3. **Categories**: Identity, Education, Employment, Finance, Insurance, Property, Vehicle, Business, and Other.
4. **AI Intelligence**: Document Assistant (grounded Q&A), OCR & Human Field Verification, Summaries, and Processing Queue.
5. **Smart Search**: Inverted full-text index search with keyword highlighting, type/category/date/expiry filters, and snippet context.
6. **Reminders**: Local expiry engine tracking upcoming and overdue renewals with 90d/60d/30d/14d/7d intervals and snoozing.
7. **Document Timeline**: Chronological event stream tracking issue dates, upload dates, expiries, and version updates.
8. **Relationships**: Link warranties to purchases, insurance to assets, invoices to contracts, and renewals.
9. **Reports & Document Health**: Transparent compliance score breakdown, expiration risks, and CSV audit export.
10. **Workspace & Members**: Personal, Household, and Business workspace switching, local member management (Owner, Admin, Member, Viewer).
11. **Settings**: Profile, Master Password, Inactivity Auto-Lock, Offline Storage Engine, Backup & Restore, AI Preferences, and About.

---

## 4. Local Security & Storage Details

### Cryptographic Protections
- Master passwords are never stored in plaintext. Verification uses PBKDF2 key derivation against a cryptographically random 16-byte salt and fixed challenge string.
- When the vault is locked (manually or after the configured inactivity timeout), encryption keys are purged from memory.
- Backups can be exported as AES-GCM encrypted envelopes (`.dmbackup`) requiring the backup password to inspect and restore.

### Important Storage Notice
Modern web browsers isolate local data per origin. If you clear browser history and site data without an exported backup, stored files and IndexedDB records will be removed. **DocuMind strongly recommends exporting regular encrypted backups using the Settings > Backup & Restore tab.**

---

## 5. Setup & Running Instructions

### Development Server
```bash
npm install
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### Production Build
```bash
npm run build
npm start
```

---

## 6. Future LAN Architecture Roadmap

DocuMind's modular architecture separates the storage and service layer from the UI. In future releases:
- **Private LAN Server**: Deployable to a local Raspberry Pi, NAS, or private home server without internet access.
- **Multi-Device Synchronization**: Synchronization between household phones and laptops over local Wi-Fi.
- **Conflict Resolution**: Deterministic multi-master version trees and local audit logging.
