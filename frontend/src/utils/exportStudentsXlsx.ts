import * as XLSX from "xlsx";
import type { StudentApiRow } from "../api/students";

export function exportStudentsToXlsx(
  rows: StudentApiRow[],
  filename: string,
  columnLabels: {
    admission: string;
    name: string;
    class: string;
    section: string;
    dob: string;
    admitted: string;
    nationality: string;
    country: string;
    district: string;
    registrationType: string;
  },
): void {
  const headers = [
    columnLabels.admission,
    columnLabels.name,
    columnLabels.class,
    columnLabels.section,
    columnLabels.dob,
    columnLabels.admitted,
    columnLabels.nationality,
    columnLabels.country,
    columnLabels.district,
    columnLabels.registrationType,
  ];
  const data = rows.map((r) => [
    r.admissionNumber,
    r.fullName,
    r.className ?? "",
    r.sectionName ?? "",
    r.dateOfBirthFormatted ?? "",
    r.admittedAt,
    r.nationality ?? "",
    r.countryName ?? r.countryCode ?? "",
    r.district ?? "",
    r.registrationType ?? "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}
