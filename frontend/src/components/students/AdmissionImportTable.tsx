import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  fetchCountries,
  fetchNationalities,
  type CountryOption,
} from "../../api/geo";
import {
  createStudent,
  fetchClassrooms,
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
  { key: "dateOfBirth", label: "DOB (YYYY-MM-DD)" },
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
      const v = vals[idx] ?? "";
      if (c) {
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
      const v = vals[idx] ?? "";
      if (c) {
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
  const template = useMemo(() => headers.map((h) => h.key).join(","), []);
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
      if (!String(r[key] ?? "").trim()) return `${String(key)} is required`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.dateOfBirth.trim())) {
      return "dateOfBirth must be YYYY-MM-DD";
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
    let created = 0;
    const assignedAdmissionNumbers: string[] = [];
    const failures: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const rowError = validateRow(r);
        if (rowError) {
          failures.push(`Row ${i + 1}: ${rowError}`);
          continue;
        }
        const classRoomNum = classIdFromRow(r);
        const body: CreateStudentBody = {
          firstName: r.firstName.trim(),
          middleName: r.middleName.trim() || undefined,
          lastName: r.lastName.trim(),
          dateOfBirth: r.dateOfBirth.trim() || undefined,
          gender: r.gender.trim() || undefined,
          classRoomId: classRoomNum,
          sectionName: r.sectionName.trim() || undefined,
          nationality: r.nationality.trim() || undefined,
          countryCode: r.countryCode.trim() || undefined,
          district: r.district.trim() || undefined,
          religion: r.religion.trim() || undefined,
          registrationType: r.registrationType,
          parentAliveStatus: (r.parentAliveStatus || undefined) as
            | "both"
            | "one"
            | "none"
            | undefined,
          parentFullName: r.parentFullName.trim() || undefined,
          parentPhone: r.parentPhone.trim() || undefined,
          parentEmail: r.parentEmail.trim() || undefined,
          parentAddress: r.parentAddress.trim() || undefined,
          guardianName: r.guardianName.trim() || undefined,
          guardianPhone: r.guardianPhone.trim() || undefined,
          emergencyContactName: r.emergencyContactName.trim() || undefined,
          emergencyContactPhone: r.emergencyContactPhone.trim() || undefined,
          boardingStatus: (r.boardingStatus || undefined) as
            | "boarding"
            | "day_half"
            | "day_full"
            | undefined,
          specialNeeds: r.specialNeeds.trim() || undefined,
          residenceAddress: r.residenceAddress.trim() || undefined,
          medicalInfo: r.medicalInfo.trim() || undefined,
        };
        const createdStudent = await createStudent(body);
        const admissionNumber = createdStudent.admissionNumber?.trim();
        if (!admissionNumber) {
          failures.push(`Row ${i + 1}: admission number was not assigned`);
          continue;
        }
        assignedAdmissionNumbers.push(admissionNumber);
        created += 1;
      } catch (e) {
        failures.push(`Row ${i + 1}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }
    setBusy(false);
    const assignedPreview =
      assignedAdmissionNumbers.length > 0
        ? ` Admission numbers: ${assignedAdmissionNumbers.slice(0, 8).join(", ")}${
            assignedAdmissionNumbers.length > 8 ? "..." : ""
          }`
        : "";
    setMessage(`Saved ${created} row(s).${assignedPreview}`);
    setError(failures.length > 0 ? failures.slice(0, 8).join("\n") : null);
    if (created > 0) onDone();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ebe4d9] bg-[#fffcf7] shadow-[6px_8px_24px_rgba(45,52,54,0.08)]">
      <div className="border-b border-[#ebe4d9] bg-gradient-to-r from-[#f8f9f6] to-[#eef6f9] px-5 py-4">
        <h2 className="text-base font-bold text-[#2d3436]">{t("students.import.title")}</h2>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xs text-[#636e72]">{t("students.import.hint")}</p>
        <p className="text-[11px] text-[#636e72]">
          Template headers (for CSV/Excel first row): <code>{template}</code>
        </p>
        {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
        {error ? <pre className="whitespace-pre-wrap text-xs text-rose-800">{error}</pre> : null}
        <div className="flex flex-wrap gap-2">
          <label className="rounded-full bg-gradient-to-br from-[#5a8faf] to-[#3d6d8a] px-4 py-2 text-xs font-bold text-white">
            {t("students.import.button")}
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
          <button
            type="button"
            onClick={addRow}
            className="rounded-full bg-gradient-to-br from-[#ebe4d9] to-[#d9d0c2] px-4 py-2 text-xs font-bold text-[#2d3436]"
          >
            {t("students.import.addRow")}
          </button>
          <button
            type="button"
            disabled={busy || rows.length === 0}
            onClick={() => void saveAll()}
            className="rounded-full bg-gradient-to-br from-[#6a9570] to-[#4a6b4e] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? t("students.import.saving") : t("students.import.save")}
          </button>
        </div>
        <div className="overflow-auto rounded-xl border border-[#ebe4d9]">
          <table className="min-w-[1800px] text-xs">
            <thead className="bg-[#f5f0e6] text-[#2d3436]">
              <tr>
                {headers.map((h) => (
                  <th key={h.key} className="whitespace-nowrap border-b border-r border-[#ebe4d9] px-2 py-2 text-left">
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-[#fcfaf6]">
                  {headers.map((h) => (
                    <td key={h.key} className="border-b border-r border-[#ebe4d9] p-1">
                      {h.key === "dateOfBirth" ? (
                        <input
                          type="date"
                          value={r.dateOfBirth}
                          onChange={(e) => updateCell(i, h.key, e.target.value)}
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
                        />
                      ) : h.key === "parentEmail" ? (
                        <input
                          type="email"
                          value={r.parentEmail}
                          onChange={(e) => updateCell(i, h.key, e.target.value)}
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
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
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
                        />
                      ) : h.key === "gender" ? (
                        <select
                          value={r.gender}
                          onChange={(e) => updateCell(i, h.key, e.target.value)}
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
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
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
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
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
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
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
                        >
                          <option value="first">First</option>
                          <option value="continuing">Continuing</option>
                        </select>
                      ) : h.key === "religion" ? (
                        <select
                          value={r.religion}
                          onChange={(e) => updateCell(i, h.key, e.target.value)}
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
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
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
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
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
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
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
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
                          className="w-full rounded border border-[#e0d8cc] bg-[#faf9f7] px-2 py-1 outline-none"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-3 py-6 text-center text-[#636e72]">
                    {t("students.import.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
