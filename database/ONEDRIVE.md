# Integrasi OneDrive – Arsip Dokumen

## Tahap 1 (sudah aktif): tautan link OneDrive
- **Arsip Dokumen → Tambah Dokumen (Link OneDrive)**, atau **Master Data → Sub Task → Edit → Dokumen**.
- Di OneDrive/SharePoint: klik kanan file → **Share** → atur akses (mis. *People in PT Pelabuhan Indonesia*) → **Copy link** → tempel di aplikasi.
- Tersimpan di tabel `attachments` (kolom `url`, `category`, `document_number`, `document_date`, `uploaded_by`, `stage`, `notes`) dan tercatat di `activity_log`.
- Menghapus tautan di aplikasi **tidak** menghapus file di OneDrive.

## Tahap 2 (menyusul): integrasi penuh via Microsoft Graph
Tujuan: upload file langsung dari aplikasi ke folder OneDrive/SharePoint tim, memilih file (file picker), dan pratinjau tanpa menyalin link manual.

Yang perlu disiapkan bersama **IT / admin Microsoft 365 Pelindo**:
1. **App registration** di Microsoft Entra ID (Azure AD) – nama mis. "Monitoring Pengadaan Tanah".
2. **Redirect URI**: `http://localhost:3000/api/onedrive/callback` (dan alamat server produksi bila sudah di-hosting).
3. **API permissions (delegated)**: `Files.ReadWrite`, `Sites.ReadWrite.All` (bila memakai SharePoint tim), `offline_access`, `User.Read` – lalu **Grant admin consent**.
4. Berikan kepada pengembang: **Tenant ID**, **Client ID**, **Client Secret**, dan lokasi folder tujuan (OneDrive pribadi atau SharePoint site/library tim).

Setelah data di atas tersedia, nilainya diisi di `.env.local`:
```
MS_TENANT_ID=...
MS_CLIENT_ID=...
MS_CLIENT_SECRET=...
MS_REDIRECT_URI=http://localhost:3000/api/onedrive/callback
MS_DRIVE_FOLDER=/Monitoring Pengadaan Tanah 2026
```
