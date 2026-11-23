'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import MedicalRecordActions from '@/components/MedicalRecordActions';
import { apiRequest } from '@/lib/apiClient';
import {
  User,
  HeartPulse,
  Activity,
  FileText,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  ShieldCheck,
  Stethoscope,
  Lock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

function calculateAge(birthDateStr) {
  if (!birthDateStr) return '-';
  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) return '-';
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970) + ' th';
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTimeIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ExamPage({ params }) {
  const { appointmentId } = use(params);

  const [appointment, setAppointment] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [medicinesList, setMedicinesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Exam Form State (for new examination)
  const [examData, setExamData] = useState({
    complaint: '',
    blood_pressure: '',
    pulse: '',
    temperature: '',
    weight: '',
    height: '',
    oxygen_saturation: '',
    diagnosis: '',
    icd10_code: '',
    treatment: '',
    notes: '',
  });

  // Prescription Items State
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [newItem, setNewItem] = useState({
    medicine_id: '',
    quantity: 1,
    dosage_rule: '3x1 tablet sesudah makan',
    duration_days: 3,
  });

  // Addendum State (for existing medical record)
  const [addendumNote, setAddendumNote] = useState('');
  const [submittingAddendum, setSubmittingAddendum] = useState(false);

  const refreshAppointmentData = useCallback(async () => {
    try {
      const [apptRes, medsRes, docRes] = await Promise.all([
        apiRequest(`/api/doctor/appointments/${appointmentId}`),
        apiRequest('/api/admin/medicines'),
        apiRequest('/api/doctor/profile'),
      ]);

      if (apptRes?.success && apptRes.data) {
        setAppointment(apptRes.data);
        setExamData((prev) => ({
          ...prev,
          complaint: apptRes.data.complaint || '',
        }));
      } else {
        setError(apptRes?.error || 'Data pemeriksaan tidak ditemukan.');
      }
      if (medsRes?.success && Array.isArray(medsRes.data)) {
        setMedicinesList(medsRes.data);
      }
      if (docRes?.success && docRes.data) setDoctor(docRes.data);
    } catch (err) {
      console.error('Error loading exam page data:', err);
      setError('Gagal memuat detail rekam medis pasien.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;

    async function init() {
      try {
        const [apptRes, medsRes, docRes] = await Promise.all([
          apiRequest(`/api/doctor/appointments/${appointmentId}`),
          apiRequest('/api/admin/medicines'),
          apiRequest('/api/doctor/profile'),
        ]);
        if (cancelled) return;

        if (apptRes?.success && apptRes.data) {
          setAppointment(apptRes.data);
          setExamData((prev) => ({
            ...prev,
            complaint: apptRes.data.complaint || '',
          }));
        } else {
          setError(apptRes?.error || 'Data pemeriksaan tidak ditemukan.');
        }
        if (medsRes?.success && Array.isArray(medsRes.data)) {
          setMedicinesList(medsRes.data);
        }
        if (docRes?.success && docRes.data) setDoctor(docRes.data);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading exam page data:', err);
          setError('Gagal memuat detail rekam medis pasien.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  // Handle Add Medicine to Prescription
  const handleAddMedicine = () => {
    if (!newItem.medicine_id) {
      setError('Pilih obat terlebih dahulu sebelum menambahkan ke resep.');
      return;
    }
    setError('');
    const med = medicinesList.find((m) => String(m.id) === String(newItem.medicine_id));
    const medName = med ? med.name : 'Obat';

    setPrescriptionItems((prev) => [
      ...prev,
      {
        medicine_id: newItem.medicine_id,
        medicine_name: medName,
        quantity: parseInt(newItem.quantity) || 1,
        dosage_rule: newItem.dosage_rule,
        duration_days: parseInt(newItem.duration_days) || 3,
      },
    ]);

    setNewItem({
      medicine_id: '',
      quantity: 1,
      dosage_rule: '3x1 tablet sesudah makan',
      duration_days: 3,
    });
  };

  const handleRemoveMedicine = (index) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Exam Form
  const handleSubmitExam = async (e) => {
    e.preventDefault();
    if (!examData.diagnosis.trim()) {
      setError('Diagnosis medis wajib diisi sebelum menyimpan rekam medis.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const recordPayload = {
        complaint: examData.complaint,
        vital_signs: {
          blood_pressure: examData.blood_pressure,
          pulse: examData.pulse,
          temperature: examData.temperature,
          weight: examData.weight,
          height: examData.height,
          oxygen_saturation: examData.oxygen_saturation,
        },
        diagnosis: examData.diagnosis.trim(),
        icd10_code: examData.icd10_code.trim(),
        treatment: examData.treatment.trim(),
        notes: examData.notes.trim(),
      };

      const res = await apiRequest(`/api/doctor/appointments/${appointmentId}/medical-record`, {
        method: 'POST',
        body: { recordData: recordPayload, prescriptionItems },
      });

      if (res && res.success) {
        setToast('Rekam medis dan peresepan obat berhasil disimpan secara permanen.');
        await refreshAppointmentData();
      } else {
        setError(res?.error || 'Gagal menyimpan rekam medis pasien.');
      }
    } catch (err) {
      console.error('Error saving exam:', err);
      setError('Terjadi kendala jaringan saat menyimpan rekam medis.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 5000);
    }
  };

  // Submit Addendum
  const handleAddendumSubmit = async (e) => {
    e.preventDefault();
    if (!addendumNote.trim() || !appointment?.medical_record?.id) return;

    setSubmittingAddendum(true);
    setError('');
    try {
      const res = await apiRequest(`/api/doctor/medical-records/${appointment.medical_record.id}/addenda`, {
        method: 'POST',
        body: { note: addendumNote.trim() },
      });
      if (res && res.success) {
        setToast('Adendum berhasil ditambahkan ke catatan medis.');
        setAddendumNote('');
        await refreshAppointmentData();
      } else {
        setError(res?.error || 'Gagal menambahkan adendum.');
      }
    } catch (err) {
      console.error('Addendum error:', err);
      setError('Terjadi kesalahan saat menyimpan adendum.');
    } finally {
      setSubmittingAddendum(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
        <Sidebar
          role="DOCTOR"
          userName={doctor?.full_name || 'Dokter'}
          userEmail={doctor?.email || 'dokter@medflow.com'}
        />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Memuat Data Pasien & Pemeriksaan...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
        <Sidebar
          role="DOCTOR"
          userName={doctor?.full_name || 'Dokter'}
          userEmail={doctor?.email || 'dokter@medflow.com'}
        />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h2 className="text-base font-bold text-slate-800">Janji Temu Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {error || 'Data pemeriksaan tidak ditemukan atau telah dibatalkan.'}
            </p>
            <Link
              href="/doctor/appointments"
              className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold"
            >
              Kembali ke Antrean
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const patient = appointment.patient || appointment || {};
  const hasMedicalRecord = !!appointment.medical_record;
  const existingRecord = appointment.medical_record || {};
  let existingVitals = {};
  if (typeof existingRecord.vital_signs === 'string') {
    try {
      existingVitals = JSON.parse(existingRecord.vital_signs) || {};
    } catch {
      existingVitals = {};
    }
  } else if (existingRecord.vital_signs && typeof existingRecord.vital_signs === 'object') {
    existingVitals = existingRecord.vital_signs;
  }
  const existingAddenda = appointment.addenda || existingRecord.addenda || [];
  const existingPrescription = appointment.prescription;
  const printableRecordData = hasMedicalRecord
    ? {
        ...existingRecord,
        appointment_date: appointment.appointment_date,
        slot_start: appointment.slot_start,
        queue_no: appointment.queue_no,
        poli_name: appointment.poli_name,
        doctor_name: appointment.doctor_name || doctor?.full_name,
        doctor_str_number: appointment.doctor_str_number || doctor?.str_number,
        patient_name: patient.full_name || appointment.patient_name,
        medical_record_no: patient.medical_record_no || appointment.medical_record_no,
        patient_birth_date: patient.birth_date,
        patient_gender: patient.gender,
        patient_blood_type: patient.blood_type,
        patient_phone: patient.patient_phone || patient.phone,
        patient_allergies: patient.allergies,
        addenda: existingAddenda,
        prescription: existingPrescription,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="DOCTOR"
        userName={doctor?.full_name || 'dr. Spesialis'}
        userEmail={doctor?.email || 'dokter@medflow.com'}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/doctor/appointments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Antrean Pasien</span>
          </Link>
          <StatusBadge status={appointment.status} size="sm" />
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 4 COLS: Patient Identity & Medical Profile */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 sticky top-6">
              {/* Patient Basic Info */}
              <div className="border-b border-slate-100 pb-5">
                <span className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">
                  Kartu Identitas Pasien
                </span>
                <h2 className="text-xl font-heading font-extrabold text-slate-900 mt-1">
                  {patient.full_name || appointment.patient_name}
                </h2>
                <p className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                  No. RM: {patient.medical_record_no || appointment.medical_record_no || '-'}
                </p>
              </div>

              {/* Bio Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Usia</span>
                  <span className="font-bold text-slate-800">
                    {calculateAge(patient.birth_date)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Jenis Kelamin</span>
                  <span className="font-bold text-slate-800">
                    {patient.gender === 'L' || patient.gender === 'M' ? 'Laki-laki' : 'Perempuan'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Golongan Darah</span>
                  <span className="font-bold text-slate-800">
                    {patient.blood_type || 'Tidak Tahu'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">No. Telepon</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {patient.patient_phone || patient.phone_number || patient.phone || '-'}
                  </span>
                </div>
              </div>

              {/* Allergies Warning */}
              {patient.allergies ? (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>Peringatan Riwayat Alergi</span>
                  </div>
                  <p className="text-red-700">{patient.allergies}</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Tidak ada riwayat alergi obat/makanan dilaporkan.</span>
                </div>
              )}

              {/* Appointment Context */}
              <div className="border-t border-slate-100 pt-4 text-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Informasi Sesi Konsultasi
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Poliklinik:</span>
                  <span className="font-semibold text-slate-800">
                    {appointment.poli_name}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Waktu & Antrean:</span>
                  <span className="font-semibold text-sky-700">
                    {appointment.slot_start?.substring(0, 5)} WIB (#{appointment.queue_no || '-'})
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">
                    Keluhan Pasien:
                  </span>
                  <p className="italic text-slate-700">
                    &ldquo;{appointment.complaint || '-'}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 8 COLS: Examination Form OR Read-Only Medical Record */}
          <div className="lg:col-span-8 space-y-6">
            {hasMedicalRecord ? (
              /* READ-ONLY RECORD VIEW (COMPLETED) */
              <div className="space-y-6 animate-fade-in">
                {/* Immutability Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm">
                        Rekam Medis Telah Selesai & Terkunci Permanen
                      </h3>
                      <p className="text-xs text-emerald-700">
                        Pemeriksaan dicatat pada {formatDateTimeIndo(existingRecord.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <MedicalRecordActions
                      recordId={existingRecord.id}
                      recordData={printableRecordData}
                      size="xs"
                    />
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      COMPLETED
                    </span>
                  </div>
                </div>

                {/* Main Medical Record Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
                  {/* Diagnosis */}
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Diagnosis Medis
                    </span>
                    <h2 className="text-2xl font-heading font-extrabold text-slate-900 mt-1">
                      {existingRecord.diagnosis}
                    </h2>
                    {existingRecord.icd10_code && (
                      <span className="inline-block mt-1 font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                        ICD-10: {existingRecord.icd10_code}
                      </span>
                    )}
                  </div>

                  {/* Vitals Signs Grid */}
                  <div>
                    <h4 className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-red-500" />
                      <span>Tanda-Tanda Vital</span>
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">TD</span>
                        <span className="font-bold text-slate-800">{existingVitals.blood_pressure || '-'} mmHg</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">Nadi</span>
                        <span className="font-bold text-slate-800">{existingVitals.pulse || '-'} bpm</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">Suhu</span>
                        <span className="font-bold text-slate-800">{existingVitals.temperature || '-'} °C</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">BB</span>
                        <span className="font-bold text-slate-800">{existingVitals.weight || '-'} kg</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">TB</span>
                        <span className="font-bold text-slate-800">{existingVitals.height || '-'} cm</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">SpO2</span>
                        <span className="font-bold text-slate-800">{existingVitals.oxygen_saturation || '-'} %</span>
                      </div>
                    </div>
                  </div>

                  {/* Treatment & Notes */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">
                        Tindakan / Terapi:
                      </span>
                      <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed text-slate-800">
                        {existingRecord.treatment || '-'}
                      </p>
                    </div>
                    {existingRecord.notes && (
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1">
                          Catatan Tambahan Dokter:
                        </span>
                        <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed text-slate-600">
                          {existingRecord.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Prescribed Medicines (if any) */}
                  {existingPrescription && (
                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-purple-600" />
                        <span>Resep Obat Terkait</span>
                      </h4>
                      <div className="space-y-1.5">
                        {existingPrescription.items?.map((it, i) => (
                          <div
                            key={i}
                            className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 text-xs flex items-center justify-between"
                          >
                            <span className="font-bold text-purple-900">
                              {it.medicine_name || it.name} ({it.quantity} unit)
                            </span>
                            <span className="text-slate-600">{it.dosage_rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Addenda List */}
                  {existingAddenda.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <h4 className="text-xs font-heading font-bold text-amber-800 uppercase tracking-wider">
                        Riwayat Adendum ({existingAddenda.length})
                      </h4>
                      {existingAddenda.map((ad, idx) => (
                        <div
                          key={idx}
                          className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs"
                        >
                          <div className="flex justify-between text-[10px] text-amber-900 font-bold mb-1">
                            <span>{ad.doctor_name || 'Dokter'}</span>
                            <span className="font-mono text-slate-500">
                              {formatDateTimeIndo(ad.created_at)}
                            </span>
                          </div>
                          <p className="text-slate-800">{ad.notes || ad.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Addendum Form */}
                <form
                  onSubmit={handleAddendumSubmit}
                  className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3"
                >
                  <h4 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>Tambah Catatan Adendum Medis</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Gunakan formulir adendum jika ada catatan koreksi, hasil lab susulan, atau observasi tambahan pasca pemeriksaan.
                  </p>
                  <textarea
                    rows={3}
                    required
                    value={addendumNote}
                    onChange={(e) => setAddendumNote(e.target.value)}
                    placeholder="Tuliskan adendum medis di sini..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingAddendum || !addendumNote.trim()}
                      className="py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {submittingAddendum ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Simpan Adendum'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* NEW EXAMINATION FORM */
              <form onSubmit={handleSubmitExam} className="space-y-6">
                {/* 1. Vital Signs Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <HeartPulse className="w-5 h-5 text-red-500" />
                    <h3 className="font-heading font-bold text-sm text-slate-900">
                      1. Pengukuran Tanda-Tanda Vital (TTV)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tekanan Darah (mmHg)
                      </label>
                      <input
                        type="text"
                        placeholder="120/80"
                        value={examData.blood_pressure}
                        onChange={(e) => setExamData({ ...examData, blood_pressure: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Denyut Nadi (bpm)
                      </label>
                      <input
                        type="number"
                        placeholder="80"
                        value={examData.pulse}
                        onChange={(e) => setExamData({ ...examData, pulse: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Suhu Tubuh (°C)
                      </label>
                      <input
                        type="text"
                        placeholder="36.5"
                        value={examData.temperature}
                        onChange={(e) => setExamData({ ...examData, temperature: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Berat Badan (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="65"
                        value={examData.weight}
                        onChange={(e) => setExamData({ ...examData, weight: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tinggi Badan (cm)
                      </label>
                      <input
                        type="number"
                        placeholder="170"
                        value={examData.height}
                        onChange={(e) => setExamData({ ...examData, height: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Saturasi SpO2 (%)
                      </label>
                      <input
                        type="number"
                        placeholder="98"
                        value={examData.oxygen_saturation}
                        onChange={(e) => setExamData({ ...examData, oxygen_saturation: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Diagnosis & Clinical Notes */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Stethoscope className="w-5 h-5 text-sky-600" />
                    <h3 className="font-heading font-bold text-sm text-slate-900">
                      2. Diagnosis & Terapi Klinis
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Diagnosis Medis Utama *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Faringitis Akut / Hipertensi Primer Derajat 1"
                      value={examData.diagnosis}
                      onChange={(e) => setExamData({ ...examData, diagnosis: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Kode ICD-10 (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: J02.9 / I10"
                        value={examData.icd10_code}
                        onChange={(e) => setExamData({ ...examData, icd10_code: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Keluhan Pasien Terkonfirmasi
                      </label>
                      <input
                        type="text"
                        value={examData.complaint}
                        onChange={(e) => setExamData({ ...examData, complaint: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Tindakan Medis / Prosedur Terapi
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Pembersihan luka, nebulisasi, terapi obat oral, edukasi pola makan..."
                      value={examData.treatment}
                      onChange={(e) => setExamData({ ...examData, treatment: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Catatan Tambahan Dokter (Instruksi Kontrol Ulang)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Kontrol kembali 5 hari lagi jika demam tidak kunjung reda..."
                      value={examData.notes}
                      onChange={(e) => setExamData({ ...examData, notes: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* 3. Prescription Section */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Pill className="w-5 h-5 text-purple-600" />
                      <h3 className="font-heading font-bold text-sm text-slate-900">
                        3. Peresepan Obat Digital (E-Prescription)
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                      {prescriptionItems.length} Obat Ditambahkan
                    </span>
                  </div>

                  {/* Add Medicine Inline Form */}
                  <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Pilih Obat *
                        </label>
                        <select
                          value={newItem.medicine_id}
                          onChange={(e) => setNewItem({ ...newItem, medicine_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="">-- Pilih dari Formularium Obat --</option>
                          {medicinesList.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} (Stok: {m.stock} {m.unit || 'tab'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Jumlah *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Durasi (Hari)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newItem.duration_days}
                          onChange={(e) => setNewItem({ ...newItem, duration_days: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Aturan pakai: misal 3x1 tablet sesudah makan"
                          value={newItem.dosage_rule}
                          onChange={(e) => setNewItem({ ...newItem, dosage_rule: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMedicine}
                        className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Obat</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Added Prescription Items */}
                  {prescriptionItems.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Nama Obat</th>
                            <th className="py-2.5 px-2 text-center">Jumlah</th>
                            <th className="py-2.5 px-3">Aturan Pakai</th>
                            <th className="py-2.5 px-2 text-center">Durasi</th>
                            <th className="py-2.5 px-2 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prescriptionItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {item.medicine_name}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-slate-900">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {item.dosage_rule}
                              </td>
                              <td className="py-2.5 px-2 text-center text-slate-500">
                                {item.duration_days} hari
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMedicine(idx)}
                                  className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                  title="Hapus Obat"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Data akan disimpan permanen & status antrean ditutup</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan Rekam Medis...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simpan Rekam Medis & Resep</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
