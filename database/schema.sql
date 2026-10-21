-- =====================================================================
--  MONITORING PENGADAAN TANAH 2026 – SKEMA DATABASE MySQL
--  Kompatibel: MySQL 8.x dan MariaDB 10.4+ (XAMPP / Laragon)
--
--  Hierarki data:
--    rkm_summary (1 baris)            -> header Laporan Bulanan RKM
--    programs                         -> Program kerja (PIC, ID RKM, aktual/baseline)
--      ├─ program_narratives          -> Capaian / Isu / Next Step
--      ├─ program_stage_checklist     -> Checklist dokumen per tahapan
--      └─ tasks                       -> Task list (RKM / Non RKM, tahapan)
--           └─ sub_tasks              -> Sub task (status, progres, PIC, jadwal)
--                └─ attachments       -> Lampiran / link dokumen
--    stage_documents                  -> Master dokumen wajib per tahapan
--    activity_log                     -> Riwayat setiap perubahan data
--
--  Kode status sub task (label di aplikasi):
--    DONE = Selesai · WIP = Proses · NOT_STARTED = Belum Mulai · DELAYED = Tertunda
-- =====================================================================

CREATE DATABASE IF NOT EXISTS monitoring_pengadaan_tanah
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE monitoring_pengadaan_tanah;

-- ---------------------------------------------------------------------
-- Header Laporan RKM (realisasi aktual vs baseline keseluruhan)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rkm_summary (
  id          TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  title       VARCHAR(255)     NOT NULL,
  unit        VARCHAR(255)     NULL,
  actual      DECIMAL(5,2)     NOT NULL DEFAULT 0 COMMENT 'Realisasi aktual (%)',
  baseline    DECIMAL(5,2)     NOT NULL DEFAULT 0 COMMENT 'Target baseline (%)',
  status      VARCHAR(50)      NOT NULL DEFAULT 'On Progress',
  start_date  DATE             NULL,
  end_date    DATE             NULL,
  source      VARCHAR(255)     NULL,
  updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Program kerja
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id            VARCHAR(40)   NOT NULL PRIMARY KEY            COMMENT 'mis. PRG-01',
  code          VARCHAR(60)   NULL                            COMMENT 'ID RKM, mis. IS-18-KMSL-01-01',
  name          VARCHAR(255)  NOT NULL,
  pic           VARCHAR(150)  NULL                            COMMENT 'PIC program',
  start_date    DATE          NULL,
  end_date      DATE          NULL,
  rkm_actual    DECIMAL(5,2)  NULL                            COMMENT 'Progres aktual RKM (%)',
  rkm_baseline  DECIMAL(5,2)  NULL                            COMMENT 'Baseline RKM (%)',
  rkm_status    VARCHAR(50)   NULL DEFAULT 'On Progress',
  sort_order    INT           NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Narasi laporan per program: Capaian / Isu / Next Step
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS program_narratives (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  program_id  VARCHAR(40)   NOT NULL,
  kind        ENUM('CAPAIAN','ISU','NEXT_STEP') NOT NULL,
  title       VARCHAR(255)  NOT NULL,
  detail      TEXT          NULL,
  sort_order  INT           NOT NULL DEFAULT 0,
  KEY idx_narr_program (program_id, kind, sort_order),
  CONSTRAINT fk_narr_program FOREIGN KEY (program_id)
    REFERENCES programs (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Task list
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id           VARCHAR(40)   NOT NULL PRIMARY KEY            COMMENT 'mis. TSK-01A',
  program_id   VARCHAR(40)   NOT NULL,
  name         VARCHAR(500)  NOT NULL,
  type         ENUM('RKM','NON_RKM') NOT NULL DEFAULT 'RKM',
  stage        VARCHAR(60)   NULL                            COMMENT 'mis. C. Pelaksanaan',
  stage_code   VARCHAR(20)   NULL,
  task_code    VARCHAR(20)   NULL,
  description  TEXT          NULL,
  sort_order   INT           NOT NULL DEFAULT 0,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_task_program (program_id, sort_order),
  CONSTRAINT fk_task_program FOREIGN KEY (program_id)
    REFERENCES programs (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Sub task list
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sub_tasks (
  id                  VARCHAR(60)   NOT NULL PRIMARY KEY     COMMENT 'mis. SUB-01A1',
  task_id             VARCHAR(40)   NOT NULL,
  name                VARCHAR(500)  NOT NULL,
  status              ENUM('DONE','WIP','NOT_STARTED','DELAYED') NOT NULL DEFAULT 'WIP'
                      COMMENT 'Selesai / Proses / Belum Mulai / Tertunda',
  progress            TINYINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '0 - 100',
  pic                 VARCHAR(150)  NULL,
  start_date          DATE          NULL,
  due_date            DATE          NULL,
  notes               TEXT          NULL                     COMMENT 'Keterangan / hambatan',
  estimated_schedule  TINYINT(1)    NOT NULL DEFAULT 0       COMMENT '1 = tanggal masih estimasi rencana RKM',
  priority            VARCHAR(20)   NULL,
  weight              DECIMAL(6,2)  NULL,
  budget              VARCHAR(100)  NULL,
  sort_order          INT           NOT NULL DEFAULT 0,
  completed_at        DATETIME      NULL                     COMMENT 'Diisi otomatis saat status menjadi Selesai',
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sub_task (task_id, sort_order),
  KEY idx_sub_status (status),
  KEY idx_sub_due (due_date),
  CONSTRAINT fk_sub_task FOREIGN KEY (task_id)
    REFERENCES tasks (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Lampiran (link Google Drive / file)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id           VARCHAR(60)   NOT NULL PRIMARY KEY,
  sub_task_id  VARCHAR(60)   NULL,
  task_id      VARCHAR(40)   NULL,
  name         VARCHAR(255)  NOT NULL,
  type         ENUM('PDF','DOCX','IMAGE','ZIP','OTHER') NOT NULL DEFAULT 'OTHER',
  url          VARCHAR(1000) NULL,
  uploaded_at  DATE          NULL,
  KEY idx_att_sub (sub_task_id),
  KEY idx_att_task (task_id),
  CONSTRAINT fk_att_sub FOREIGN KEY (sub_task_id)
    REFERENCES sub_tasks (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_att_task FOREIGN KEY (task_id)
    REFERENCES tasks (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Master dokumen wajib per tahapan
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage_documents (
  document_key  VARCHAR(80)   NOT NULL PRIMARY KEY           COMMENT 'mis. default-Persiapan-0',
  stage         ENUM('Perencanaan','Persiapan','Pelaksanaan','Penyerahan Hasil','Pensertipikatan') NOT NULL,
  name          VARCHAR(255)  NOT NULL,
  required      TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order    INT           NOT NULL DEFAULT 0,
  KEY idx_stage_doc (stage, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Checklist dokumen per program (status kelengkapan)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS program_stage_checklist (
  program_id    VARCHAR(40)   NOT NULL,
  document_key  VARCHAR(80)   NOT NULL,
  status        ENUM('AVAILABLE','MISSING','OPTIONAL') NOT NULL DEFAULT 'MISSING'
                COMMENT 'Tersedia / Belum Ada / Tidak Wajib',
  upload_date   DATETIME      NULL,
  pic           VARCHAR(150)  NULL,
  file_name     VARCHAR(255)  NULL,
  file_url      VARCHAR(1000) NULL,
  notes         VARCHAR(500)  NULL,
  updated_by    VARCHAR(150)  NULL,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (program_id, document_key),
  CONSTRAINT fk_check_program FOREIGN KEY (program_id)
    REFERENCES programs (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Riwayat perubahan (audit trail)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity_type  ENUM('PROGRAM','TASK','SUB_TASK','CHECKLIST') NOT NULL,
  entity_id    VARCHAR(120)  NOT NULL,
  action       ENUM('CREATE','UPDATE','DELETE') NOT NULL,
  field_name   VARCHAR(60)   NULL,
  old_value    TEXT          NULL,
  new_value    TEXT          NULL,
  description  VARCHAR(500)  NULL,
  changed_by   VARCHAR(150)  NULL,
  changed_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_log_entity (entity_type, entity_id),
  KEY idx_log_time (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- VIEW: pekerjaan yang masih berjalan (dipakai Manajemen Monitoring)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_monitoring_aktif AS
SELECT
  p.id   AS program_id,  p.name AS program,  p.pic AS pic_program,
  t.id   AS task_id,     t.name AS task,     t.type AS jenis,  t.stage AS tahapan,
  s.id   AS sub_task_id, s.name AS sub_task, s.pic,
  CASE s.status WHEN 'DONE' THEN 'Selesai' WHEN 'WIP' THEN 'Proses'
                WHEN 'NOT_STARTED' THEN 'Belum Mulai' ELSE 'Tertunda' END AS status,
  s.progress, s.start_date, s.due_date,
  CASE WHEN s.due_date < CURDATE() THEN DATEDIFF(CURDATE(), s.due_date) ELSE 0 END AS hari_terlambat,
  s.notes
FROM sub_tasks s
JOIN tasks t    ON t.id = s.task_id
JOIN programs p ON p.id = t.program_id
WHERE s.status <> 'DONE' AND s.progress < 100;

-- ---------------------------------------------------------------------
-- VIEW: ringkasan progres per program
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_progres_program AS
SELECT
  p.id, p.code, p.name, p.pic, p.rkm_actual, p.rkm_baseline,
  COUNT(s.id)                                     AS total_sub_task,
  SUM(s.status = 'DONE')                          AS selesai,
  SUM(s.status = 'WIP')                           AS proses,
  SUM(s.status = 'NOT_STARTED')                   AS belum_mulai,
  SUM(s.status = 'DELAYED')                       AS tertunda,
  ROUND(AVG(CASE WHEN s.status = 'DONE' THEN 100 ELSE s.progress END), 0) AS progres_sub_task
FROM programs p
LEFT JOIN tasks t     ON t.program_id = p.id
LEFT JOIN sub_tasks s ON s.task_id = t.id
GROUP BY p.id, p.code, p.name, p.pic, p.rkm_actual, p.rkm_baseline;
