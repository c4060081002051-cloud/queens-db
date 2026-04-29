import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  fetchCountries,
  fetchNationalities,
  type CountryOption,
} from "../../api/geo";
import {
  fetchClassrooms,
  bulkCreateStudentsJson,
  type ClassRoomOption,
  type CreateStudentBody,
} from "../../api/students";
import { useI18n } from "../../i18n/I18nProvider";

type AdmissionImportTableProps = {
  onDone: () => void;
};

type Row = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  classRoomId: string;
  sectionName: string;
  nationality: string;
  countryCode: string;
  district: string;
  religion: string;
  registrationType: "first" | "continuing";

  parentAliveStatus: "both" | "one" | "none" | "";
  parentFullName: string;
  parentPhone: string;
  parentEmail: string;
  parentAddress: string;
  guardianName: string;
  guardianPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  boardingStatus: "boarding" | "day_half" | "day_full" | "";
  specialNeeds: string;
  residenceAddress: string;
  medicalInfo: string;
};

const headers: Array<{ key: keyof Row; label: string }> = [
  { key: "firstName", label: "First name" },
  { key: "middleName", label: "Middle name" },
  { key: "lastName", label: "Last name" },
  { key: "dateOfBirth", label: "DOB (DD/MM/YYYY)" },
  { key: "gender", label: "Gender" },
  { key: "classRoomId", label: "ClassRoom ID" },
  { key: "sectionName", label: "Section" },
  { key: "nationality", label: "Nationality" },
  { key: "countryCode", label: "Country code" },
  { key: "district", label: "District" },
  { key: "religion", label: "Religion" },
  { key: "registrationType", label: "Registration type" },

  { key: "parentAliveStatus", label: "Parent status" },
  { key: "parentFullName", label: "Parent full name" },
  { key: "parentPhone", label: "Parent phone" },
  { key: "parentEmail", label: "Parent email" },
  { key: "parentAddress", label: "Parent address" },
  { key: "guardianName", label: "Guardian name" },
  { key: "guardianPhone", label: "Guardian phone" },
  { key: "emergencyContactName", label: "Emergency contact name" },
  { key: "emergencyContactPhone", label: "Emergency contact phone" },
  { key: "boardingStatus", label: "Status" },
  { key: "specialNeeds", label: "Special needs" },
  { key: "residenceAddress", label: "Residence address" },
  { key: "medicalInfo", label: "Medical info" },
];

const HEADER_ALIASES: Record<string, keyof Row> = {
  firstname: "firstName",
  middlename: "middleName",
  lastname: "lastName",
  dateofbirth: "dateOfBirth",
  dob: "dateOfBirth",
  gender: "gender",
  classroomid: "classRoomId",
  classroom: "classRoomId",
  classid: "classRoomId",
  sectionname: "sectionName",
  section: "sectionName",
  stream: "sectionName",
  nationality: "nationality",
  countrycode: "countryCode",
  country: "countryCode",
  district: "district",
  religion: "religion",
  registrationtype: "registrationType",
  parentalivestatus: "parentAliveStatus",
  parentfullname: "parentFullName",
  parentphone: "parentPhone",
  parentemail: "parentEmail",
  parentaddress: "parentAddress",
  guardianname: "guardianName",
  guardianphone: "guardianPhone",
  emergencycontactname: "emergencyContactName",
  emergencycontactphone: "emergencyContactPhone",
  boardingstatus: "boardingStatus",
  status: "boardingStatus",
  specialneeds: "specialNeeds",
  residenceaddress: "residenceAddress",
  medicalinfo: "medicalInfo",
};

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveHeader(raw: string): keyof Row | null {
  const normalized = normalizeHeader(raw);
  return HEADER_ALIASES[normalized] ?? null;
}

const requiredKeys: Array<keyof Row> = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "classRoomId",
  "nationality",
  "countryCode",
  "religion",
  "parentAliveStatus",
  "boardingStatus",
];

function emptyRow(): Row {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    classRoomId: "",
    sectionName: "",
    nationality: "",
    countryCode: "",
    district: "",
    religion: "",
    registrationType: "first",

    parentAliveStatus: "",
    parentFullName: "",
    parentPhone: "",
    parentEmail: "",
    parentAddress: "",
    guardianName: "",
    guardianPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    boardingStatus: "",
    specialNeeds: "",
    residenceAddress: "",
    medicalInfo: "",
  };
}

function normalizeFlexibleDate(val: string): string {
  if (!val) return "";
  const v = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // Already YYYY-MM-DD
  const parts = v.split(/[-/.]/);
  if (parts.length === 3) {
    let d = parts[0];
    let m = parts[1];
    const y = parts[2];
    if (y.length === 4) { // DD/MM/YYYY or D/M/YYYY
      if (d.length === 1) d = "0" + d;
      if (m.length === 1) m = "0" + m;
      return `${y}-${m}-${d}`;
    }
  }
  return v;
}

function normalizeBoardingStatus(val: string): string {
  if (!val) return "";
  const s = val.trim().toLowerCase();
  if (s === "boarding") return "boarding";
  if (s === "day" || s === "day_scholar" || s === "day_full" || s === "dayfull" || s === "full_day" || s === "fullday") return "day_full";
  if (s === "day_half" || s === "dayhalf" || s === "half_day" || s === "halfday") return "day_half";
  return val; // leave as is so validation flags it
}

function csvToRows(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const cols = lines[0].split(",").map((h) => resolveHeader(h.trim()));
  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const r = emptyRow();
    cols.forEach((c, idx) => {
      let v = vals[idx] ?? "";
      if (c) {
        if (c === "dateOfBirth") v = normalizeFlexibleDate(v);
        if (c === "boardingStatus") v = normalizeBoardingStatus(v);
        (r as Record<string, string>)[c] = v;
      }
    });
    out.push(r);
  }
  return out;
}

function sheetToRows(rows2d: string[][]): Row[] {
  if (rows2d.length < 2) return [];
  const cols = rows2d[0].map((h) => resolveHeader(String(h ?? "").trim()));
  const out: Row[] = [];
  for (let i = 1; i < rows2d.length; i++) {
    const vals = rows2d[i].map((v) => String(v ?? "").trim());
    // skip fully empty data rows
    if (vals.every((v) => !v)) continue;
    const r = emptyRow();
    cols.forEach((c, idx) => {
      let v = vals[idx] ?? "";
      if (c) {
        if (c === "dateOfBirth") v = normalizeFlexibleDate(v);
        if (c === "boardingStatus") v = normalizeBoardingStatus(v);
        (r as Record<string, string>)[c] = v;
      }
    });
    out.push(r);
  }
  return out;
}

export function AdmissionImportTable({ onDone }: AdmissionImportTableProps) {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<ClassRoomOption[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [skipErrors, setSkipErrors] = useState(false);


  const religions = useMemo(
    () => [
      "Christian",
      "Muslim",
      "Catholic",
      "Protestant",
      "Born Again",
      "Seventh-day Adventist",
      "Orthodox",
      "Traditional",
      "Other",
    ],
    [],
  );
  const sortedRooms = useMemo(
    () =>
      [...rooms]
        .filter((r) => r.isActive !== false)
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        ),
    [rooms],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchClassrooms(), fetchCountries(), fetchNationalities()])
      .then(([cr, ctry, nat]) => {
        if (cancelled) return;
        setRooms(cr);
        setCountries(ctry);
        setNationalities(nat);
      })
      .catch(() => {
        if (!cancelled) setError(t("students.form.geoLoadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function onImportFile(file: File) {
    const lower = file.name.toLowerCase();
    let parsed: Row[] = [];

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setRows([]);
        setError("No worksheet found in Excel file.");
        setMessage(null);
        return;
      }
      const sheet = workbook.Sheets[firstSheetName];
      const rows2d = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
        header: 1,
        raw: false,
      });
      parsed = sheetToRows(
        rows2d.map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
      );
    } else {
      const text = await file.text();
      parsed = csvToRows(text);
    }

    setRows(parsed);
    setError(parsed.length === 0 ? "No rows found in file." : null);
    setMessage(parsed.length > 0 ? `Loaded ${parsed.length} row(s). Review and save.` : null);
    setSkipErrors(false);
  }

  function downloadTemplate() {
    const csvContent = headers.map((h) => h.key).join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "student_import_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function updateCell(index: number, key: keyof Row, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function validateRow(r: Row): string | null {
    for (const key of requiredKeys) {
      if (!String(r[key] ?? "").trim()) {
        const displayKey = key === "boardingStatus" ? "Status (boardingStatus)" : String(key);
        return `${displayKey} is required`;
      }
    }
    if (r.boardingStatus && !["boarding", "day_full", "day_half"].includes(r.boardingStatus)) {
      return "Status must be exactly 'boarding', 'day_full', or 'day_half'";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.dateOfBirth.trim())) {
      return "dateOfBirth must be DD/MM/YYYY or YYYY-MM-DD";
    }
    if (
      (r.parentAliveStatus === "both" || r.parentAliveStatus === "one") &&
      (!r.parentFullName.trim() || !r.parentPhone.trim() || !r.parentAddress.trim())
    ) {
      return "parentFullName, parentPhone and parentAddress are required when a parent is available";
    }
    if (r.parentAliveStatus === "none") {
      if (!r.guardianName.trim() || !r.guardianPhone.trim()) {
        return "guardianName and guardianPhone are required when both parents are deceased";
      }
      if (!r.emergencyContactName.trim() || !r.emergencyContactPhone.trim()) {
        return "emergencyContactName and emergencyContactPhone are required when both parents are deceased";
      }
    }
    return null;
  }

  function classIdFromRow(r: Row): number | undefined {
    const byId = Number.parseInt(r.classRoomId.trim(), 10);
    if (Number.isFinite(byId) && byId > 0) return byId;
    const byName = rooms.find(
      (rm) => rm.name.trim().toLowerCase() === r.classRoomId.trim().toLowerCase(),
    );
    return byName?.id;
  }

  async function saveAll() {
    if (rows.length === 0) {
      setError("Import data first.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);

    const itemsToUpload: CreateStudentBody[] = [];
    const localFailures: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowError = validateRow(r);
      if (rowError) {
        localFailures.push(`Row ${i + 1}: ${rowError}`);
        continue;
      }

      const classRoomNum = classIdFromRow(r);
      itemsToUpload.push({
        firstName: r.firstName.trim(),
        middleName: r.middleName.trim() || undefined,
        lastName: r.lastName.trim(),
        dateOfBirth: r.dateOfBirth.trim() || undefined,
        parentEmail: r.parentEmail.trim() || undefined,
        gender: r.gender.trim() || undefined,
        classRoomId: classRoomNum,
        sectionName: r.sectionName.trim() || undefined,
        nationality: r.nationality.trim() || undefined,
        countryCode: r.countryCode.trim() || undefined,
        district: r.district.trim() || undefined,
        religion: r.religion.trim() || undefined,
        registrationType: r.registrationType,
        parentAliveStatus: (r.parentAliveStatus || undefined) as any,
        parentFullName: r.parentFullName.trim() || undefined,
        parentPhone: r.parentPhone.trim() || undefined,
        parentEmail: r.parentEmail.trim() || undefined,
        parentAddress: r.parentAddress.trim() || undefined,
        guardianName: r.guardianName.trim() || undefined,
        guardianPhone: r.guardianPhone.trim() || undefined,
        emergencyContactName: r.emergencyContactName.trim() || undefined,
        emergencyContactPhone: r.emergencyContactPhone.trim() || undefined,
        boardingStatus: (r.boardingStatus || undefined) as any,
        specialNeeds: r.specialNeeds.trim() || undefined,
        residenceAddress: r.residenceAddress.trim() || undefined,
        medicalInfo: r.medicalInfo.trim() || undefined,
      });
    }

    if (itemsToUpload.length === 0) {
      setBusy(false);
      if (localFailures.length > 0) {
        setError(localFailures.slice(0, 8).join("\n"));
      }
      return;
    }

    try {
      const response = await bulkCreateStudentsJson(itemsToUpload);
      const { created, results } = response;

      const apiFailures: string[] = [];
      const assignedAdmissionNumbers: string[] = [];

      results.forEach((res, idx) => {
        if (res.error) {
          apiFailures.push(`Item ${idx + 1}: ${res.error}`);
        } else if (res.admissionNumber) {
          assignedAdmissionNumbers.push(res.admissionNumber);
        }
      });

      const allFailures = [...localFailures, ...apiFailures];
      const assignedPreview =
        assignedAdmissionNumbers.length > 0
          ? ` Admission numbers: ${assignedAdmissionNumbers.slice(0, 8).join(", ")}${
              assignedAdmissionNumbers.length > 8 ? "..." : ""
            }`
          : "";

      setMessage(`Import finished. Created: ${created} row(s).${assignedPreview}`);
      if (allFailures.length > 0) {
        setError(allFailures.slice(0, 8).join("\n"));
      } else {
        setError(null);
        if (created > 0) onDone();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk import failed");
    } finally {
      setBusy(false);
    }
  }


  const validationErrors = useMemo(() => {
    return rows.map((r) => validateRow(r));
  }, [rows, rooms]);

  const hasErrors = validationErrors.some((e) => e !== null);
  const canSubmit = rows.length > 0 && !busy && (!hasErrors || skipErrors);
  const errorCount = validationErrors.filter((e) => e !== null).length;

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">
            {t("students.import.title")}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72]">
            Bulk import students via CSV or Excel spreadsheets.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-xl border-2 border-[#ebe4d9] bg-white px-5 py-2.5 text-sm font-bold text-[#2d3436] transition hover:bg-[#faf9f6]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </button>
        </div>
      </div>

      <div className="neo-card p-6">
        {rows.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors ${
              isDragging
                ? "border-[#3498db] bg-[#3498db]/5"
                : "border-[#ebe4d9] bg-[#faf9f6] hover:border-[#b2bec3]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                await onImportFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm text-[#636e72]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#2d3436]">Drag and drop your file here</h3>
            <p className="mt-2 text-sm font-medium text-[#636e72]">
              Supported formats: .csv, .xlsx, .xls
            </p>
            <div className="mt-6">
              <label className="cursor-pointer rounded-full bg-[#2d3436] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#636e72]">
                Browse Files
                <input
                  type="file"
                  accept=".csv,text/csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onImportFile(f);
                  }}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#2d3436]">Review Import Data</h3>
                <p className="text-sm font-medium text-[#636e72]">
                  Found {rows.length} row(s).{" "}
                  {errorCount > 0 ? (
                    <span className="text-rose-600">
                      {errorCount} row(s) have errors.
                    </span>
                  ) : (
                    <span className="text-emerald-600">All rows are valid.</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {errorCount > 0 && (
                  <label className="flex items-center gap-2 text-sm font-bold text-[#2d3436] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipErrors}
                      onChange={(e) => setSkipErrors(e.target.checked)}
                      className="h-4 w-4 rounded border-[#b2bec3] text-[#3498db] focus:ring-[#3498db]"
                    />
                    Skip {errorCount} erroneous row(s)
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => setRows([])}
                  className="rounded-full bg-white border-2 border-[#ebe4d9] px-6 py-2.5 text-sm font-bold text-[#2d3436] transition hover:bg-[#faf9f6]"
                >
                  Clear & Start Over
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void saveAll()}
                  className="rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "Importing..." : "Complete Import"}
                </button>
              </div>
            </div>

            {message ? (
              <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
                <p className="text-sm font-bold text-emerald-800">{message}</p>
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl bg-rose-50 p-4 border border-rose-100">
                <pre className="whitespace-pre-wrap text-sm font-bold text-rose-800 font-sans">{error}</pre>
              </div>
            ) : null}

            <div className="overflow-auto rounded-xl border border-[#ebe4d9] max-h-[60vh]">
              <table className="min-w-[1800px] text-xs">
                <thead className="sticky top-0 bg-[#f5f0e6] text-[#2d3436] z-10 shadow-sm">
                  <tr>
                    <th className="w-8 border-b border-r border-[#ebe4d9] px-2 py-3 text-center">#</th>
                    <th className="w-8 border-b border-r border-[#ebe4d9] px-2 py-3 text-center">Stat</th>
                    {headers.map((h) => (
                      <th key={h.key} className="whitespace-nowrap border-b border-r border-[#ebe4d9] px-2 py-3 text-left font-black">
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const rowError = validationErrors[i];
                    return (
                      <tr key={i} className={`odd:bg-white even:bg-[#fcfaf6] ${rowError ? "bg-rose-50/50" : ""}`}>
                        <td className="border-b border-r border-[#ebe4d9] p-1 text-center font-bold text-[#b2bec3]">
                          {i + 1}
                        </td>
                        <td className="border-b border-r border-[#ebe4d9] p-1 text-center">
                          {rowError ? (
                            <div className="group relative flex justify-center">
                              <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 hidden group-hover:block w-48 rounded bg-[#2d3436] p-2 text-[10px] text-white shadow-lg z-20">
                                {rowError}
                              </div>
                            </div>
                          ) : (
                            <svg className="h-4 w-4 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </td>
                        {headers.map((h) => (
                          <td key={h.key} className="border-b border-r border-[#ebe4d9] p-1 relative">
                            {h.key === "dateOfBirth" ? (
                              <input
                                type="date"
                                value={r.dateOfBirth}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              />
                            ) : h.key === "parentEmail" ? (
                              <input
                                type="email"
                                value={r.parentEmail}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              />
                            ) : h.key === "parentPhone" ||
                              h.key === "guardianPhone" ||
                              h.key === "emergencyContactPhone" ? (
                              <input
                                type="tel"
                                minLength={10}
                                maxLength={13}
                                value={String(r[h.key] ?? "")}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d+]/g, '');
                                  updateCell(i, h.key, val);
                                }}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              />
                            ) : h.key === "gender" ? (
                              <select
                                value={r.gender}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              >
                                <option value="">Select</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Other">Other</option>
                              </select>
                            ) : h.key === "boardingStatus" ? (
                              <select
                                value={r.boardingStatus}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              >
                                <option value="">Select</option>
                                <option value="day_half">Day - Half day</option>
                                <option value="day_full">Day - Full day</option>
                                <option value="boarding">Boarding</option>
                              </select>
                            ) : h.key === "parentAliveStatus" ? (
                              <select
                                value={r.parentAliveStatus}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              >
                                <option value="">Select</option>
                                <option value="both">Both</option>
                                <option value="one">One</option>
                                <option value="none">None</option>
                              </select>

                            ) : h.key === "registrationType" ? (
                              <select
                                value={r.registrationType}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              >
                                <option value="first">First</option>
                                <option value="continuing">Continuing</option>
                              </select>
                            ) : h.key === "religion" ? (
                              <select
                                value={r.religion}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              >
                                <option value="">Select</option>
                                {religions.map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            ) : h.key === "classRoomId" ? (
                              <select
                                value={r.classRoomId}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              >
                                <option value="">Select</option>
                                {sortedRooms.map((rm) => (
                                  <option key={rm.id} value={String(rm.id)}>
                                    {rm.name}
                                    {rm.academicYear ? ` (${rm.academicYear})` : ""}
                                  </option>
                                ))}
                              </select>
                            ) : h.key === "countryCode" ? (
                              <select
                                value={r.countryCode}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              >
                                <option value="">Select</option>
                                {countries.map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            ) : h.key === "nationality" ? (
                              <select
                                value={r.nationality}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              >
                                <option value="">Select</option>
                                {nationalities.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={String(r[h.key] ?? "")}
                                onChange={(e) => updateCell(i, h.key, e.target.value)}
                                className={`w-full rounded border ${rowError?.includes(h.key) ? 'border-rose-400 bg-rose-50' : 'border-[#e0d8cc] bg-transparent'} px-2 py-1.5 outline-none focus:border-[#3498db]`}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-[#ebe4d9]">
              <button
                type="button"
                onClick={addRow}
                className="rounded-xl border-2 border-dashed border-[#ebe4d9] bg-white px-6 py-2.5 text-sm font-bold text-[#636e72] transition hover:border-[#b2bec3] hover:text-[#2d3436]"
              >
                + Add Empty Row
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
