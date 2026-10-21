import * as XLSX from 'xlsx';
import { formatDateId, gaugeColor, gaugeSvg, OverallReport, ProgramReport, ReportItem } from './reportEngine';

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const CONDITION_CLASS: Record<string, string> = {
  'Sesuai Target': 'ok',
  'Perlu Perhatian': 'warn',
  Kritis: 'bad',
};

const PRIORITY_CLASS: Record<string, string> = { Tinggi: 'bad', Sedang: 'warn', Rendah: 'ok' };

const STATUS_CLASS: Record<string, string> = {
  DONE: 'ok',
  WIP: 'info',
  NOT_STARTED: 'muted',
  DELAYED: 'bad',
};

const bar = (value: number, baseline?: number | null) => `
  <div class="bar"><span style="width:${Math.max(0, Math.min(100, value))}%;background:${gaugeColor(value, baseline ?? null)}"></span>
  ${baseline != null ? `<i style="left:${baseline}%"></i>` : ''}</div>`;

const list = (items: { title: string; detail: string }[]) =>
  items.length
    ? `<ul class="nar">${items.map(item => `<li><b>${esc(item.title)}</b><br/>${esc(item.detail)}</li>`).join('')}</ul>`
    : '<p class="muted">Belum ada data.</p>';

function programBlock(program: ProgramReport) {
  const hasRkm = program.rkmActual !== null;
  return `
  <section class="program">
    <header class="ph">
      <div>
        <h3>${esc(program.name)}</h3>
        <p>ID: ${esc(program.code)} · PIC: <b>${esc(program.pic)}</b></p>
      </div>
      <span class="chip ${CONDITION_CLASS[program.condition]}">${esc(program.condition)}</span>
    </header>
    <div class="pgrid">
      <div class="gcol">
        ${gaugeSvg(hasRkm ? program.rkmActual! : program.systemProgress, hasRkm ? program.rkmBaseline : program.plannedProgress, { size: 150, label: 'Realisasi' })}
        <p class="gcap">${hasRkm ? `Aktual RKM ${program.rkmActual}% · Baseline ${program.rkmBaseline}%` : 'Progres sub task'}</p>
        <table class="mini">
          <tr><td>Progres sub task</td><td><b>${program.systemProgress}%</b></td></tr>
          <tr><td>Rencana jadwal</td><td>${program.plannedProgress}%</td></tr>
          <tr><td>Tercapai</td><td><b class="t-ok">${program.counts.DONE}</b> / ${program.counts.total} (${program.achievementRate}%)</td></tr>
          <tr><td>Proses</td><td>${program.counts.WIP}</td></tr>
          <tr><td>Belum mulai</td><td>${program.counts.NOT_STARTED}</td></tr>
          ${program.counts.DELAYED ? `<tr><td>Tertunda</td><td class="t-bad">${program.counts.DELAYED}</td></tr>` : ''}
        </table>
      </div>
      <div class="ncol">
        <h4 class="h-cap">CAPAIAN</h4>${list(program.capaian)}
        <h4 class="h-isu">ISU</h4>${list([...program.isu, ...program.systemIssues])}
        <h4 class="h-next">NEXT STEP</h4>${list(program.nextStep)}
      </div>
    </div>
    <table class="grid compact">
      <thead><tr><th>Task</th><th>Jenis</th><th style="width:28%">Progres</th><th>Sub task selesai</th><th>Status</th></tr></thead>
      <tbody>${program.tasks
        .map(
          task => `<tr><td>${esc(task.name)}</td><td>${task.type}</td><td>${bar(task.progress)}<small>${task.progress}%</small></td><td>${task.done}/${task.total}</td><td>${task.statusLabel}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
  </section>`;
}

const itemRow = (item: ReportItem, index: number, pending: boolean) => `
  <tr>
    <td>${index + 1}</td>
    <td><b>${esc(item.subTaskName)}</b><br/><small class="muted">${esc(item.taskName)}${pending && item.notes ? ` · ${esc(item.notes)}` : ''}</small></td>
    ${
      pending
        ? `<td><span class="chip ${STATUS_CLASS[item.status]}">${esc(item.statusLabel)}</span></td>
           <td>${item.progress}%</td>
           <td>${formatDateId(item.dueDate)}${item.estimatedSchedule ? '*' : ''}${item.overdueDays ? `<br/><small class="t-bad">lewat ${item.overdueDays} hari</small>` : ''}</td>
           <td>${item.waitingFor ? `Menunggu: ${esc(item.waitingFor)}` : '-'}</td>
           <td><span class="chip ${PRIORITY_CLASS[item.priority]}">${item.priority}</span></td>`
        : `<td>${esc(item.notes || '-')}</td><td>${formatDateId(item.dueDate)}</td>`
    }
  </tr>`;

const groupedRows = (report: OverallReport, key: 'achieved' | 'pending', columns: number) => {
  let counter = 0;
  return report.programs
    .filter(program => program[key].length)
    .map(
      program =>
        `<tr class="grp"><td colspan="${columns}">${esc(program.name)} — PIC ${esc(program.pic)} (${program[key].length} sub task)</td></tr>` +
        program[key].map(item => itemRow(item, counter++, key === 'pending')).join(''),
    )
    .join('');
};

export function buildPrintableReport(report: OverallReport, meta: { programLabel: string; locationLabel: string }) {
  const achieved = report.programs.flatMap(program => program.achieved);
  const pending = report.programs.flatMap(program => program.pending);
  const hasRkm = report.rkmActual !== null;
  const rkmGap = hasRkm ? report.rkmActual! - (report.rkmBaseline ?? 0) : 0;

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/>
<title>Laporan Monitoring Pengadaan Tanah ${esc(formatDateId(report.asOf, 'long'))}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0B2A63; margin: 0; font-size: 10.5px; line-height: 1.45; background: #fff; }
  h1,h2,h3,h4 { margin: 0; }
  .wrap { padding: 0 4px; }
  .top { display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 3px solid #0B4F96; padding-bottom: 8px; margin-bottom: 12px; }
  .top h1 { font-size: 20px; color:#063A70; }
  .top p { margin: 2px 0 0; color:#475569; }
  .hero { display:grid; grid-template-columns: 170px 1fr 250px; gap: 14px; align-items:center; background: linear-gradient(120deg,#063A70,#0B5AA8); color:#fff; border-radius: 14px; padding: 10px 16px; }
  .hero h2 { font-size: 13px; letter-spacing: .3px; text-transform: uppercase; }
  .hero .big { font-size: 28px; font-weight: 800; color:#FBBF24; }
  .hero .meta div { display:flex; justify-content:space-between; border:1px solid rgba(255,255,255,.35); border-radius: 999px; padding: 4px 12px; margin: 4px 0; }
  .kpis { display:grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 8px 0; }
  .kpi { border:1px solid #E2E8F0; border-radius: 10px; padding: 5px 10px; }
  .kpi b { display:block; font-size: 16px; }
  .kpi span { color:#64748B; font-size: 9.5px; }
  .card { border:1px solid #E2E8F0; border-radius: 12px; padding: 8px 12px; margin-bottom: 8px; }
  .card h2 { font-size: 13px; margin-bottom: 6px; color:#063A70; }
  .summary p { margin: 0 0 4px; text-align: justify; font-size: 10px; }
  .program { border:1px solid #DCE6F2; border-radius: 12px; padding: 10px 14px; margin-bottom: 12px; page-break-inside: avoid; page-break-before: always; }
  .ph { display:flex; justify-content:space-between; align-items:center; background:#EEF4FB; margin:-10px -14px 10px; padding: 8px 14px; border-radius: 12px 12px 0 0; }
  .ph h3 { font-size: 14px; } .ph p { margin: 0; color:#475569; }
  .pgrid { display:grid; grid-template-columns: 210px 1fr; gap: 16px; }
  .gcol { text-align:center; } .gcap { margin: 2px 0 6px; font-weight: 700; }
  .ncol { columns: 3; column-gap: 14px; font-size: 9.5px; line-height: 1.38; }
  .ncol h4 { break-after: avoid; color:#fff; font-size: 10px; padding: 3px 8px; border-radius: 6px; margin: 0 0 4px; }
  .h-cap { background:#0F766E; } .h-isu { background:#B45309; } .h-next { background:#1D4ED8; }
  ul.nar { margin: 0 0 8px; padding-left: 14px; } ul.nar li { margin-bottom: 4px; break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; }
  table.grid th { background:#063A70; color:#fff; text-align:left; padding: 4px 6px; font-size: 9px; }
  table.grid tr.grp td { background:#EEF4FB; font-weight:800; color:#063A70; padding: 4px 6px; }
  table.grid td { border-bottom: 1px solid #E2E8F0; padding: 3px 6px; vertical-align: top; font-size: 9.5px; }
  table.grid tr { page-break-inside: avoid; }
  table.compact { margin-top: 8px; }
  table.mini td { padding: 2px 0; text-align:left; } table.mini td:last-child { text-align:right; }
  .bar { position:relative; height: 7px; background:#E2E8F0; border-radius: 99px; overflow: visible; margin: 3px 0 1px; }
  .bar span { display:block; height:100%; border-radius: 99px; }
  .bar i { position:absolute; top:-3px; width:2px; height:13px; background:#0B2A63; }
  .chip { display:inline-block; padding: 1px 8px; border-radius: 99px; font-weight: 700; font-size: 9px; white-space: nowrap; }
  .ok { background:#DCFCE7; color:#166534; } .warn { background:#FEF3C7; color:#92400E; } .bad { background:#FEE2E2; color:#B91C1C; }
  .info { background:#DBEAFE; color:#1E40AF; } .muted { color:#64748B; } span.muted { background:#F1F5F9; }
  .t-ok { color:#15803D; } .t-bad { color:#B91C1C; }
  .two { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pb { page-break-before: always; }
  .note { color:#64748B; font-size: 9px; margin-top: 8px; }
  .toolbar { position: sticky; top: 0; background:#F8FAFC; border-bottom:1px solid #E2E8F0; padding: 8px 12px; display:flex; gap: 8px; justify-content:flex-end; }
  .toolbar button { background:#082C61; color:#fff; border:0; border-radius: 8px; padding: 8px 14px; font-weight:700; cursor:pointer; }
  @media print { .toolbar { display:none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
<div class="toolbar"><button onclick="window.print()">Cetak / Simpan sebagai PDF</button></div>
<div class="wrap">
  <div class="top">
    <div>
      <h1>Laporan Monitoring Pengadaan Tanah 2026</h1>
      <p>${esc(report.rkm?.unit || 'Group Manajemen Aset')} · PT Pelabuhan Indonesia (Persero)</p>
    </div>
    <div style="text-align:right">
      <p>Posisi data: <b>${esc(formatDateId(report.asOf, 'long'))}</b></p>
      <p>Filter: ${esc(meta.programLabel)} · ${esc(meta.locationLabel)}</p>
    </div>
  </div>

  <div class="hero">
    <div style="background:#fff;border-radius:12px;padding:8px">
      ${gaugeSvg(hasRkm ? report.rkmActual! : report.systemProgress, hasRkm ? report.rkmBaseline : report.plannedProgress, { size: 150, label: 'Realisasi keseluruhan' })}
    </div>
    <div>
      <h2>${esc(report.rkm?.title || 'Pengadaan Tanah untuk Mendukung Proyek Strategis')}</h2>
      <div class="big">${hasRkm ? report.rkmActual : report.systemProgress}%</div>
      <p style="margin:0">${
        hasRkm
          ? `Realisasi aktual dari target baseline ${report.rkmBaseline}% (${rkmGap >= 0 ? '▲' : '▼'} ${Math.abs(rkmGap)}%) · sumber: ${esc(report.rkm?.source || 'Laporan RKM')}`
          : `Rata-rata progres sub task dibanding rencana jadwal ${report.plannedProgress}%`
      }</p>
      <p style="margin:6px 0 0">Progres sub task (sistem): <b>${report.systemProgress}%</b> · Rencana jadwal: <b>${report.plannedProgress}%</b> · Deviasi: <b>${report.deviation >= 0 ? '+' : ''}${report.deviation}%</b></p>
    </div>
    <div class="meta">
      <div><span>Status</span><b>${esc(report.rkm?.status || 'On Progress')}</b></div>
      <div><span>Tanggal mulai</span><b>${esc(formatDateId(report.periodStart))}</b></div>
      <div><span>Tanggal selesai</span><b>${esc(formatDateId(report.periodEnd))}</b></div>
      <div><span>Sisa waktu</span><b>${report.daysToYearEnd} hari</b></div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><b>${report.totals.programs}</b><span>Program</span></div>
    <div class="kpi"><b>${report.totals.tasks}</b><span>Task</span></div>
    <div class="kpi"><b>${report.totals.subTasks}</b><span>Sub task</span></div>
    <div class="kpi"><b class="t-ok">${report.counts.DONE}</b><span>Tercapai (${report.achievementRate}%)</span></div>
    <div class="kpi"><b>${report.counts.WIP}</b><span>Dalam proses</span></div>
    <div class="kpi"><b>${report.counts.NOT_STARTED}</b><span>Belum mulai</span></div>
    <div class="kpi"><b class="${report.overdueCount ? 't-bad' : ''}">${report.overdueCount}</b><span>Melewati target · ${report.dueSoonCount} jatuh tempo ≤30 hari</span></div>
  </div>

  <div class="two">
    <div class="card summary"><h2>Ringkasan Eksekutif</h2>${report.executiveSummary.map(text => `<p>${esc(text)}</p>`).join('')}</div>
    <div class="card"><h2>Temuan Utama</h2><ul class="nar">${report.keyFindings.map(text => `<li>${esc(text)}</li>`).join('')}</ul></div>
  </div>

  <div class="card">
    <h2>Progres per Program (Gauge vs Baseline)</h2>
    <table class="grid"><thead><tr><th>Program</th><th>PIC</th><th style="width:26%">Aktual RKM vs Baseline</th><th>Progres sub task</th><th>Tercapai</th><th>Kondisi</th></tr></thead>
    <tbody>${report.programs
      .map(
        program => `<tr><td><b>${esc(program.name)}</b><br/><small class="muted">${esc(program.code)}</small></td><td>${esc(program.pic)}</td>
        <td>${program.rkmActual !== null ? `${bar(program.rkmActual, program.rkmBaseline)}<small>${program.rkmActual}% (baseline ${program.rkmBaseline}%)</small>` : '-'}</td>
        <td>${bar(program.systemProgress, program.plannedProgress)}<small>${program.systemProgress}% (rencana ${program.plannedProgress}%)</small></td>
        <td>${program.counts.DONE}/${program.counts.total}</td><td><span class="chip ${CONDITION_CLASS[program.condition]}">${program.condition}</span></td></tr>`,
      )
      .join('')}</tbody></table>
  </div>

  ${report.programs.map(programBlock).join('')}

  <div class="card pb">
    <h2>Isu & Langkah Strategis</h2>
    <table class="grid"><thead><tr><th>#</th><th>Program</th><th style="width:26%">Isu</th><th>Dampak</th><th style="width:28%">Langkah Strategis</th><th>PIC</th><th>Target terdekat</th><th>Prioritas</th></tr></thead>
    <tbody>${report.actions
      .map(
        (action, index) => `<tr><td>${index + 1}</td><td>${esc(action.programName)}</td><td>${esc(action.issue)}</td><td>${esc(action.impact)}</td><td>${esc(action.step)}</td><td>${esc(action.pic)}</td><td>${esc(action.target)}</td><td><span class="chip ${PRIORITY_CLASS[action.priority]}">${action.priority}</span></td></tr>`,
      )
      .join('')}</tbody></table>
  </div>

  <div class="card">
    <h2>Yang Telah Tercapai (${achieved.length} sub task)</h2>
    <table class="grid"><thead><tr><th style="width:3%">#</th><th style="width:42%">Sub task / Task</th><th>Keterangan</th><th style="width:10%">Target</th></tr></thead>
    <tbody>${groupedRows(report, 'achieved', 4)}</tbody></table>
  </div>

  <div class="card">
    <h2>Yang Masih Pending (${pending.length} sub task)</h2>
    <table class="grid"><thead><tr><th style="width:3%">#</th><th style="width:44%">Sub task / Task · Keterangan</th><th>Status</th><th>Progres</th><th>Target</th><th>Ketergantungan</th><th>Prioritas</th></tr></thead>
    <tbody>${groupedRows(report, 'pending', 7)}</tbody></table>
    <p class="note">* Tanggal target masih memakai rencana periode RKM (belum ada tanggal resmi). Progres rencana dihitung linear dari tanggal mulai hingga target.
    Gauge: busur berwarna = realisasi aktual; garis tegak = baseline/target. Hijau = ≥ baseline, kuning = selisih ≤ 5 poin, merah = &gt; 5 poin di bawah baseline.</p>
  </div>
</div>
</body></html>`;
}

export function openPrintableReport(html: string) {
  const win = window.open('', '_blank');
  if (!win) {
    // Popup diblokir: unduh sebagai file HTML yang bisa dibuka & dicetak.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Laporan_Monitoring_Pengadaan_Tanah.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* pengguna tetap bisa klik tombol cetak */
    }
  }, 600);
  return true;
}

export function exportReportExcel(report: OverallReport, fileName: string) {
  const workbook = XLSX.utils.book_new();

  const summaryRows: (string | number)[][] = [
    ['LAPORAN MONITORING PENGADAAN TANAH 2026'],
    ['Posisi data', formatDateId(report.asOf, 'long')],
    [],
    ['INDIKATOR', 'NILAI'],
    ['Realisasi aktual RKM (%)', report.rkmActual ?? '-'],
    ['Target baseline RKM (%)', report.rkmBaseline ?? '-'],
    ['Selisih aktual vs baseline (poin)', report.rkmActual !== null ? report.rkmActual - (report.rkmBaseline ?? 0) : '-'],
    ['Progres sub task – sistem (%)', report.systemProgress],
    ['Rencana jadwal (%)', report.plannedProgress],
    ['Deviasi (poin)', report.deviation],
    ['Total program', report.totals.programs],
    ['Total task', report.totals.tasks],
    ['Total sub task', report.totals.subTasks],
    ['Sub task tercapai', report.counts.DONE],
    ['Sub task proses', report.counts.WIP],
    ['Sub task belum mulai', report.counts.NOT_STARTED],
    ['Sub task tertunda', report.counts.DELAYED],
    ['Tingkat ketercapaian (%)', report.achievementRate],
    ['Melewati target', report.overdueCount],
    ['Jatuh tempo ≤ 30 hari', report.dueSoonCount],
    ['Sisa hari periode RKM', report.daysToYearEnd],
    [],
    ['RINGKASAN EKSEKUTIF'],
    ...report.executiveSummary.map(text => [text]),
    [],
    ['TEMUAN UTAMA'],
    ...report.keyFindings.map(text => [text]),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 42 }, { wch: 22 }];

  const programSheet = XLSX.utils.json_to_sheet(
    report.programs.map(program => ({
      'ID RKM': program.code,
      Program: program.name,
      PIC: program.pic,
      'Aktual RKM (%)': program.rkmActual ?? '-',
      'Baseline RKM (%)': program.rkmBaseline ?? '-',
      'Progres Sub Task (%)': program.systemProgress,
      'Rencana Jadwal (%)': program.plannedProgress,
      'Deviasi (poin)': program.deviation,
      'Sub Task Tercapai': program.counts.DONE,
      'Sub Task Proses': program.counts.WIP,
      'Sub Task Belum Mulai': program.counts.NOT_STARTED,
      'Sub Task Tertunda': program.counts.DELAYED,
      'Total Sub Task': program.counts.total,
      'Ketercapaian (%)': program.achievementRate,
      Kondisi: program.condition,
    })),
  );

  const narrativeRows: Record<string, string>[] = [];
  report.programs.forEach(program => {
    const push = (jenis: string, items: { title: string; detail: string }[]) =>
      items.forEach(item =>
        narrativeRows.push({ Program: program.name, PIC: program.pic, Jenis: jenis, Judul: item.title, Uraian: item.detail }),
      );
    push('Capaian', program.capaian);
    push('Isu (Laporan RKM)', program.isu);
    push('Isu (Terdeteksi Sistem)', program.systemIssues);
    push('Next Step', program.nextStep);
  });
  const narrativeSheet = XLSX.utils.json_to_sheet(narrativeRows);

  const actionSheet = XLSX.utils.json_to_sheet(
    report.actions.map((action, index) => ({
      No: index + 1,
      Program: action.programName,
      Isu: action.issue,
      Dampak: action.impact,
      'Langkah Strategis': action.step,
      PIC: action.pic,
      'Target Terdekat': action.target,
      Prioritas: action.priority,
    })),
  );

  const itemToRow = (item: ReportItem, index: number) => ({
    No: index + 1,
    Program: item.programName,
    Task: item.taskName,
    'Sub Task': item.subTaskName,
    PIC: item.pic,
    Status: item.statusLabel,
    'Progres (%)': item.progress,
    'Rencana (%)': item.plannedProgress,
    'Deviasi (poin)': item.deviation,
    'Tgl Mulai': item.startDate,
    'Tgl Target': item.dueDate,
    'Jadwal Estimasi': item.estimatedSchedule ? 'Ya' : 'Tidak',
    'Hari Terlambat': item.overdueDays,
    'Menunggu': item.waitingFor || '-',
    'Kategori Isu': item.category,
    Prioritas: item.priority,
    'Langkah Strategis': item.status === 'DONE' ? '-' : item.strategicStep,
    Keterangan: item.notes,
  });

  const achieved = report.programs.flatMap(program => program.achieved);
  const pending = report.programs.flatMap(program => program.pending);

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
  XLSX.utils.book_append_sheet(workbook, programSheet, 'Per Program');
  XLSX.utils.book_append_sheet(workbook, narrativeSheet, 'Capaian-Isu-Next Step');
  XLSX.utils.book_append_sheet(workbook, actionSheet, 'Isu & Langkah Strategis');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(achieved.map(itemToRow)), 'Tercapai');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pending.map(itemToRow)), 'Pending');
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([...achieved, ...pending].map(itemToRow)),
    'Detail Sub Task',
  );

  XLSX.writeFile(workbook, fileName);
}
