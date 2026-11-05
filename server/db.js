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

/**
 * Migrasi otomatis (aman dijalankan berulang): menambah kolom baru pada
 * database yang dibuat dengan versi skema sebelumnya.
 */
const MIGRATIONS = [
  ["attachments", "category", "VARCHAR(80) NULL COMMENT 'Jenis dokumen'"],
  ["attachments", "document_number", "VARCHAR(120) NULL"],
  ["attachments", "document_date", "DATE NULL"],
  ["attachments", "uploaded_by", "VARCHAR(150) NULL"],
  ["attachments", "stage", "VARCHAR(40) NULL"],
  ["attachments", "notes", "VARCHAR(500) NULL"],
];

export async function migrate() {
  try {
    const [rows] = await pool.query(
      "SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?",
      [DB_NAME],
    );
    const existing = new Set(rows.map(row => `${row.t}.${row.c}`));
    const tables = new Set(rows.map(row => row.t));
    const applied = [];
    for (const [table, column, definition] of MIGRATIONS) {
      if (!tables.has(table) || existing.has(`${table}.${column}`)) continue;
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      applied.push(`${table}.${column}`);
    }
    if (applied.length) console.log(`✓ Migrasi database: ${applied.join(", ")}`);
    return applied;
  } catch (error) {
    console.warn("⚠ Migrasi database dilewati:", error.message);
    return [];
  }
}
