import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import { isDatabaseReady, DB_NAME } from "./db.js";
import {
  getActivity,
  getSnapshot,
  saveChecklistAll,
  saveChecklistEntry,
  savePrograms,
  updateSubTask,
} from "./repository.js";

dotenv.config({ path: ".env.local" });

const app = express();

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));

// Bungkus handler async agar error dikirim sebagai JSON.
const handle = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error(`[API] ${req.method} ${req.path}:`, error.message);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// ======================================================
// GOOGLE OAUTH CONFIGURATION
// ======================================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ======================================================
// TEST BACKEND
// ======================================================

app.get("/api/health", async (req, res) => {
  const db = await isDatabaseReady();
  res.json({
    success: true,
    message: "Backend Monitoring Pengadaan Tanah aktif",
    database: db.ready,
    databaseName: DB_NAME,
    programs: db.programs ?? 0,
    databaseError: db.ready ? undefined : db.error,
  });
});

// ======================================================
// DATA MONITORING (MySQL)
// ======================================================

// Seluruh data: program -> task -> sub task, checklist, ringkasan RKM.
app.get("/api/data", handle(async (req, res) => {
  res.json({ success: true, data: await getSnapshot() });
}));

app.get("/api/programs", handle(async (req, res) => {
  const snapshot = await getSnapshot();
  res.json({ success: true, data: snapshot.programs });
}));

// Simpan seluruh pohon program (dipanggil otomatis oleh frontend setiap ada perubahan).
app.put("/api/programs", handle(async (req, res) => {
  const { programs, changedBy } = req.body || {};
  const result = await savePrograms(programs, changedBy || "Pengguna");
  res.json({ success: true, updatedAt: new Date().toISOString(), ...result });
}));

// Perbarui satu sub task, mis. dari integrasi lain:
// PATCH /api/sub-tasks/SUB-01C3  { "progress": 100 }  -> otomatis berstatus Selesai
app.patch("/api/sub-tasks/:id", handle(async (req, res) => {
  const { changedBy, ...patch } = req.body || {};
  res.json({ success: true, data: await updateSubTask(req.params.id, patch, changedBy || "Pengguna") });
}));

// Checklist dokumen per tahapan
app.put("/api/checklist", handle(async (req, res) => {
  const { checklist, changedBy } = req.body || {};
  res.json({ success: true, ...(await saveChecklistAll(checklist, changedBy || "Pengguna")) });
}));

app.put("/api/checklist/:programId/:documentKey", handle(async (req, res) => {
  const { changedBy, ...entry } = req.body || {};
  await saveChecklistEntry(req.params.programId, req.params.documentKey, entry, changedBy || "Pengguna");
  res.json({ success: true });
}));

// Riwayat perubahan
app.get("/api/activity", handle(async (req, res) => {
  res.json({ success: true, data: await getActivity(req.query.limit) });
}));

// ======================================================
// GOOGLE LOGIN / CONNECT DRIVE
// ======================================================

app.get("/api/google/auth", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.redirect(authUrl);
});

// ======================================================
// GOOGLE CALLBACK
// ======================================================

app.get("/api/google/callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send("Authorization code tidak ditemukan.");
    }

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    console.log("Google Drive berhasil terhubung!");

    // Token sementara masih disimpan di memory.
    // Nanti kita pindahkan ke database secara aman.

    res.redirect(`${FRONTEND_URL}?googleDrive=connected`);
  } catch (error) {
    console.error("Google OAuth Error:", error);

    res.status(500).send("Gagal menghubungkan Google Drive.");
  }
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log("");
  console.log("==========================================");
  console.log(" Monitoring Pengadaan Tanah Backend");
  console.log("==========================================");
  console.log(`Server : http://localhost:${PORT}`);
  console.log(`Health : http://localhost:${PORT}/api/health`);
  console.log("==========================================");
});