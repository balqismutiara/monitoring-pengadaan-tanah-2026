import { pool } from "./db.js";

/* =====================================================================
 * Repository: membaca & menyimpan data monitoring ke MySQL.
 * Struktur JSON yang dipakai frontend:
 *   Program { id, code, name, pic, startDate, endDate, rkm:{actual,baseline,status},
 *             capaian[], isu[], nextStep[], tasks: Task[] }
 *   Task    { id, name, type, stage, stageCode, taskCode, description, subTasks: SubTask[] }
 *   SubTask { id, name, status, progress, pic, startDate, dueDate, notes,
 *             estimatedSchedule, priority, weight, budget, attachments[] }
 * ===================================================================== */

const STATUS = new Set(["DONE", "WIP", "NOT_STARTED", "DELAYED"]);
const STATUS_LABEL = { DONE: "Selesai", WIP: "Proses", NOT_STARTED: "Belum Mulai", DELAYED: "Tertunda" };
const NARRATIVE_KINDS = [
  ["capaian", "CAPAIAN"],
  ["isu", "ISU"],
  ["nextStep", "NEXT_STEP"],
];

const toDate = value => {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};
const toDateTime = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace("T", " ");
};
const toNumber = (value, fallback = null) =>
  value === undefined || value === null || value === "" || Number.isNaN(Number(value))
    ? fallback
    : Number(value);
const clampProgress = value => Math.min(100, Math.max(0, Math.round(toNumber(value, 0))));

function normalizeStatus(value, progress) {
  let status = String(value || "WIP").toUpperCase();
  if (status === "SELESAI") status = "DONE";
  if (status === "PROSES") status = "WIP";
  if (status === "BELUM MULAI") status = "NOT_STARTED";
  if (status === "TERTUNDA") status = "DELAYED";
  if (!STATUS.has(status)) status = "WIP";
  if (status === "DONE" || progress >= 100) return "DONE";
  if (status === "NOT_STARTED" && progress > 0) return "WIP";
  return status;
}

/* ---------------------------------------------------------------------
 * READ
 * ------------------------------------------------------------------- */
export async function getSnapshot() {
  const [[programs], [narratives], [tasks], [subTasks], [attachments], [checklistRows], [summaryRows], [lastLog]] =
    await Promise.all([
      pool.query("SELECT * FROM programs ORDER BY sort_order, id"),
      pool.query("SELECT * FROM program_narratives ORDER BY program_id, kind, sort_order, id"),
      pool.query("SELECT * FROM tasks ORDER BY program_id, sort_order, id"),
      pool.query("SELECT * FROM sub_tasks ORDER BY task_id, sort_order, id"),
      pool.query("SELECT * FROM attachments ORDER BY uploaded_at, id"),
      pool.query("SELECT * FROM program_stage_checklist"),
      pool.query("SELECT * FROM rkm_summary WHERE id = 1"),
      pool.query("SELECT MAX(changed_at) AS last FROM activity_log"),
    ]);

  const attachmentsBySub = new Map();
  attachments.forEach(row => {
    if (!row.sub_task_id) return;
    if (!attachmentsBySub.has(row.sub_task_id)) attachmentsBySub.set(row.sub_task_id, []);
    attachmentsBySub.get(row.sub_task_id).push({
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url || "",
      uploadedAt: row.uploaded_at || undefined,
    });
  });

  const subTasksByTask = new Map();
  subTasks.forEach(row => {
    if (!subTasksByTask.has(row.task_id)) subTasksByTask.set(row.task_id, []);
    subTasksByTask.get(row.task_id).push({
      id: row.id,
      name: row.name,
      status: row.status,
      progress: Number(row.progress),
      pic: row.pic || "",
      startDate: row.start_date || "",
      dueDate: row.due_date || "",
      notes: row.notes || "",
      estimatedSchedule: Boolean(row.estimated_schedule),
      priority: row.priority || undefined,
      weight: row.weight !== null ? Number(row.weight) : undefined,
      budget: row.budget || undefined,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
      attachments: attachmentsBySub.get(row.id) || [],
    });
  });

  const tasksByProgram = new Map();
  tasks.forEach(row => {
    if (!tasksByProgram.has(row.program_id)) tasksByProgram.set(row.program_id, []);
    tasksByProgram.get(row.program_id).push({
      id: row.id,
      name: row.name,
      type: row.type,
      stage: row.stage || undefined,
      stageCode: row.stage_code || undefined,
      taskCode: row.task_code || undefined,
      description: row.description || undefined,
      subTasks: subTasksByTask.get(row.id) || [],
    });
  });

  const narrativesByProgram = new Map();
  narratives.forEach(row => {
    if (!narrativesByProgram.has(row.program_id)) {
      narrativesByProgram.set(row.program_id, { CAPAIAN: [], ISU: [], NEXT_STEP: [] });
    }
    narrativesByProgram.get(row.program_id)[row.kind].push({ title: row.title, detail: row.detail || "" });
  });

  const tree = programs.map(row => {
    const narrative = narrativesByProgram.get(row.id) || { CAPAIAN: [], ISU: [], NEXT_STEP: [] };
    return {
      id: row.id,
      code: row.code || undefined,
      name: row.name,
      pic: row.pic || undefined,
      startDate: row.start_date || undefined,
      endDate: row.end_date || undefined,
      rkm:
        row.rkm_actual !== null
          ? {
              actual: Number(row.rkm_actual),
              baseline: Number(row.rkm_baseline ?? 0),
              status: row.rkm_status || "On Progress",
            }
          : undefined,
      capaian: narrative.CAPAIAN,
      isu: narrative.ISU,
      nextStep: narrative.NEXT_STEP,
      tasks: tasksByProgram.get(row.id) || [],
    };
  });

  const checklist = {};
  checklistRows.forEach(row => {
    if (!checklist[row.program_id]) checklist[row.program_id] = {};
    checklist[row.program_id][row.document_key] = {
      status: row.status,
      uploadDate: row.upload_date || "",
      pic: row.pic || "-",
      fileName: row.file_name || undefined,
      fileUrl: row.file_url || undefined,
      notes: row.notes || undefined,
    };
  });

  const summary = summaryRows[0];
  return {
    programs: tree,
    checklist,
    rkmSummary: summary
      ? {
          title: summary.title,
          unit: summary.unit,
          actual: Number(summary.actual),
          baseline: Number(summary.baseline),
          status: summary.status,
          startDate: summary.start_date,
          endDate: summary.end_date,
          source: summary.source,
        }
      : null,
    updatedAt: lastLog[0]?.last || null,
  };
}

/* ---------------------------------------------------------------------
 * WRITE – simpan seluruh pohon program (dipakai frontend setiap ada perubahan)
 * Upsert + hapus yang tidak ada lagi, dalam satu transaksi, dan catat
 * setiap perubahan sub task ke activity_log.
 * ------------------------------------------------------------------- */
export async function savePrograms(programs, changedBy = "Sistem") {
  if (!Array.isArray(programs) || programs.length === 0) {
    throw Object.assign(new Error("Data program kosong – penyimpanan dibatalkan untuk mencegah data terhapus."), {
      status: 400,
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingSubRows] = await connection.query("SELECT * FROM sub_tasks");
    const existingSubs = new Map(existingSubRows.map(row => [row.id, row]));
    const [existingTaskRows] = await connection.query("SELECT id, name, program_id FROM tasks");
    const existingTasks = new Map(existingTaskRows.map(row => [row.id, row]));
    const [existingProgramRows] = await connection.query("SELECT id, name FROM programs");
    const existingPrograms = new Map(existingProgramRows.map(row => [row.id, row]));

    const keepPrograms = new Set();
    const keepTasks = new Set();
    const keepSubs = new Set();
    const logs = [];
    const log = (entityType, entityId, action, field, oldValue, newValue, description) =>
      logs.push([
        entityType,
        String(entityId).slice(0, 120),
        action,
        field,
        oldValue === undefined || oldValue === null ? null : String(oldValue),
        newValue === undefined || newValue === null ? null : String(newValue),
        description ? String(description).slice(0, 500) : null,
        changedBy,
      ]);

    for (const [programIndex, program] of programs.entries()) {
      if (!program?.id) continue;
      keepPrograms.add(program.id);
      if (!existingPrograms.has(program.id)) log("PROGRAM", program.id, "CREATE", null, null, program.name, `Program baru: ${program.name}`);
      else if (existingPrograms.get(program.id).name !== program.name)
        log("PROGRAM", program.id, "UPDATE", "name", existingPrograms.get(program.id).name, program.name, "Nama program diubah");

      await connection.query(
        `INSERT INTO programs (id, code, name, pic, start_date, end_date, rkm_actual, rkm_baseline, rkm_status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE code=VALUES(code), name=VALUES(name), pic=VALUES(pic), start_date=VALUES(start_date),
           end_date=VALUES(end_date), rkm_actual=VALUES(rkm_actual), rkm_baseline=VALUES(rkm_baseline),
           rkm_status=VALUES(rkm_status), sort_order=VALUES(sort_order)`,
        [
          program.id,
          program.code || null,
          program.name || "Program",
          program.pic || null,
          toDate(program.startDate),
          toDate(program.endDate),
          toNumber(program.rkm?.actual),
          toNumber(program.rkm?.baseline),
          program.rkm?.status || "On Progress",
          programIndex,
        ],
      );

      await connection.query("DELETE FROM program_narratives WHERE program_id = ?", [program.id]);
      const narrativeRows = [];
      NARRATIVE_KINDS.forEach(([key, kind]) =>
        (program[key] || []).forEach((item, index) =>
          narrativeRows.push([program.id, kind, String(item.title || "-").slice(0, 255), item.detail || "", index]),
        ),
      );
      if (narrativeRows.length) {
        await connection.query(
          "INSERT INTO program_narratives (program_id, kind, title, detail, sort_order) VALUES ?",
          [narrativeRows],
        );
      }

      for (const [taskIndex, task] of (program.tasks || []).entries()) {
        if (!task?.id) continue;
        keepTasks.add(task.id);
        if (!existingTasks.has(task.id)) log("TASK", task.id, "CREATE", null, null, task.name, `Task baru: ${task.name}`);
        else if (existingTasks.get(task.id).name !== task.name)
          log("TASK", task.id, "UPDATE", "name", existingTasks.get(task.id).name, task.name, "Nama task diubah");

        await connection.query(
          `INSERT INTO tasks (id, program_id, name, type, stage, stage_code, task_code, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE program_id=VALUES(program_id), name=VALUES(name), type=VALUES(type), stage=VALUES(stage),
             stage_code=VALUES(stage_code), task_code=VALUES(task_code), description=VALUES(description), sort_order=VALUES(sort_order)`,
          [
            task.id,
            program.id,
            task.name || "Task",
            task.type === "NON_RKM" ? "NON_RKM" : "RKM",
            task.stage || null,
            task.stageCode || null,
            task.taskCode || null,
            task.description || null,
            taskIndex,
          ],
        );

        for (const [subIndex, sub] of (task.subTasks || []).entries()) {
          if (!sub?.id) continue;
          keepSubs.add(sub.id);
          const progress = clampProgress(sub.progress);
          const status = normalizeStatus(sub.status, progress);
          const finalProgress = status === "DONE" ? 100 : progress;
          const previous = existingSubs.get(sub.id);

          if (!previous) {
            log("SUB_TASK", sub.id, "CREATE", null, null, sub.name, `Sub task baru: ${sub.name}`);
          } else {
            const compare = [
              ["status", previous.status, status, value => STATUS_LABEL[value] || value],
              ["progress", Number(previous.progress), finalProgress, value => `${value}%`],
              ["pic", previous.pic || "", sub.pic || "", value => value],
              ["due_date", previous.due_date || "", toDate(sub.dueDate) || "", value => value],
              ["name", previous.name, sub.name, value => value],
            ];
            compare.forEach(([field, oldValue, newValue, format]) => {
              if (String(oldValue) !== String(newValue)) {
                log("SUB_TASK", sub.id, "UPDATE", field, format(oldValue), format(newValue), `${sub.name}: ${field} diubah`);
              }
            });
          }

          const completedAt =
            status === "DONE"
              ? previous?.completed_at || toDateTime(new Date())
              : null;

          await connection.query(
            `INSERT INTO sub_tasks (id, task_id, name, status, progress, pic, start_date, due_date, notes,
               estimated_schedule, priority, weight, budget, sort_order, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE task_id=VALUES(task_id), name=VALUES(name), status=VALUES(status), progress=VALUES(progress),
               pic=VALUES(pic), start_date=VALUES(start_date), due_date=VALUES(due_date), notes=VALUES(notes),
               estimated_schedule=VALUES(estimated_schedule), priority=VALUES(priority), weight=VALUES(weight),
               budget=VALUES(budget), sort_order=VALUES(sort_order), completed_at=VALUES(completed_at)`,
            [
              sub.id,
              task.id,
              sub.name || "Sub task",
              status,
              finalProgress,
              sub.pic || null,
              toDate(sub.startDate),
              toDate(sub.dueDate),
              sub.notes || null,
              sub.estimatedSchedule ? 1 : 0,
              sub.priority || null,
              toNumber(sub.weight),
              sub.budget || null,
              subIndex,
              completedAt,
            ],
          );

          await connection.query("DELETE FROM attachments WHERE sub_task_id = ?", [sub.id]);
          const attachmentRows = (sub.attachments || [])
            .filter(att => att && att.name)
            .map(att => [
              String(att.id || `${sub.id}-${att.name}`).slice(0, 60),
              sub.id,
              String(att.name).slice(0, 255),
              ["PDF", "DOCX", "IMAGE", "ZIP"].includes(att.type) ? att.type : "OTHER",
              att.url && !String(att.url).startsWith("blob:") ? att.url : null,
              toDate(att.uploadedAt),
            ]);
          if (attachmentRows.length) {
            await connection.query(
              "INSERT INTO attachments (id, sub_task_id, name, type, url, uploaded_at) VALUES ? ON DUPLICATE KEY UPDATE name=VALUES(name)",
              [attachmentRows],
            );
          }
        }
      }
    }

    // Hapus data yang sudah tidak ada di aplikasi (dihapus lewat Master Data).
    for (const [id, row] of existingSubs) {
      if (!keepSubs.has(id)) {
        await connection.query("DELETE FROM sub_tasks WHERE id = ?", [id]);
        log("SUB_TASK", id, "DELETE", null, row.name, null, `Sub task dihapus: ${row.name}`);
      }
    }
    for (const [id, row] of existingTasks) {
      if (!keepTasks.has(id)) {
        await connection.query("DELETE FROM tasks WHERE id = ?", [id]);
        log("TASK", id, "DELETE", null, row.name, null, `Task dihapus: ${row.name}`);
      }
    }
    for (const [id, row] of existingPrograms) {
      if (!keepPrograms.has(id)) {
        await connection.query("DELETE FROM programs WHERE id = ?", [id]);
        log("PROGRAM", id, "DELETE", null, row.name, null, `Program dihapus: ${row.name}`);
      }
    }

    if (logs.length) {
      await connection.query(
        `INSERT INTO activity_log (entity_type, entity_id, action, field_name, old_value, new_value, description, changed_by)
         VALUES ?`,
        [logs],
      );
    }

    await connection.commit();
    return { changes: logs.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** Perbarui satu sub task (status, progres, PIC, tanggal, catatan). */
export async function updateSubTask(id, patch, changedBy = "Sistem") {
  const [rows] = await pool.query("SELECT * FROM sub_tasks WHERE id = ?", [id]);
  const current = rows[0];
  if (!current) throw Object.assign(new Error("Sub task tidak ditemukan"), { status: 404 });

  const progress = patch.progress !== undefined ? clampProgress(patch.progress) : Number(current.progress);
  const status = normalizeStatus(patch.status ?? current.status, progress);
  const next = {
    status,
    progress: status === "DONE" ? 100 : progress,
    pic: patch.pic ?? current.pic,
    start_date: patch.startDate !== undefined ? toDate(patch.startDate) : current.start_date,
    due_date: patch.dueDate !== undefined ? toDate(patch.dueDate) : current.due_date,
    notes: patch.notes ?? current.notes,
    completed_at: status === "DONE" ? current.completed_at || toDateTime(new Date()) : null,
  };

  await pool.query(
    `UPDATE sub_tasks SET status=?, progress=?, pic=?, start_date=?, due_date=?, notes=?, completed_at=? WHERE id=?`,
    [next.status, next.progress, next.pic, next.start_date, next.due_date, next.notes, next.completed_at, id],
  );

  const changes = ["status", "progress", "pic", "due_date"].filter(
    field => String(current[field] ?? "") !== String(next[field] ?? ""),
  );
  if (changes.length) {
    await pool.query(
      `INSERT INTO activity_log (entity_type, entity_id, action, field_name, old_value, new_value, description, changed_by) VALUES ?`,
      [
        changes.map(field => [
          "SUB_TASK",
          id,
          "UPDATE",
          field,
          String(current[field] ?? ""),
          String(next[field] ?? ""),
          `${current.name}: ${field} diubah`,
          changedBy,
        ]),
      ],
    );
  }
  return { id, ...next };
}

/* ---------------------------------------------------------------------
 * CHECKLIST
 * ------------------------------------------------------------------- */
const CHECKLIST_STATUS = new Set(["AVAILABLE", "MISSING", "OPTIONAL"]);

function checklistRow(programId, documentKey, entry, changedBy) {
  return [
    programId,
    String(documentKey).slice(0, 80),
    CHECKLIST_STATUS.has(entry?.status) ? entry.status : "MISSING",
    toDateTime(entry?.uploadDate),
    entry?.pic && entry.pic !== "-" ? String(entry.pic).slice(0, 150) : null,
    entry?.fileName ? String(entry.fileName).slice(0, 255) : null,
    entry?.fileUrl && !String(entry.fileUrl).startsWith("blob:") ? String(entry.fileUrl).slice(0, 1000) : null,
    entry?.notes ? String(entry.notes).slice(0, 500) : null,
    changedBy,
  ];
}

const CHECKLIST_UPSERT = `INSERT INTO program_stage_checklist
  (program_id, document_key, status, upload_date, pic, file_name, file_url, notes, updated_by) VALUES ?
  ON DUPLICATE KEY UPDATE status=VALUES(status), upload_date=VALUES(upload_date), pic=VALUES(pic),
    file_name=VALUES(file_name), file_url=VALUES(file_url), notes=VALUES(notes), updated_by=VALUES(updated_by)`;

export async function saveChecklistEntry(programId, documentKey, entry, changedBy = "Sistem") {
  await pool.query(CHECKLIST_UPSERT, [[checklistRow(programId, documentKey, entry, changedBy)]]);
  await pool.query(
    `INSERT INTO activity_log (entity_type, entity_id, action, field_name, new_value, description, changed_by)
     VALUES ('CHECKLIST', ?, 'UPDATE', 'status', ?, ?, ?)`,
    [`${programId}/${documentKey}`, entry?.status || "MISSING", entry?.fileName || entry?.notes || null, changedBy],
  );
}

export async function saveChecklistAll(checklist, changedBy = "Sistem") {
  const rows = [];
  Object.entries(checklist || {}).forEach(([programId, entries]) =>
    Object.entries(entries || {}).forEach(([key, entry]) => rows.push(checklistRow(programId, key, entry, changedBy))),
  );
  if (rows.length) await pool.query(CHECKLIST_UPSERT, [rows]);
  return { rows: rows.length };
}

/* ---------------------------------------------------------------------
 * RIWAYAT
 * ------------------------------------------------------------------- */
export async function getActivity(limit = 50) {
  const [rows] = await pool.query(
    "SELECT * FROM activity_log ORDER BY changed_at DESC, id DESC LIMIT ?",
    [Math.min(500, Math.max(1, Number(limit) || 50))],
  );
  return rows;
}

export async function saveRkmSummary(summary) {
  if (!summary) return;
  await pool.query(
    `INSERT INTO rkm_summary (id, title, unit, actual, baseline, status, start_date, end_date, source)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), unit=VALUES(unit), actual=VALUES(actual), baseline=VALUES(baseline),
       status=VALUES(status), start_date=VALUES(start_date), end_date=VALUES(end_date), source=VALUES(source)`,
    [
      summary.title,
      summary.unit || null,
      toNumber(summary.actual, 0),
      toNumber(summary.baseline, 0),
      summary.status || "On Progress",
      toDate(summary.startDate),
      toDate(summary.endDate),
      summary.source || null,
    ],
  );
}
