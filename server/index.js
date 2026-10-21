import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";

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

app.use(express.json());

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

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend Monitoring Pengadaan Tanah aktif",
  });
});

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