/**
 * Setup database MySQL:  npm run db:setup
 *   1. Membuat database + seluruh tabel & view (database/schema.sql)
 *   2. Mengisi master dokumen tahapan
 *   3. Mengisi data awal (program, task, sub task, PIC, RKM, checklist) bila database masih kosong
 *
 * Tambahkan --reset untuk MENGHAPUS semua data lalu mengisi ulang:  npm run db:setup -- --reset
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { dbConfig, DB_NAME, pool } from './db.js';
import { savePrograms, saveChecklistAll, saveRkmSummary } from './repository.js';
import { INITIAL_PROGRAMS, RKM_SUMMARY } from '../src/data';
import { buildInitialChecklist, DEFAULT_STAGE_DOCUMENTS, STAGES, checklistDocKey } from '../src/checklist';
import { normalizePrograms } from '../src/utils';

const reset = process.argv.includes('--reset');

async function main() {
  console.log(`\n→ Menghubungkan ke MySQL ${dbConfig.user}@${dbConfig.host}:${dbConfig.port} ...`);
  const admin = await mysql.createConnection({ ...dbConfig, multipleStatements: true });

  if (reset) {
    console.log(`→ --reset: menghapus database ${DB_NAME}`);
    await admin.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
  }

  const schemaPath = path.resolve(process.cwd(), 'database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8').replace(/monitoring_pengadaan_tanah/g, DB_NAME);
  console.log('→ Membuat tabel & view (database/schema.sql)');
  await admin.query(schema);
  await admin.end();

  console.log('→ Mengisi master dokumen tahapan');
  const docRows: any[] = [];
  STAGES.forEach(stage =>
    DEFAULT_STAGE_DOCUMENTS[stage].forEach((name, index) => docRows.push([checklistDocKey(stage, index), stage, name, 1, index])),
  );
  await pool.query(
    `INSERT INTO stage_documents (document_key, stage, name, required, sort_order) VALUES ?
     ON DUPLICATE KEY UPDATE name=VALUES(name), stage=VALUES(stage), sort_order=VALUES(sort_order)`,
    [docRows],
  );

  const [[{ total }]]: any = await pool.query('SELECT COUNT(*) AS total FROM programs');
  if (Number(total) > 0) {
    console.log(`✓ Database sudah berisi ${total} program – data tidak ditimpa. (Pakai --reset untuk mengisi ulang.)`);
  } else {
    console.log('→ Mengisi data awal program, task, sub task, PIC & RKM');
    await saveRkmSummary(RKM_SUMMARY);
    const result = await savePrograms(normalizePrograms(INITIAL_PROGRAMS), 'Seed data awal');
    await saveChecklistAll(buildInitialChecklist(INITIAL_PROGRAMS), 'Seed data awal');
    console.log(`✓ Data awal tersimpan (${result.changes} entri riwayat).`);
  }

  const [[summary]]: any = await pool.query(
    `SELECT (SELECT COUNT(*) FROM programs) AS program, (SELECT COUNT(*) FROM tasks) AS task,
            (SELECT COUNT(*) FROM sub_tasks) AS sub_task, (SELECT COUNT(*) FROM program_stage_checklist) AS checklist`,
  );
  console.log(
    `\n✓ Selesai. Database "${DB_NAME}": ${summary.program} program · ${summary.task} task · ${summary.sub_task} sub task · ${summary.checklist} checklist\n`,
  );
  await pool.end();
}

main().catch(async error => {
  console.error('\n✗ Setup database gagal:', error.message);
  console.error('  Periksa DB_HOST / DB_PORT / DB_USER / DB_PASSWORD di .env.local dan pastikan MySQL sudah berjalan.\n');
  await pool.end().catch(() => {});
  process.exit(1);
});
