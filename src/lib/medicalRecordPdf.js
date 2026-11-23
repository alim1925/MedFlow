const PAGE_WIDTH = 595.28; // A4 width in pt
const PAGE_HEIGHT = 841.89; // A4 height in pt
const MARGIN_X = 40;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const COLORS = {
  ocean: [0.031, 0.298, 0.38],
  oceanDark: [0.02, 0.2, 0.259],
  sky: [0.055, 0.647, 0.914],
  skySoft: [0.941, 0.976, 1.0],
  slate900: [0.059, 0.09, 0.165],
  slate700: [0.2, 0.255, 0.333],
  slate500: [0.392, 0.455, 0.545],
  slate200: [0.886, 0.91, 0.941],
  slate50: [0.973, 0.98, 0.988],
  white: [1, 1, 1],
  emerald: [0.016, 0.471, 0.341],
  emeraldSoft: [0.925, 0.992, 0.961],
  purple: [0.427, 0.157, 0.851],
  purpleSoft: [0.961, 0.953, 1.0],
  amber: [0.706, 0.325, 0.035],
  amberSoft: [1.0, 0.984, 0.922],
  red: [0.725, 0.11, 0.11],
  redSoft: [0.996, 0.949, 0.949],
};

const PRESCRIPTION_STATUS_LABELS = {
  WAITING: 'Menunggu Farmasi',
  PROCESSING: 'Sedang Disiapkan',
  READY: 'Siap Diambil',
  PICKED_UP: 'Sudah Diambil',
  CANCELLED: 'Dibatalkan',
};

export function getPrescriptionStatusLabel(status) {
  return PRESCRIPTION_STATUS_LABELS[status] || status || '-';
}

export function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  const d =
    dateStr instanceof Date
      ? dateStr
      : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr)) ? `${dateStr}T00:00:00` : dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTimeIndo(dateStr) {
  if (!dateStr) return '-';
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateAgeText(birthDateStr) {
  if (!birthDateStr) return '-';
  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) return '-';
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  return `${years} tahun`;
}

export function parseVitalSigns(vitalSigns) {
  if (!vitalSigns) return {};
  if (typeof vitalSigns === 'string') {
    try {
      return JSON.parse(vitalSigns) || {};
    } catch {
      return {};
    }
  }
  return typeof vitalSigns === 'object' ? vitalSigns : {};
}

export function normalizeRecordForDocument(rec) {
  if (!rec) return null;
  const vitals = parseVitalSigns(rec.vital_signs);
  const prescription = rec.prescription || null;
  const items = Array.isArray(prescription?.items) ? prescription.items : [];
  const addenda = Array.isArray(rec.addenda) ? rec.addenda : [];

  return {
    id: rec.id,
    appointment_id: rec.appointment_id,
    created_at: rec.created_at,
    locked_at: rec.locked_at || rec.created_at,
    appointment_date: rec.appointment_date || rec.created_at,
    slot_start: rec.slot_start || '',
    queue_no: rec.queue_no || null,
    poli_name: rec.poli_name || 'Poliklinik MedFlow',
    doctor_name: rec.doctor_name || 'Dokter Pemeriksa',
    doctor_str_number: rec.doctor_str_number || '-',
    patient_name: rec.patient_name || rec.patient?.full_name || 'Pasien MedFlow',
    medical_record_no: rec.medical_record_no || rec.patient?.medical_record_no || '-',
    patient_birth_date: rec.patient_birth_date || rec.patient?.birth_date || null,
    patient_gender: rec.patient_gender || rec.patient?.gender || null,
    patient_blood_type: rec.patient_blood_type || rec.patient?.blood_type || null,
    patient_phone: rec.patient_phone || rec.patient?.phone || '-',
    patient_allergies: rec.patient_allergies ?? rec.patient?.allergies ?? null,
    complaint: rec.complaint || rec.appointment_complaint || '-',
    diagnosis: rec.diagnosis || '-',
    icd10_code: rec.icd10_code || '-',
    treatment: rec.treatment || '-',
    notes: rec.notes || '',
    vital_signs: {
      blood_pressure: vitals.blood_pressure || vitals.td || '-',
      pulse: vitals.pulse || vitals.nadi || '-',
      temperature: vitals.temperature || vitals.suhu || '-',
      weight: vitals.weight || vitals.bb || '-',
      height: vitals.height || vitals.tb || '-',
      oxygen_saturation: vitals.oxygen_saturation || vitals.spo2 || '-',
    },
    prescription: prescription
      ? {
          id: prescription.id,
          status: prescription.status,
          notes: prescription.notes || '',
          created_at: prescription.created_at,
          ready_at: prescription.ready_at,
          picked_up_at: prescription.picked_up_at,
          items,
        }
      : null,
    addenda,
  };
}

function sanitizeWinAnsi(text) {
  return String(text ?? '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022\u00B7]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\xA1-\xFF\n]/g, '');
}

function escapePdfString(text) {
  return sanitizeWinAnsi(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function estimateCharWidth(ch, fontSize, isBold) {
  if (ch === ' ') return fontSize * 0.28;
  if ('ijlI.,:;|!'.includes(ch)) return fontSize * 0.26;
  if ('mwMWGOQD@'.includes(ch)) return fontSize * 0.78;
  if (ch >= 'A' && ch <= 'Z') return fontSize * (isBold ? 0.66 : 0.62);
  if (ch >= '0' && ch <= '9') return fontSize * 0.56;
  return fontSize * (isBold ? 0.54 : 0.5);
}

function measureTextWidth(text, fontSize, isBold = false) {
  const clean = sanitizeWinAnsi(text);
  let width = 0;
  for (let i = 0; i < clean.length; i += 1) {
    width += estimateCharWidth(clean[i], fontSize, isBold);
  }
  return width;
}

function wrapText(text, maxWidth, fontSize, isBold = false) {
  const clean = sanitizeWinAnsi(text).trim();
  if (!clean) return ['-'];

  const paragraphs = clean.split(/\r?\n/);
  const lines = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureTextWidth(candidate, fontSize, isBold) <= maxWidth) {
        current = candidate;
      } else if (!current) {
        let slice = '';
        for (const ch of word) {
          if (measureTextWidth(slice + ch, fontSize, isBold) > maxWidth && slice) {
            lines.push(slice);
            slice = ch;
          } else {
            slice += ch;
          }
        }
        current = slice;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : ['-'];
}

function encodeWinAnsiBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    bytes[i] = code <= 255 ? code : 0x3f;
  }
  return bytes;
}

class PdfBuilder {
  constructor() {
    this.pages = [];
    this.current = [];
    this.y = PAGE_HEIGHT - MARGIN_TOP;
    this.startPage();
  }

  startPage() {
    this.current = [];
    this.pages.push(this.current);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  ensureSpace(neededHeight) {
    if (this.y - neededHeight < MARGIN_BOTTOM) {
      this.startPage();
      return true;
    }
    return false;
  }

  setFill(rgb) {
    this.current.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg`);
  }

  setStroke(rgb) {
    this.current.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} RG`);
  }

  rect(x, yTop, w, h, { fill, stroke, lineWidth = 0.6 } = {}) {
    const yBottom = yTop - h;
    this.current.push('q');
    if (fill) this.setFill(fill);
    if (stroke) {
      this.setStroke(stroke);
      this.current.push(`${lineWidth.toFixed(2)} w`);
    }
    const op = fill && stroke ? 'B' : fill ? 'f' : 'S';
    this.current.push(`${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
    this.current.push('Q');
  }

  line(x1, y1, x2, y2, rgb = COLORS.slate200, width = 0.6) {
    this.current.push('q');
    this.setStroke(rgb);
    this.current.push(`${width.toFixed(2)} w`);
    this.current.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    this.current.push('Q');
  }

  text(str, x, yBaseline, { font = 'F1', size = 9, color = COLORS.slate900 } = {}) {
    this.current.push('q');
    this.setFill(color);
    this.current.push(`BT /${font} ${size.toFixed(1)} Tf 1 0 0 1 ${x.toFixed(2)} ${yBaseline.toFixed(2)} Tm (${escapePdfString(str)}) Tj ET`);
    this.current.push('Q');
  }

  textRight(str, rightX, yBaseline, { font = 'F1', size = 9, color = COLORS.slate900 } = {}) {
    const isBold = font === 'F2';
    const w = measureTextWidth(str, size, isBold);
    this.text(str, Math.max(MARGIN_X, rightX - w), yBaseline, { font, size, color });
  }

  sectionHeading(title) {
    this.ensureSpace(28);
    const topY = this.y;
    this.rect(MARGIN_X, topY, 3.5, 13, { fill: COLORS.sky });
    this.text(title.toUpperCase(), MARGIN_X + 10, topY - 10, {
      font: 'F2',
      size: 9.5,
      color: COLORS.ocean,
    });
    this.line(MARGIN_X, topY - 17, MARGIN_X + CONTENT_WIDTH, topY - 17, COLORS.slate200, 0.7);
    this.y -= 25;
  }

  buildBytes(docTitle = 'Bukti Konsultasi MedFlow') {
    const totalPages = this.pages.length;

    // Add page footers onto every page stream
    for (let i = 0; i < totalPages; i += 1) {
      const pageStream = this.pages[i];
      pageStream.push('q');
      pageStream.push(`${COLORS.slate200[0]} ${COLORS.slate200[1]} ${COLORS.slate200[2]} RG 0.6 w`);
      pageStream.push(`${MARGIN_X.toFixed(2)} 30 m ${(MARGIN_X + CONTENT_WIDTH).toFixed(2)} 30 l S`);
      pageStream.push('Q');

      pageStream.push('q');
      pageStream.push(`${COLORS.slate500[0]} ${COLORS.slate500[1]} ${COLORS.slate500[2]} rg`);
      pageStream.push(
        `BT /F1 7.5 Tf 1 0 0 1 ${MARGIN_X.toFixed(2)} 19 Tm (${escapePdfString(
          'MedFlow HMIS - Dokumen Bukti Konsultasi & Rekam Medis Elektronik Sah'
        )}) Tj ET`
      );
      const pageLabel = `Halaman ${i + 1} dari ${totalPages}`;
      const labelW = measureTextWidth(pageLabel, 7.5, false);
      pageStream.push(
        `BT /F1 7.5 Tf 1 0 0 1 ${(MARGIN_X + CONTENT_WIDTH - labelW).toFixed(2)} 19 Tm (${escapePdfString(
          pageLabel
        )}) Tj ET`
      );
      pageStream.push('Q');
    }

    // Object numbering:
    // 1: Catalog
    // 2: Pages
    // 3: Font F1 (Helvetica)
    // 4: Font F2 (Helvetica-Bold)
    // 5: Font F3 (Courier)
    // 6: Info
    // 7..: Page & Content pairs
    const objects = [];
    const pageObjIds = [];

    const firstDynamicId = 7;
    for (let i = 0; i < totalPages; i += 1) {
      const pageId = firstDynamicId + i * 2;
      const contentId = pageId + 1;
      pageObjIds.push(pageId);

      const streamText = this.pages[i].join('\n');
      const streamLength = encodeWinAnsiBytes(streamText).length;

      objects[pageId] =
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`;
      objects[contentId] =
        `${contentId} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}\nendstream\nendobj\n`;
    }

    objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>\nendobj\n`;
    objects[3] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`;
    objects[4] = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`;
    objects[5] = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n`;
    objects[6] = `6 0 obj\n<< /Title (${escapePdfString(docTitle)}) /Producer (MedFlow HMIS PDF Engine) >>\nendobj\n`;

    const chunks = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
    const offsets = [0];
    let currentOffset = encodeWinAnsiBytes(chunks[0]).length;

    for (let id = 1; id < objects.length; id += 1) {
      const objStr = objects[id];
      offsets[id] = currentOffset;
      chunks.push(objStr);
      currentOffset += encodeWinAnsiBytes(objStr).length;
    }

    const xrefOffset = currentOffset;
    let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id += 1) {
      xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    const trailer =
      `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    chunks.push(xref);
    chunks.push(trailer);

    return encodeWinAnsiBytes(chunks.join(''));
  }
}

export function generateMedicalRecordPdfBytes(rawRecord) {
  const rec = normalizeRecordForDocument(rawRecord);
  if (!rec) {
    throw new Error('Data rekam medis tidak tersedia.');
  }

  const pdf = new PdfBuilder();
  const docCode = `RME-${String(rec.id || '').slice(0, 8).toUpperCase() || 'DOC'}`;

  // 1. Header Banner
  const bannerHeight = 64;
  pdf.rect(MARGIN_X, pdf.y, CONTENT_WIDTH, bannerHeight, { fill: COLORS.ocean });
  pdf.rect(MARGIN_X, pdf.y - bannerHeight + 4, CONTENT_WIDTH, 4, { fill: COLORS.sky });

  pdf.text('MEDFLOW HMIS', MARGIN_X + 16, pdf.y - 24, {
    font: 'F2',
    size: 16,
    color: COLORS.white,
  });
  pdf.text('Sistem Informasi Manajemen Rumah Sakit Terpadu', MARGIN_X + 16, pdf.y - 38, {
    font: 'F1',
    size: 8.5,
    color: [0.78, 0.91, 0.96],
  });
  pdf.text('LEMBAR HASIL REKAM MEDIS & RINCIAN RESEP OBAT', MARGIN_X + 16, pdf.y - 51, {
    font: 'F2',
    size: 8.5,
    color: COLORS.white,
  });

  pdf.textRight('BUKTI KONSULTASI RESMI', MARGIN_X + CONTENT_WIDTH - 16, pdf.y - 22, {
    font: 'F2',
    size: 9.5,
    color: COLORS.white,
  });
  pdf.textRight(`No. Dokumen: ${docCode}`, MARGIN_X + CONTENT_WIDTH - 16, pdf.y - 35, {
    font: 'F3',
    size: 8,
    color: [0.85, 0.95, 0.98],
  });
  pdf.textRight('Status: TERKUNCI PERMANEN', MARGIN_X + CONTENT_WIDTH - 16, pdf.y - 47, {
    font: 'F1',
    size: 7.5,
    color: [0.65, 0.95, 0.82],
  });

  pdf.y -= bannerHeight + 16;

  // 2. Patient & Consultation Info (2 columns)
  const colGap = 12;
  const colW = (CONTENT_WIDTH - colGap) / 2;
  const leftX = MARGIN_X;
  const rightX = MARGIN_X + colW + colGap;

  const genderLabel =
    rec.patient_gender === 'L' || rec.patient_gender === 'M'
      ? 'Laki-laki'
      : rec.patient_gender === 'P' || rec.patient_gender === 'F'
        ? 'Perempuan'
        : '-';
  const ageLabel = calculateAgeText(rec.patient_birth_date);
  const birthAndAge = rec.patient_birth_date
    ? `${formatDateIndo(rec.patient_birth_date)} (${ageLabel})`
    : '-';

  const leftRows = [
    ['Nama Pasien', rec.patient_name],
    ['No. Rekam Medis', rec.medical_record_no],
    ['Tgl. Lahir / Usia', birthAndAge],
    ['Jenis Kelamin', `${genderLabel}  |  Gol. Darah: ${rec.patient_blood_type || '-'}`],
    ['No. Telepon', rec.patient_phone || '-'],
    ['Riwayat Alergi', rec.patient_allergies || 'Tidak ada laporan alergi'],
  ];

  const timeText = rec.slot_start ? `${String(rec.slot_start).slice(0, 5)} WIB` : '-';
  const queueText = rec.queue_no ? ` (Antrean #${rec.queue_no})` : '';
  const rightRows = [
    ['Poliklinik', rec.poli_name],
    ['Dokter Pemeriksa', rec.doctor_name],
    ['Nomor STR', rec.doctor_str_number || '-'],
    ['Tgl. Konsultasi', formatDateIndo(rec.appointment_date)],
    ['Jadwal / Antrean', `${timeText}${queueText}`],
    ['Tgl. Cetak', formatDateTimeIndo(new Date())],
  ];

  const boxHeight = 112;
  pdf.ensureSpace(boxHeight + 10);
  const boxTop = pdf.y;

  pdf.rect(leftX, boxTop, colW, boxHeight, { fill: COLORS.slate50, stroke: COLORS.slate200 });
  pdf.rect(rightX, boxTop, colW, boxHeight, { fill: COLORS.slate50, stroke: COLORS.slate200 });

  pdf.text('IDENTITAS PASIEN', leftX + 10, boxTop - 15, {
    font: 'F2',
    size: 8.5,
    color: COLORS.ocean,
  });
  pdf.text('INFORMASI KONSULTASI', rightX + 10, boxTop - 15, {
    font: 'F2',
    size: 8.5,
    color: COLORS.ocean,
  });
  pdf.line(leftX + 10, boxTop - 20, leftX + colW - 10, boxTop - 20, COLORS.slate200, 0.5);
  pdf.line(rightX + 10, boxTop - 20, rightX + colW - 10, boxTop - 20, COLORS.slate200, 0.5);

  const drawInfoRows = (rows, startX) => {
    let rowY = boxTop - 32;
    for (const [label, val] of rows) {
      pdf.text(`${label}:`, startX + 10, rowY, { font: 'F1', size: 7.8, color: COLORS.slate500 });
      const wrappedVal = wrapText(String(val || '-'), colW - 96, 8, true);
      pdf.text(wrappedVal[0], startX + 86, rowY, {
        font: 'F2',
        size: 8,
        color: COLORS.slate900,
      });
      rowY -= 14;
    }
  };

  drawInfoRows(leftRows, leftX);
  drawInfoRows(rightRows, rightX);

  pdf.y -= boxHeight + 16;

  // 3. Vital Signs Section
  pdf.sectionHeading('Tanda-Tanda Vital (Vital Signs)');
  pdf.ensureSpace(46);

  const vitalsList = [
    ['Tekanan Darah', `${rec.vital_signs.blood_pressure} mmHg`],
    ['Denyut Nadi', `${rec.vital_signs.pulse} bpm`],
    ['Suhu Tubuh', `${rec.vital_signs.temperature} °C`],
    ['Berat Badan', `${rec.vital_signs.weight} kg`],
    ['Tinggi Badan', `${rec.vital_signs.height} cm`],
    ['SpO2', `${rec.vital_signs.oxygen_saturation} %`],
  ];

  const vitalGap = 6;
  const vitalBoxW = (CONTENT_WIDTH - vitalGap * 5) / 6;
  const vitalTop = pdf.y;

  vitalsList.forEach(([label, val], idx) => {
    const vx = MARGIN_X + idx * (vitalBoxW + vitalGap);
    pdf.rect(vx, vitalTop, vitalBoxW, 34, { fill: COLORS.slate50, stroke: COLORS.slate200 });
    pdf.text(label, vx + 6, vitalTop - 12, { font: 'F1', size: 7, color: COLORS.slate500 });
    pdf.text(val, vx + 6, vitalTop - 25, { font: 'F2', size: 8.5, color: COLORS.slate900 });
  });

  pdf.y -= 48;

  // 4. Clinical Examination Section
  pdf.sectionHeading('Hasil Pemeriksaan Klinis');

  const drawTextBlock = (label, value, { accentBg = COLORS.white, accentBorder = COLORS.slate200, badge = '' } = {}) => {
    const lines = wrapText(value || '-', CONTENT_WIDTH - 24, 9, false);
    const blockH = 22 + lines.length * 12.5 + 8;
    pdf.ensureSpace(blockH + 6);

    const top = pdf.y;
    pdf.rect(MARGIN_X, top, CONTENT_WIDTH, blockH, { fill: accentBg, stroke: accentBorder });
    pdf.text(label.toUpperCase(), MARGIN_X + 12, top - 14, {
      font: 'F2',
      size: 7.5,
      color: COLORS.slate500,
    });
    if (badge) {
      pdf.textRight(badge, MARGIN_X + CONTENT_WIDTH - 12, top - 14, {
        font: 'F3',
        size: 8,
        color: COLORS.ocean,
      });
    }

    let lineY = top - 28;
    for (const line of lines) {
      pdf.text(line, MARGIN_X + 12, lineY, { font: 'F1', size: 9, color: COLORS.slate900 });
      lineY -= 12.5;
    }
    pdf.y -= blockH + 8;
  };

  drawTextBlock('Diagnosis Medis Utama', rec.diagnosis, {
    accentBg: COLORS.skySoft,
    accentBorder: [0.729, 0.902, 0.992],
    badge: rec.icd10_code && rec.icd10_code !== '-' ? `ICD-10: ${rec.icd10_code}` : '',
  });
  drawTextBlock('Keluhan Awal Pasien', rec.complaint);
  drawTextBlock('Tindakan & Terapi Medis', rec.treatment);
  if (rec.notes) {
    drawTextBlock('Catatan Tambahan Dokter', rec.notes);
  }

  pdf.y -= 4;

  // 5. Prescription Section
  pdf.sectionHeading('Rincian Resep Obat (E-Prescription)');

  const rx = rec.prescription;
  const rxItems = rx?.items || [];

  if (!rx || rxItems.length === 0) {
    pdf.ensureSpace(36);
    pdf.rect(MARGIN_X, pdf.y, CONTENT_WIDTH, 28, { fill: COLORS.slate50, stroke: COLORS.slate200 });
    pdf.text('Tidak ada peresepan obat pada sesi konsultasi ini.', MARGIN_X + 12, pdf.y - 17, {
      font: 'F1',
      size: 8.5,
      color: COLORS.slate500,
    });
    pdf.y -= 38;
  } else {
    const rxNo = `#${String(rx.id || '').slice(0, 8).toUpperCase()}`;
    const rxStatus = getPrescriptionStatusLabel(rx.status);

    pdf.ensureSpace(58);
    pdf.rect(MARGIN_X, pdf.y, CONTENT_WIDTH, 24, { fill: COLORS.purpleSoft, stroke: [0.867, 0.839, 0.996] });
    pdf.text(`No. Resep: ${rxNo}`, MARGIN_X + 12, pdf.y - 15, {
      font: 'F2',
      size: 8.5,
      color: COLORS.purple,
    });
    pdf.textRight(`Status Farmasi: ${rxStatus}`, MARGIN_X + CONTENT_WIDTH - 12, pdf.y - 15, {
      font: 'F2',
      size: 8.5,
      color: COLORS.purple,
    });
    pdf.y -= 28;

    const colWidths = [28, 178, 72, 177.28, 60];
    const headers = ['No', 'Nama Obat', 'Jumlah', 'Aturan Pakai', 'Durasi'];

    const drawTableHeader = () => {
      pdf.ensureSpace(24);
      const headerTop = pdf.y;
      pdf.rect(MARGIN_X, headerTop, CONTENT_WIDTH, 22, {
        fill: COLORS.ocean,
        stroke: COLORS.ocean,
      });
      let cx = MARGIN_X;
      headers.forEach((h, idx) => {
        pdf.text(h, cx + 6, headerTop - 14, { font: 'F2', size: 8, color: COLORS.white });
        cx += colWidths[idx];
      });
      pdf.y -= 22;
    };

    drawTableHeader();

    rxItems.forEach((item, index) => {
      const medTitle = item.medicine_name || item.name || 'Obat';
      const medSub = [item.medicine_code, item.form].filter(Boolean).join(' - ');
      const medText = medSub ? `${medTitle}\n(${medSub})` : medTitle;
      const qtyText = `${item.quantity || 0} ${item.unit || 'unit'}`;
      const dosageText = item.dosage_rule || '-';
      const durationText = item.duration_days ? `${item.duration_days} hari` : '-';

      const medLines = wrapText(medText, colWidths[1] - 12, 8.2, true);
      const dosageLines = wrapText(dosageText, colWidths[3] - 12, 8.2, false);
      const maxLines = Math.max(medLines.length, dosageLines.length, 1);
      const rowH = Math.max(22, 10 + maxLines * 11);

      if (pdf.ensureSpace(rowH + 4)) {
        drawTableHeader();
      }

      const rowTop = pdf.y;
      const bg = index % 2 === 1 ? COLORS.slate50 : COLORS.white;
      pdf.rect(MARGIN_X, rowTop, CONTENT_WIDTH, rowH, { fill: bg, stroke: COLORS.slate200 });

      let cx = MARGIN_X;
      pdf.text(String(index + 1), cx + 8, rowTop - 14, { font: 'F1', size: 8.2, color: COLORS.slate700 });
      cx += colWidths[0];

      medLines.forEach((ln, li) => {
        pdf.text(ln, cx + 6, rowTop - 13 - li * 11, {
          font: li === 0 ? 'F2' : 'F1',
          size: li === 0 ? 8.2 : 7.3,
          color: li === 0 ? COLORS.slate900 : COLORS.slate500,
        });
      });
      cx += colWidths[1];

      pdf.text(qtyText, cx + 6, rowTop - 14, { font: 'F2', size: 8.2, color: COLORS.slate900 });
      cx += colWidths[2];

      dosageLines.forEach((ln, li) => {
        pdf.text(ln, cx + 6, rowTop - 13 - li * 11, {
          font: 'F1',
          size: 8.2,
          color: COLORS.slate700,
        });
      });
      cx += colWidths[3];

      pdf.text(durationText, cx + 6, rowTop - 14, { font: 'F1', size: 8.2, color: COLORS.slate700 });

      pdf.y -= rowH;
    });

    pdf.y -= 8;

    if (rx.notes) {
      drawTextBlock('Catatan Farmasi / Resep', rx.notes, {
        accentBg: COLORS.slate50,
        accentBorder: COLORS.slate200,
      });
    }
  }

  // 6. Addenda (if any)
  if (rec.addenda.length > 0) {
    pdf.sectionHeading(`Riwayat Adendum Medis (${rec.addenda.length})`);
    for (const ad of rec.addenda) {
      const noteBody = `${ad.doctor_name || rec.doctor_name} (${formatDateTimeIndo(ad.created_at)})\n${
        ad.note || ad.notes || '-'
      }`;
      drawTextBlock('Catatan Adendum', noteBody, {
        accentBg: COLORS.amberSoft,
        accentBorder: [0.992, 0.902, 0.541],
      });
    }
  }

  // 7. Verification / Signature Block
  pdf.ensureSpace(88);
  pdf.y -= 4;
  const sigTop = pdf.y;
  const sigH = 74;
  pdf.rect(MARGIN_X, sigTop, CONTENT_WIDTH, sigH, { fill: COLORS.emeraldSoft, stroke: [0.655, 0.953, 0.816] });

  pdf.text('PENGESAHAN DOKUMEN KONSULTASI DIGITAL', MARGIN_X + 12, sigTop - 16, {
    font: 'F2',
    size: 8.5,
    color: COLORS.emerald,
  });
  pdf.text(
    `Rekam medis dikunci permanen pada: ${formatDateTimeIndo(rec.locked_at)}`,
    MARGIN_X + 12,
    sigTop - 31,
    { font: 'F1', size: 8, color: COLORS.slate700 }
  );
  pdf.text(
    'Dokumen ini dihasilkan secara elektronik melalui MedFlow HMIS dan sah sebagai bukti konsultasi.',
    MARGIN_X + 12,
    sigTop - 44,
    { font: 'F1', size: 7.5, color: COLORS.slate500 }
  );

  pdf.textRight(rec.doctor_name, MARGIN_X + CONTENT_WIDTH - 12, sigTop - 36, {
    font: 'F2',
    size: 9,
    color: COLORS.slate900,
  });
  pdf.textRight(`No. STR: ${rec.doctor_str_number || '-'}`, MARGIN_X + CONTENT_WIDTH - 12, sigTop - 49, {
    font: 'F1',
    size: 7.8,
    color: COLORS.slate500,
  });

  return pdf.buildBytes(`Bukti Konsultasi - ${rec.patient_name} (${rec.medical_record_no})`);
}

export function buildPdfFilename(rawRecord) {
  const rec = normalizeRecordForDocument(rawRecord);
  const rm = String(rec?.medical_record_no || 'RME').replace(/[^a-zA-Z0-9_-]/g, '');
  const datePart = rec?.appointment_date
    ? new Date(rec.appointment_date).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return `Bukti-Konsultasi-${rm}-${datePart}.pdf`;
}

export function downloadMedicalRecordPdf(rawRecord) {
  const bytes = generateMedicalRecordPdfBytes(rawRecord);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildPdfFilename(rawRecord);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
