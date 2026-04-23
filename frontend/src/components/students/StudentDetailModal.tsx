import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCountries,
  fetchDistricts,
  fetchNationalities,
  type CountryOption,
} from "../../api/geo";
import {
  deleteStudent,
  fetchClassrooms,
  fetchStudent,
  updateStudent,
  uploadStudentPhoto,
  type ClassRoomOption,
  type StudentApiRow,
} from "../../api/students";
import { useI18n } from "../../i18n/I18nProvider";
import { AuthenticatedStudentPhoto } from "./AuthenticatedStudentPhoto";

const fieldClass =
  "w-full rounded-lg border border-[#e0d8cc] bg-[#faf9f7] px-3 py-2 text-sm text-[#2d3436] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.06)] outline-none focus:border-[#6a9570]/60";

type StudentDetailModalProps = {
  studentId: number | null;
  /** When opening from the row “edit” action */
  initialEditing?: boolean;
  /** Focus stream/section control after opening in edit mode (e.g. class roster “Move section”). */
  focusSectionField?: boolean;
  /**
   * When provided (non-empty), section is chosen from this list (streams for the current class).
   * Otherwise the free-text section field is used.
   */
  streamOptions?: string[] | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
  onSaved?: (studentName: string) => void;
};

export function StudentDetailModal({
  studentId,
  initialEditing = false,
  focusSectionField = false,
  streamOptions = null,
  onClose,
  onChanged,
  onSaved,
}: StudentDetailModalProps) {
  const { t } = useI18n();
  const sectionSelectRef = useRef<HTMLSelectElement>(null);
  const sectionInputRef = useRef<HTMLInputElement>(null);
  const [row, setRow] = useState<StudentApiRow | null>(null);
  const [rooms, setRooms] = useState<ClassRoomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [gender, setGender] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [nationality, setNationality] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [district, setDistrict] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const kindergartenRooms = rooms.filter((r) => /^KG[1-3]$/i.test(r.name.trim()));
  const lowerPrimaryRooms = rooms.filter((r) => /^P[1-3]$/i.test(r.name.trim()));
  const upperPrimaryRooms = rooms.filter((r) => /^P[4-7]$/i.test(r.name.trim()));
  const otherRooms = rooms.filter(
    (r) =>
      !/^KG[1-3]$/i.test(r.name.trim()) &&
      !/^P[1-3]$/i.test(r.name.trim()) &&
      !/^P[4-7]$/i.test(r.name.trim()),
  );

  const inferSectionFromClassroomName = (name: string): string => {
    const n = name.trim().toUpperCase();
    if (/^KG[1-3]$/.test(n)) return "Kindergarten";
    if (/^P[1-3]$/.test(n)) return "Lower Primary";
    if (/^P[4-7]$/.test(n)) return "Upper Primary";
    return "";
  };

  useEffect(() => {
    if (studentId == null) {
      setRow(null);
      setEditing(false);
      return;
    }
    setEditing(initialEditing);
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetchStudent(studentId),
      fetchClassrooms(),
      fetchNationalities(),
      fetchCountries(),
    ])
      .then(([s, r, nat, ctry]) => {
        if (cancelled) return;
        setRow(s);
        setRooms(r);
        setNationalities(nat);
        setCountries(ctry);
        setFirstName(s.firstName);
        setMiddleName(s.middleName ?? "");
        setLastName(s.lastName);
        setDateOfBirth(s.dateOfBirth ?? "");
        setParentEmail(s.parentEmail ?? "");
        setGender(s.gender ?? "");
        setSectionName(s.sectionName ?? "");
        setClassRoomId(s.classRoomId != null ? String(s.classRoomId) : "");
        setNationality(s.nationality ?? "");
        setCountryCode(s.countryCode ?? "");
        setDistrict(s.district ?? "");
        setEmergencyContactName(s.emergencyContactName ?? "");
        setEmergencyContactPhone(s.emergencyContactPhone ?? "");
        setGuardianName(s.guardianName ?? "");
        setGuardianPhone(s.guardianPhone ?? "");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, initialEditing]);

  useEffect(() => {
    if (!editing) return;
    const roomId = Number.parseInt(classRoomId, 10);
    if (!Number.isFinite(roomId) || roomId <= 0) return;
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const inferred = inferSectionFromClassroomName(room.name);
    if (inferred) setSectionName(inferred);
  }, [classRoomId, rooms, editing]);

  useEffect(() => {
    if (studentId == null || row == null || row.id !== studentId) return;
    const code = countryCode.trim();
    if (!code) {
      setDistricts([]);
      setDistrict("");
      return;
    }
    let cancelled = false;
    setDistrictsLoading(true);
    void fetchDistricts(code)
      .then((list) => {
        if (!cancelled) {
          setDistricts(list);
          setDistrict((d) => (d && list.includes(d) ? d : ""));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDistricts([]);
          setDistrict("");
        }
      })
      .finally(() => {
        if (!cancelled) setDistrictsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, countryCode, row]);

  const resolvedStreamOptions = useMemo(() => {
    if (!streamOptions?.length) return null;
    const cur = sectionName.trim();
    if (cur && !streamOptions.includes(cur)) return [cur, ...streamOptions];
    return streamOptions;
  }, [streamOptions, sectionName]);

  useEffect(() => {
    if (!focusSectionField || !editing || loading || row == null) return;
    const timer = window.setTimeout(() => {
      const el = sectionSelectRef.current ?? sectionInputRef.current;
      if (!el) return;
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusSectionField, editing, loading, row?.id, studentId]);

  if (studentId == null) return null;

  const resetUiSession = () => {
    setEditing(false);
    setSaving(false);
    setError(null);
    setDistrictsLoading(false);
  };

  const handleClosePanel = () => {
    resetUiSession();
    onClose();
  };

  const reload = async () => {
    const s = await fetchStudent(studentId);
    setRow(s);
    setFirstName(s.firstName);
    setMiddleName(s.middleName ?? "");
    setLastName(s.lastName);
    setDateOfBirth(s.dateOfBirth ?? "");
    setParentEmail(s.parentEmail ?? "");
    setGender(s.gender ?? "");
    setSectionName(s.sectionName ?? "");
    setClassRoomId(s.classRoomId != null ? String(s.classRoomId) : "");
    setNationality(s.nationality ?? "");
    setCountryCode(s.countryCode ?? "");
    setDistrict(s.district ?? "");
    await Promise.resolve(onChanged());
    return s;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const cr =
        classRoomId.trim() === "" ? null : Number.parseInt(classRoomId, 10);
      const cc = countryCode.trim();
      const dist = district.trim();
      await updateStudent(studentId, {
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim() || null,
        parentEmail: parentEmail.trim() || null,
        gender: gender.trim() || null,
        sectionName:
          (() => {
            const selectedRoom = rooms.find((r) => String(r.id) === classRoomId);
            const inferred = selectedRoom
              ? inferSectionFromClassroomName(selectedRoom.name)
              : "";
            return inferred || sectionName.trim() || null;
          })(),
        classRoomId:
          cr != null && Number.isFinite(cr) && cr > 0 ? cr : null,
        nationality: nationality.trim() || null,
        countryCode: cc ? cc : null,
        district: dist || null,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        guardianName: guardianName.trim() || null,
        guardianPhone: guardianPhone.trim() || null,
      });
      const saved = await reload();
      setEditing(false);
      setConfirmSaveOpen(false);
      onSaved?.(saved.fullName);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("students.form.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("students.modal.deleteConfirm"))) return;
    try {
      await deleteStudent(studentId);
      await Promise.resolve(onChanged());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("students.modal.deleteFailed"));
    }
  };

  const handlePhoto = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      await uploadStudentPhoto(studentId, file);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("students.photo.uploadError"));
    }
  };

  return (
    <>
      {confirmSaveOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#2d3436]/35 backdrop-blur-[1px]"
            onClick={() => setConfirmSaveOpen(false)}
            aria-label="Close update confirmation"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-[#d9e4f0] bg-[#fffcf7] p-5 shadow-[8px_12px_40px_rgba(45,52,54,0.18)]">
            <h3 className="text-base font-bold text-[#2d3436]">Confirm Update</h3>
            <p className="mt-2 text-sm text-[#636e72]">
              Do you want to update the information as provided?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-full bg-gradient-to-br from-[#b8d8ba] to-[#8fb892] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-sm transition hover:brightness-105 disabled:opacity-50"
              >
                Yes
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmSaveOpen(false)}
                className="rounded-full bg-[#faf7f0] px-5 py-2 text-sm font-semibold text-[#636e72] ring-1 ring-[#ebe4d9] transition hover:bg-[#f0ebe3] disabled:opacity-50"
              >
                No
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-modal-title"
      >
      <button
        type="button"
        className="absolute inset-0 bg-[#2d3436]/40 backdrop-blur-[2px]"
        aria-label={t("students.modal.close")}
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto overflow-x-hidden rounded-2xl border border-[#ebe4d9] bg-[#fffcf7] shadow-[8px_12px_40px_rgba(45,52,54,0.18)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ebe4d9] bg-gradient-to-r from-[#f8faf6] to-[#eef6f9] px-5 py-3">
          <h2 id="student-modal-title" className="text-base font-bold text-[#2d3436]">
            {editing ? t("students.modal.editTitle") : t("students.modal.viewTitle")}
          </h2>
          <button
            type="button"
            onClick={handleClosePanel}
            className="rounded-lg p-2 text-[#636e72] transition hover:bg-[#ebe4d9]/80 hover:text-[#2d3436]"
            aria-label={t("students.modal.close")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-sm text-[#636e72]">{t("students.loading")}</p>
          ) : null}

          {error ? (
            <p
              className="mb-3 rounded-lg border border-[#f7d1cd] bg-[#fff7f5] px-3 py-2 text-sm text-[#a9332a]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {row && !loading ? (
            <>
              <div className="mb-5 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl ring-2 ring-[#ebe4d9]">
                  <AuthenticatedStudentPhoto
                    studentId={row.id}
                    hasPhoto={row.hasPassportPhoto}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="font-mono text-xs text-[#636e72]">{row.admissionNumber}</p>
                  <p className="text-lg font-bold text-[#2d3436]">{row.fullName}</p>
                  <label className="mt-2 block">
                    <span className="text-xs font-semibold text-[#636e72]">
                      {t("students.photo.label")}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="mt-1 block w-full text-xs text-[#636e72] file:mr-2 file:rounded-lg file:border-0 file:bg-[#cde8cf] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2d3436]"
                      onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              {!editing ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.admission")}</dt>
                    <dd className="font-mono font-semibold text-[#2d3436]">
                      {row.admissionNumber}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.nationality")}</dt>
                    <dd className="min-w-0 text-right font-medium text-[#2d3436]">
                      {row.nationality ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.country")}</dt>
                    <dd className="min-w-0 text-right font-medium text-[#2d3436]">
                      {row.countryName ?? row.countryCode ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.district")}</dt>
                    <dd className="min-w-0 text-right font-medium text-[#2d3436]">
                      {row.district ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.registrationType")}</dt>
                    <dd className="min-w-0 text-right font-medium text-[#2d3436]">
                      {row.registrationType === "continuing"
                        ? t("students.form.registrationContinuing")
                        : t("students.form.registrationFirst")}
                    </dd>
                  </div>
                  {row.registrationType === "continuing" ? (
                    <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                      <dt className="text-[#636e72]">{t("students.col.previousSchool")}</dt>
                      <dd className="min-w-0 break-words text-right font-medium text-[#2d3436]">
                        {row.previousSchool ?? "—"}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.class")}</dt>
                    <dd className="font-medium text-[#2d3436]">{row.className ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.section")}</dt>
                    <dd className="font-medium text-[#2d3436]">{row.sectionName ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("learner.gender")}</dt>
                    <dd className="font-medium text-[#2d3436]">{row.gender ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.dob")}</dt>
                    <dd className="font-medium text-[#2d3436]">
                      {row.dateOfBirthFormatted ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">{t("students.col.parentEmail")}</dt>
                    <dd className="min-w-0 break-all font-medium text-[#2d3436]">
                      {row.parentEmail ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">{t("students.col.admitted")}</dt>
                    <dd className="font-medium text-[#2d3436]">{row.admittedAt}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[#f0ebe3] py-2">
                    <dt className="text-[#636e72]">Middle name</dt>
                    <dd className="font-medium text-[#2d3436]">{row.middleName ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Previous school location</dt>
                    <dd className="font-medium text-[#2d3436]">{row.previousSchoolLocation ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Last class attended</dt>
                    <dd className="font-medium text-[#2d3436]">{row.lastClassAttended ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Last term/year</dt>
                    <dd className="font-medium text-[#2d3436]">{row.lastTermYear ?? "—"}</dd>
                  </div>

                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Transfer reason</dt>
                    <dd className="font-medium text-[#2d3436]">{row.transferReason ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Parent full name</dt>
                    <dd className="font-medium text-[#2d3436]">{row.parentFullName ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Parent phone</dt>
                    <dd className="font-medium text-[#2d3436]">{row.parentPhone ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Parent address</dt>
                    <dd className="font-medium text-[#2d3436]">{row.parentAddress ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Parent alive status</dt>
                    <dd className="font-medium text-[#2d3436]">{row.parentAliveStatus ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Religion</dt>
                    <dd className="font-medium text-[#2d3436]">{row.religion ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Special needs</dt>
                    <dd className="font-medium text-[#2d3436]">{row.specialNeeds ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Boarding status</dt>
                    <dd className="font-medium text-[#2d3436]">{row.boardingStatus ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Residence address</dt>
                    <dd className="font-medium text-[#2d3436]">{row.residenceAddress ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Medical info</dt>
                    <dd className="font-medium text-[#2d3436]">{row.medicalInfo ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Emergency contact name</dt>
                    <dd className="font-medium text-[#2d3436]">{row.emergencyContactName ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Emergency contact phone</dt>
                    <dd className="font-medium text-[#2d3436]">{row.emergencyContactPhone ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Guardian name</dt>
                    <dd className="font-medium text-[#2d3436]">{row.guardianName ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[#636e72]">Guardian phone</dt>
                    <dd className="font-medium text-[#2d3436]">{row.guardianPhone ?? "—"}</dd>
                  </div>
                </dl>
              ) : (
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <label className="block min-w-0 text-xs font-semibold text-[#636e72] sm:col-span-2">
                    {t("students.col.admission")}
                    <input
                      disabled
                      className={`${fieldClass} mt-1 font-mono disabled:opacity-80`}
                      value={row.admissionNumber}
                    />
                  </label>
                  <label className="block min-w-0 text-xs font-semibold text-[#636e72]">
                    {t("students.form.nationality")}
                    <select
                      className={`${fieldClass} mt-1`}
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                    >
                      <option value="">{t("students.form.nationalityUnset")}</option>
                      {nationalities.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block min-w-0 text-xs font-semibold text-[#636e72]">
                    {t("students.form.country")}
                    <select
                      className={`${fieldClass} mt-1`}
                      value={countryCode}
                      onChange={(e) => {
                        setCountryCode(e.target.value);
                        setDistrict("");
                      }}
                    >
                      <option value="">{t("students.form.countryUnset")}</option>
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block min-w-0 text-xs font-semibold text-[#636e72] sm:col-span-2">
                    {t("students.form.district")}
                    <select
                      className={`${fieldClass} mt-1 disabled:opacity-60`}
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      disabled={!countryCode.trim() || districtsLoading}
                    >
                      <option value="">
                        {!countryCode.trim()
                          ? t("students.form.districtPickCountry")
                          : districtsLoading
                            ? t("students.form.districtLoading")
                            : t("students.form.districtUnset")}
                      </option>
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-1">
                    {t("students.form.firstName")} *
                    <input
                      className={`${fieldClass} mt-1`}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-1">
                    {t("students.form.middleName")}
                    <input
                      className={`${fieldClass} mt-1`}
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-1">
                    {t("students.form.lastName")} *
                    <input
                      className={`${fieldClass} mt-1`}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2">
                    {t("students.form.dob")}
                    <input
                      type="date"
                      className={`${fieldClass} mt-1`}
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2">
                    {t("students.form.parentEmail")}
                    <input
                      type="email"
                      className={`${fieldClass} mt-1`}
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2">
                    {t("students.form.classroom")}
                    <select
                      className={`${fieldClass} mt-1`}
                      value={classRoomId}
                      onChange={(e) => setClassRoomId(e.target.value)}
                    >
                      <option value="">{t("students.form.classroomUnset")}</option>
                      {kindergartenRooms.length > 0 ? (
                        <optgroup label={t("students.form.classGroupKindergarten")}>
                          {kindergartenRooms.map((r) => (
                            <option key={r.id} value={String(r.id)}>
                              {r.name} ({r.academicYear})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {lowerPrimaryRooms.length > 0 ? (
                        <optgroup label={t("students.form.classGroupLowerPrimary")}>
                          {lowerPrimaryRooms.map((r) => (
                            <option key={r.id} value={String(r.id)}>
                              {r.name} ({r.academicYear})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {upperPrimaryRooms.length > 0 ? (
                        <optgroup label={t("students.form.classGroupUpperPrimary")}>
                          {upperPrimaryRooms.map((r) => (
                            <option key={r.id} value={String(r.id)}>
                              {r.name} ({r.academicYear})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {otherRooms.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.name} ({r.academicYear})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2">
                    Emergency Contact Name *
                    <input
                      required
                      className={`${fieldClass} mt-1`}
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2">
                    Emergency Contact Phone *
                    <input
                      required
                      type="tel"
                      minLength={10}
                      maxLength={13}
                      className={`${fieldClass} mt-1`}
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/[^\d+]/g, ''))}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2">
                    {t("students.form.guardianName")}
                    <input
                      className={`${fieldClass} mt-1`}
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2">
                    {t("students.form.guardianPhone")}
                    <input
                      type="tel"
                      minLength={10}
                      maxLength={13}
                      className={`${fieldClass} mt-1`}
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value.replace(/[^\d+]/g, ''))}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72]">
                    {t("students.form.gender")}
                    <select
                      className={`${fieldClass} mt-1`}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">{t("students.form.genderUnset")}</option>
                      <option value="Female">{t("students.form.genderFemale")}</option>
                      <option value="Male">{t("students.form.genderMale")}</option>
                      <option value="Other">{t("students.form.genderOther")}</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2">
                    {t("students.form.section")}
                    {resolvedStreamOptions ? (
                      <select
                        ref={sectionSelectRef}
                        className={`${fieldClass} mt-1`}
                        value={sectionName}
                        onChange={(e) => setSectionName(e.target.value)}
                      >
                        <option value="">{t("classes.classStudents.pickStream")}</option>
                        {resolvedStreamOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        ref={sectionInputRef}
                        className={`${fieldClass} mt-1`}
                        value={sectionName}
                        onChange={(e) => setSectionName(e.target.value)}
                      />
                    )}
                  </label>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2 border-t border-[#ebe4d9] pt-4">
                {!editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="rounded-full bg-gradient-to-br from-[#b9d9eb] to-[#8bb8d4] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-sm transition hover:brightness-105"
                    >
                      {t("students.modal.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      className="rounded-full bg-gradient-to-br from-[#fad5d0] to-[#e8b5b0] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-sm transition hover:brightness-105"
                    >
                      {t("students.modal.delete")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setConfirmSaveOpen(true)}
                      className="rounded-full bg-gradient-to-br from-[#b8d8ba] to-[#8fb892] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-sm transition hover:brightness-105 disabled:opacity-50"
                    >
                      {saving ? t("students.form.saving") : t("students.modal.save")}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setEditing(false);
                        if (row) {
                          setFirstName(row.firstName);
                          setLastName(row.lastName);
                          setDateOfBirth(row.dateOfBirth ?? "");
                          setParentEmail(row.parentEmail ?? "");
                          setGender(row.gender ?? "");
                          setSectionName(row.sectionName ?? "");
                          setClassRoomId(row.classRoomId != null ? String(row.classRoomId) : "");
                          setNationality(row.nationality ?? "");
                          setCountryCode(row.countryCode ?? "");
                          setDistrict(row.district ?? "");
                          setEmergencyContactName(row.emergencyContactName ?? "");
                          setEmergencyContactPhone(row.emergencyContactPhone ?? "");
                          setGuardianName(row.guardianName ?? "");
                          setGuardianPhone(row.guardianPhone ?? "");
                        }
                      }}
                      className="rounded-full bg-[#faf7f0] px-5 py-2 text-sm font-semibold text-[#636e72] ring-1 ring-[#ebe4d9] transition hover:bg-[#f0ebe3]"
                    >
                      {t("students.modal.cancelEdit")}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
      </div>
    </>
  );
}
