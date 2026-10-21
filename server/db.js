import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

export const DB_NAME = process.env.DB_NAME || "monitoring_pengadaan_tanah";

export const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
};

/** Pool koneksi MySQL. DATE/DATETIME dikembalikan sebagai string (YYYY-MM-DD). */
export const pool = mysql.createPool({
  ...dbConfig,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  charset: "utf8mb4",
});

export async function isDatabaseReady() {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM programs");
    return { ready: true, programs: Number(rows[0].total) };
  } catch (error) {
    return { ready: false, error: error.message };
  }
}
