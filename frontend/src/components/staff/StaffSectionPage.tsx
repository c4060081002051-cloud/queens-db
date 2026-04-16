import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type StaffNavSection = "teaching" | "nonTeaching";
export type TeachingSection = "all" | "kindergarten" | "lower_primary" | "upper_primary";
export type NonTeachingCategory =
  | "all"
  | "administration"
  | "finance"
  | "library"
  | "health"
  | "operations";

type Teacher = {
  id: string;
  name: string;
  section: Exclude<TeachingSection, "all">;
  subjects: string;
};

type TeachingStaffRecord = Teacher & {
  phone?: string;
  email?: string;
  address?: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  maritalStatus?: string;
  nationalId?: string;
  qualification?: string;
  languages?: string;
  dateOfJoining?: string;
  experience?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  refereeName?: string;
  refereeContact?: string;
  staffPhotoUrl?: string;
  staffPhotoName?: string;
  assignedClass?: string;
};

type NonTeachingStaffRecord = {
  id: string;
  name: string;
  role: string;
  category: Exclude<NonTeachingCategory, "all">;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  nationalIdNumber?: string;
  nationalIdPhotoUrl?: string;
  nationalIdPhotoName?: string;
};

const TEACHERS: TeachingStaffRecord[] = [];

const NON_TEACHING_STAFF: NonTeachingStaffRecord[] = [];

const teachingSectionLabels: Record<TeachingSection, string> = {
  all: "All Teaching Staff",
  kindergarten: "Kindergarten Teachers",
  lower_primary: "Lower Primary Teachers",
  upper_primary: "Upper Primary Teachers",
};

const nonTeachingCategoryLabels: Record<NonTeachingCategory, string> = {
  all: "All Non-Teaching Staff",
  administration: "Administration Staff",
  finance: "Finance Staff",
  library: "Library Staff",
  health: "Health Staff",
  operations: "Operations Staff",
};

const inputClassName =
  "neo-inset-field w-full rounded-xl px-3 py-2 text-sm text-[#2d3436] placeholder:text-[#636e72]/70";

const classesByTeachingSection: Record<Exclude<TeachingSection, "all">, string[]> = {
  kindergarten: ["KG1", "KG2", "KG3"],
  lower_primary: ["P1", "P2", "P3"],
  upper_primary: ["P4", "P5", "P6", "P7"],
};

function FieldLabel({
  htmlFor,
  required = false,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-[#2d3436]">
      {children}
      {required ? <span className="text-[#c0392b]"> *</span> : null}
    </label>
  );
}

const staffActionsMenuItemClass =
  "flex w-full items-center px-3 py-2 text-left text-xs font-semibold text-[#2d3436] transition hover:bg-[#eef6f9]";

function StaffTableRowActionsMenu({
  rowKey,
  openMenuKey,
  onOpenMenuChange,
  onProfile,
  onEdit,
  onDelete,
}: {
  rowKey: string;
  openMenuKey: string | null;
  onOpenMenuChange: (key: string | null) => void;
  onProfile: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const open = openMenuKey === rowKey;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onOpenMenuChange(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenMenuChange(null);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenMenuChange]);

  return (
    <td className="px-4 py-3">
      <div className="relative flex justify-center" ref={wrapRef}>
        <button
          type="button"
          aria-label="Open row actions"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => onOpenMenuChange(open ? null : rowKey)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#faf7f0] text-xl font-bold leading-none text-[#636e72] ring-1 ring-[#ebe4d9] transition hover:bg-white"
        >
          <span className="block translate-y-px" aria-hidden>
            ⋮
          </span>
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-1 min-w-[10rem] rounded-xl border border-[#ebe4d9] bg-[#fffcf7] py-1 shadow-[0_8px_24px_rgba(45,52,54,0.12)] ring-1 ring-black/5"
          >
            <button
              type="button"
              role="menuitem"
              className={staffActionsMenuItemClass}
              onClick={() => {
                onProfile();
                onOpenMenuChange(null);
              }}
            >
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              className={staffActionsMenuItemClass}
              onClick={() => {
                onEdit();
                onOpenMenuChange(null);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${staffActionsMenuItemClass} text-[#a9332a]`}
              onClick={() => {
                onDelete();
                onOpenMenuChange(null);
              }}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </td>
  );
}

function TeachingStaffForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (staff: TeachingStaffRecord) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [selectedSection, setSelectedSection] =
    useState<Exclude<TeachingSection, "all">>("kindergarten");
  const [staffPhotoFile, setStaffPhotoFile] = useState<File | null>(null);

  return (
    <section className="neo-card p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#4a3f8f]">
        Teaching Staff Registration Form
      </h2>
      <p className="mt-1 text-xs text-[#636e72]">
        Fill in all required fields marked with an asterisk (*).
      </p>

      <form
        className="mt-4 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const section = form.get("staff-teaching-section") as Exclude<TeachingSection, "all">;
          const assignedClass = (form.get("staff-assigned-class") as string) ?? "";
          const fullName = ((form.get("staff-full-name") as string) ?? "").trim();
          const role = ((form.get("staff-role") as string) ?? "").trim();
          const staffPhotoUrl = staffPhotoFile ? URL.createObjectURL(staffPhotoFile) : undefined;
          onSave({
            id: `T-${Math.floor(Math.random() * 9000 + 1000)}`,
            name: fullName,
            section,
            assignedClass,
            subjects: role || "General Teacher",
            phone: ((form.get("staff-phone") as string) ?? "").trim(),
            email: ((form.get("staff-email") as string) ?? "").trim(),
            address: ((form.get("staff-address") as string) ?? "").trim(),
            gender: ((form.get("staff-gender") as string) ?? "").trim(),
            dateOfBirth: ((form.get("staff-dob") as string) ?? "").trim(),
            nationality: ((form.get("staff-nationality") as string) ?? "").trim(),
            maritalStatus: ((form.get("staff-marital-status") as string) ?? "").trim(),
            nationalId: ((form.get("staff-nin") as string) ?? "").trim(),
            qualification: ((form.get("staff-qualification") as string) ?? "").trim(),
            languages: ((form.get("staff-languages") as string) ?? "").trim(),
            dateOfJoining: ((form.get("staff-joining-date") as string) ?? "").trim(),
            experience: ((form.get("staff-experience") as string) ?? "").trim(),
            emergencyContactName: ((form.get("staff-emergency-name") as string) ?? "").trim(),
            emergencyContactPhone: ((form.get("staff-emergency-phone") as string) ?? "").trim(),
            refereeName: ((form.get("staff-referee-name") as string) ?? "").trim(),
            refereeContact: ((form.get("staff-referee-contact") as string) ?? "").trim(),
            staffPhotoName: staffPhotoFile?.name,
            staffPhotoUrl,
          });
          setSubmitted(true);
          e.currentTarget.reset();
          setSelectedSection("kindergarten");
          setStaffPhotoFile(null);
        }}
      >
        <div>
          <h3 className="text-sm font-bold text-[#4a3f8f]">1. Personal Identification</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="staff-full-name" required>Full Name (As per ID)</FieldLabel>
              <input id="staff-full-name" name="staff-full-name" required className={inputClassName} />
            </div>
            <div>
              <FieldLabel htmlFor="staff-gender" required>Gender</FieldLabel>
              <select id="staff-gender" name="staff-gender" required className={inputClassName} defaultValue="">
                <option value="" disabled>Select</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="staff-dob" required>Date of Birth</FieldLabel>
              <input id="staff-dob" name="staff-dob" type="date" required className={inputClassName} />
            </div>
            <div>
              <FieldLabel htmlFor="staff-nationality" required>Nationality</FieldLabel>
              <select id="staff-nationality" name="staff-nationality" required className={inputClassName} defaultValue="">
                <option value="" disabled>Select</option>
                <option>Ugandan</option>
                <option>Kenyan</option>
                <option>Tanzanian</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="staff-marital-status">Marital Status</FieldLabel>
              <select id="staff-marital-status" name="staff-marital-status" className={inputClassName} defaultValue="">
                <option value="" disabled>Select</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="staff-nin">National ID Number (NIN)</FieldLabel>
              <input id="staff-nin" name="staff-nin" placeholder="Optional" className={inputClassName} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#4a3f8f]">2. Contact Information</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="staff-phone" required>Primary Phone Number</FieldLabel>
              <input id="staff-phone" name="staff-phone" required className={inputClassName} />
            </div>
            <div>
              <FieldLabel htmlFor="staff-email">Email Address</FieldLabel>
              <input id="staff-email" name="staff-email" type="email" placeholder="e.g. example@domain.com" className={inputClassName} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="staff-photo-upload">Staff Photo</FieldLabel>
              <label className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#e8f2fa] to-[#cde8cf] px-4 py-2 text-xs font-semibold text-[#2d3436] shadow-sm">
                Upload photo
                <input
                  id="staff-photo-upload"
                  name="staff-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setStaffPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {staffPhotoFile ? (
                <p className="mt-1 text-xs text-[#636e72]">{staffPhotoFile.name}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="staff-address" required>Current Physical Address</FieldLabel>
              <input id="staff-address" name="staff-address" required placeholder="Street address, city, district" className={inputClassName} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#4a3f8f]">3. Professional Background</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel htmlFor="staff-role" required>Role / Applied Position</FieldLabel>
              <input id="staff-role" name="staff-role" required placeholder="e.g. Senior Math Teacher" className={inputClassName} />
            </div>
            <div>
              <FieldLabel htmlFor="staff-qualification" required>Highest Qualification</FieldLabel>
              <input id="staff-qualification" name="staff-qualification" required placeholder="e.g. Bachelor&apos;s in Education" className={inputClassName} />
            </div>
            <div>
              <FieldLabel htmlFor="staff-languages">Languages Spoken</FieldLabel>
              <input id="staff-languages" name="staff-languages" placeholder="English, Kiswahili..." className={inputClassName} />
            </div>
            <div>
              <FieldLabel htmlFor="staff-joining-date" required>Date of Joining</FieldLabel>
              <input id="staff-joining-date" name="staff-joining-date" type="date" required className={inputClassName} />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <FieldLabel htmlFor="staff-experience">Previous Work Experience</FieldLabel>
              <textarea
                id="staff-experience"
                name="staff-experience"
                rows={4}
                placeholder="Summarize total years of experience, relevant past employment, and responsibilities."
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#4a3f8f]">4. Assign Class</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="staff-teaching-section" required>Teaching Category</FieldLabel>
              <select
                id="staff-teaching-section"
                name="staff-teaching-section"
                value={selectedSection}
                onChange={(e) =>
                  setSelectedSection(e.target.value as Exclude<TeachingSection, "all">)
                }
                required
                className={inputClassName}
              >
                <option value="kindergarten">Kindergarten</option>
                <option value="lower_primary">Lower Primary</option>
                <option value="upper_primary">Upper Primary</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="staff-assigned-class" required>Assigned Class</FieldLabel>
              <select
                id="staff-assigned-class"
                name="staff-assigned-class"
                required
                className={inputClassName}
                defaultValue=""
              >
                <option value="" disabled>Select class</option>
                {classesByTeachingSection[selectedSection].map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#4a3f8f]">5. Emergency Contact &amp; Reference</h3>
          <div className="mt-3 grid gap-3 rounded-xl bg-[#eef4fa] p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel htmlFor="staff-emergency-name" required>Emergency Contact Name</FieldLabel>
              <input id="staff-emergency-name" name="staff-emergency-name" required className={inputClassName} />
            </div>
            <div>
              <FieldLabel htmlFor="staff-emergency-phone" required>Emergency Contact Phone</FieldLabel>
              <input id="staff-emergency-phone" name="staff-emergency-phone" required className={inputClassName} />
            </div>
            <div>
              <FieldLabel htmlFor="staff-referee-name" required>Professional Referee Name</FieldLabel>
              <input id="staff-referee-name" name="staff-referee-name" required className={inputClassName} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="staff-referee-contact" required>Referee Contact Info</FieldLabel>
              <input id="staff-referee-contact" name="staff-referee-contact" required placeholder="Phone or email" className={inputClassName} />
            </div>
          </div>
        </div>

        {submitted ? (
          <p className="text-xs font-semibold text-[#4a6b4e]">
            Form submitted. (Demo mode: no backend save yet.)
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-full bg-gradient-to-br from-[#cde8cf] to-[#8fb892] px-5 py-2 text-xs font-bold text-[#2d3436] shadow-[3px_3px_6px_rgba(120,150,125,0.3),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:brightness-105"
          >
            Save Staff
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-5 py-2 text-xs font-semibold text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function NonTeachingStaffForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (staff: NonTeachingStaffRecord) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [nationalIdPhotoFile, setNationalIdPhotoFile] = useState<File | null>(null);

  return (
    <section className="neo-card p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#4a3f8f]">
        Non-Teaching Staff Registration Form
      </h2>
      <p className="mt-1 text-xs text-[#636e72]">
        Fill in all required fields marked with an asterisk (*).
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          onSave({
            id: `N-${Math.floor(Math.random() * 9000 + 1000)}`,
            name: ((form.get("nonstaff-full-name") as string) ?? "").trim(),
            role: ((form.get("nonstaff-role") as string) ?? "").trim(),
            category: (form.get("nonstaff-category") as Exclude<NonTeachingCategory, "all">) ?? "administration",
            email: ((form.get("nonstaff-email") as string) ?? "").trim(),
            phone: ((form.get("nonstaff-phone") as string) ?? "").trim(),
            address: ((form.get("nonstaff-address") as string) ?? "").trim(),
            emergencyContactName: ((form.get("nonstaff-emergency-name") as string) ?? "").trim(),
            emergencyContactPhone: ((form.get("nonstaff-emergency-phone") as string) ?? "").trim(),
            nationalIdNumber: ((form.get("nonstaff-national-id-number") as string) ?? "").trim(),
            nationalIdPhotoName: nationalIdPhotoFile?.name,
            nationalIdPhotoUrl: nationalIdPhotoFile
              ? URL.createObjectURL(nationalIdPhotoFile)
              : undefined,
          });
          setSubmitted(true);
          e.currentTarget.reset();
          setNationalIdPhotoFile(null);
        }}
      >
        <div>
          <FieldLabel htmlFor="nonstaff-full-name" required>Full Name</FieldLabel>
          <input id="nonstaff-full-name" name="nonstaff-full-name" required className={inputClassName} />
        </div>
        <div>
          <FieldLabel htmlFor="nonstaff-category" required>Category</FieldLabel>
          <select id="nonstaff-category" name="nonstaff-category" required className={inputClassName} defaultValue="">
            <option value="" disabled>Select category</option>
            <option value="administration">Administration</option>
            <option value="finance">Finance</option>
            <option value="library">Library</option>
            <option value="health">Health</option>
            <option value="operations">Operations</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="nonstaff-role" required>Role</FieldLabel>
          <input id="nonstaff-role" name="nonstaff-role" required className={inputClassName} />
        </div>
        <div>
          <FieldLabel htmlFor="nonstaff-email">Email Address</FieldLabel>
          <input id="nonstaff-email" name="nonstaff-email" type="email" className={inputClassName} />
        </div>
        <div>
          <FieldLabel htmlFor="nonstaff-phone" required>Primary Phone Number</FieldLabel>
          <input id="nonstaff-phone" name="nonstaff-phone" required className={inputClassName} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="nonstaff-address" required>Current Physical Address</FieldLabel>
          <input id="nonstaff-address" name="nonstaff-address" required className={inputClassName} />
        </div>
        <div>
          <FieldLabel htmlFor="nonstaff-emergency-name" required>Emergency Contact Name</FieldLabel>
          <input id="nonstaff-emergency-name" name="nonstaff-emergency-name" required className={inputClassName} />
        </div>
        <div>
          <FieldLabel htmlFor="nonstaff-emergency-phone" required>Emergency Contact Phone</FieldLabel>
          <input id="nonstaff-emergency-phone" name="nonstaff-emergency-phone" required className={inputClassName} />
        </div>
        <div>
          <FieldLabel htmlFor="nonstaff-national-id-number" required>National ID Number</FieldLabel>
          <input id="nonstaff-national-id-number" name="nonstaff-national-id-number" required className={inputClassName} />
        </div>
        <div>
          <FieldLabel htmlFor="nonstaff-national-id-photo" required>National ID Photo</FieldLabel>
          <label className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#e8f2fa] to-[#cde8cf] px-4 py-2 text-xs font-semibold text-[#2d3436] shadow-sm">
            Upload NID photo
            <input
              id="nonstaff-national-id-photo"
              name="nonstaff-national-id-photo"
              type="file"
              accept="image/*"
              required
              className="hidden"
              onChange={(e) => setNationalIdPhotoFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {nationalIdPhotoFile ? (
            <p className="mt-1 text-xs text-[#636e72]">{nationalIdPhotoFile.name}</p>
          ) : null}
        </div>
        {submitted ? (
          <p className="sm:col-span-2 text-xs font-semibold text-[#4a6b4e]">
            Form submitted. (Demo mode: no backend save yet.)
          </p>
        ) : null}
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-full bg-gradient-to-br from-[#cde8cf] to-[#8fb892] px-5 py-2 text-xs font-bold text-[#2d3436] shadow-[3px_3px_6px_rgba(120,150,125,0.3),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:brightness-105"
          >
            Save Non Staff
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-5 py-2 text-xs font-semibold text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export function StaffSectionPage({
  section,
  teachingSection,
  nonTeachingCategory,
  onChangeTeachingSection,
  onChangeNonTeachingCategory,
}: {
  section: StaffNavSection;
  teachingSection: TeachingSection;
  nonTeachingCategory: NonTeachingCategory;
  onChangeTeachingSection: (value: TeachingSection) => void;
  onChangeNonTeachingCategory: (value: NonTeachingCategory) => void;
}) {
  const [showTeachingForm, setShowTeachingForm] = useState(false);
  const [showNonTeachingForm, setShowNonTeachingForm] = useState(false);
  const [teachingStaff, setTeachingStaff] = useState<TeachingStaffRecord[]>(TEACHERS);
  const [nonTeachingStaff, setNonTeachingStaff] =
    useState<NonTeachingStaffRecord[]>(NON_TEACHING_STAFF);
  const [selectedTeachingProfile, setSelectedTeachingProfile] =
    useState<TeachingStaffRecord | null>(null);
  const [selectedNonTeachingProfile, setSelectedNonTeachingProfile] =
    useState<NonTeachingStaffRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "teaching" | "nonTeaching";
    item: TeachingStaffRecord | NonTeachingStaffRecord;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "teaching" | "nonTeaching";
    item: TeachingStaffRecord | NonTeachingStaffRecord;
  } | null>(null);
  const [staffRowActionsMenuKey, setStaffRowActionsMenuKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingDelete) return;
    const timer = window.setTimeout(() => {
      if (pendingDelete.kind === "teaching") {
        const item = pendingDelete.item as TeachingStaffRecord;
        setTeachingStaff((prev) => prev.filter((x) => x.id !== item.id));
        setSelectedTeachingProfile((curr) => (curr?.id === item.id ? null : curr));
      } else {
        const item = pendingDelete.item as NonTeachingStaffRecord;
        setNonTeachingStaff((prev) => prev.filter((x) => x.id !== item.id));
        setSelectedNonTeachingProfile((curr) => (curr?.id === item.id ? null : curr));
      }
      setPendingDelete(null);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [pendingDelete]);
  const heading =
    section === "teaching"
      ? teachingSectionLabels[teachingSection]
      : nonTeachingCategoryLabels[nonTeachingCategory];

  const intro =
    section === "teaching"
      ? "Browse teachers by class section. Use the dropdown to switch between Kindergarten, Lower Primary, and Upper Primary teachers."
      : "School support teams and administrative staff.";

  const filteredTeachers = useMemo(() => {
    if (teachingSection === "all") return teachingStaff;
    return teachingStaff.filter((teacher) => teacher.section === teachingSection);
  }, [teachingSection, teachingStaff]);
  const filteredNonTeaching = useMemo(() => {
    if (nonTeachingCategory === "all") return nonTeachingStaff;
    return nonTeachingStaff.filter((member) => member.category === nonTeachingCategory);
  }, [nonTeachingCategory, nonTeachingStaff]);

  return (
    <div className="min-w-0 space-y-6">
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#2d3436]/40 backdrop-blur-[2px]"
            onClick={() => setConfirmDelete(null)}
            aria-label="Close warning dialog"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#f7d1cd] bg-[#fffcf7] p-5 shadow-[8px_12px_40px_rgba(45,52,54,0.2)]">
            <h3 className="text-base font-bold text-[#a9332a]">Warning</h3>
            <p className="mt-2 text-sm text-[#2d3436]">
              This will delete the selected record. You will have 10 seconds to undo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-full bg-[#faf7f0] px-4 py-1.5 text-xs font-semibold text-[#636e72] ring-1 ring-[#ebe4d9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingDelete(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="rounded-full bg-[#fce8e5] px-4 py-1.5 text-xs font-bold text-[#a9332a]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <header className="border-b border-[#ebe4d9]/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{heading}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#636e72]">{intro}</p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              if (section === "teaching") {
                setShowTeachingForm((v) => !v);
                setShowNonTeachingForm(false);
              } else {
                setShowNonTeachingForm((v) => !v);
                setShowTeachingForm(false);
              }
            }}
            className="rounded-full bg-gradient-to-br from-[#cde8cf] to-[#8fb892] px-4 py-2 text-xs font-bold text-[#2d3436] shadow-[3px_3px_6px_rgba(120,150,125,0.3),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:brightness-105"
          >
            {section === "teaching" ? "Add Staff" : "Add Non Staff"}
          </button>
        </div>
      </header>

      {pendingDelete ? (
        <div className="neo-card flex items-center justify-between gap-3 border border-[#f7d1cd] bg-[#fff7f5] px-4 py-3">
          <p className="text-sm text-[#2d3436]">
            Staff deleted. You can undo this action for 10 seconds.
          </p>
          <button
            type="button"
            onClick={() => setPendingDelete(null)}
            className="rounded-full bg-[#2d3436] px-4 py-1.5 text-xs font-bold text-white"
          >
            Undo
          </button>
        </div>
      ) : null}
      {section === "teaching" ? (
        <>
          {showTeachingForm ? (
            <TeachingStaffForm
              onCancel={() => setShowTeachingForm(false)}
              onSave={(staff) => {
                setTeachingStaff((prev) => [staff, ...prev]);
                setSelectedTeachingProfile(staff);
              }}
            />
          ) : null}
          {showTeachingForm || selectedTeachingProfile ? null : (
          <div className="neo-card max-w-md p-4">
            <label
              htmlFor="teaching-section-select"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#636e72]"
            >
              Teaching Section
            </label>
            <select
              id="teaching-section-select"
              value={teachingSection}
              onChange={(e) => onChangeTeachingSection(e.target.value as TeachingSection)}
              className="neo-inset-field w-full rounded-xl px-3 py-2 text-sm text-[#2d3436]"
            >
              <option value="all">All Teaching Staff</option>
              <option value="kindergarten">Kindergarten Teachers</option>
              <option value="lower_primary">Lower Primary Teachers</option>
              <option value="upper_primary">Upper Primary Teachers</option>
            </select>
          </div>
          )}

          {showTeachingForm || selectedTeachingProfile ? null : (
          <section className="neo-card overflow-visible">
            <div className="border-b border-[#ebe4d9]/80 px-4 py-3 text-sm font-semibold text-[#2d3436]">
              {teachingSectionLabels[teachingSection]}
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#ebe4d9]/80 bg-[#faf7f0]/80 text-xs uppercase tracking-wide text-[#636e72]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Subjects/Role</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe4d9]/70">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="px-4 py-3 font-semibold text-[#2d3436]">{teacher.name}</td>
                    <td className="px-4 py-3 text-xs text-[#636e72]">{teacher.subjects}</td>
                    <td className="px-4 py-3 text-xs text-[#2d3436]">{teacher.assignedClass ?? "—"}</td>
                    <StaffTableRowActionsMenu
                      rowKey={`teaching:${teacher.id}`}
                      openMenuKey={staffRowActionsMenuKey}
                      onOpenMenuChange={setStaffRowActionsMenuKey}
                      onProfile={() => setSelectedTeachingProfile(teacher)}
                      onEdit={() => {
                        const next = window.prompt("Edit teacher name", teacher.name);
                        if (!next?.trim()) return;
                        setTeachingStaff((prev) =>
                          prev.map((x) => (x.id === teacher.id ? { ...x, name: next.trim() } : x)),
                        );
                      }}
                      onDelete={() => setConfirmDelete({ kind: "teaching", item: teacher })}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          )}
          {showTeachingForm || !selectedTeachingProfile ? null : (
            <section className="neo-card overflow-hidden border border-[#dce8dd] bg-gradient-to-br from-[#fffdf9] via-[#f7fbf8] to-[#eef6f2] p-0">
              <div className="flex items-start justify-between gap-3">
                <div className="w-full border-b border-[#e4eee5] px-4 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">Teaching Staff Profile Card</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTeachingProfile(null)}
                  className="mr-3 mt-3 rounded-full bg-[#faf7f0] px-3 py-1 text-xs font-semibold text-[#636e72] ring-1 ring-[#ebe4d9] transition hover:bg-white"
                >
                  Close
                </button>
              </div>
              <div className="px-4 pb-4 pt-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/75 p-3 ring-1 ring-[#e5ede6]">
                <img src={selectedTeachingProfile.staffPhotoUrl ?? "/school-badge.png"} alt="Staff profile" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-[#d6e3d7]" />
                <div>
                  <p className="text-base font-bold text-[#2d3436]">{selectedTeachingProfile.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#636e72]">
                    {teachingSectionLabels[selectedTeachingProfile.section]}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Assigned Class:</span> {selectedTeachingProfile.assignedClass ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Role/Subjects:</span> {selectedTeachingProfile.subjects}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Phone:</span> {selectedTeachingProfile.phone ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Email:</span> {selectedTeachingProfile.email ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Gender:</span> {selectedTeachingProfile.gender ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Date of Birth:</span> {selectedTeachingProfile.dateOfBirth ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Nationality:</span> {selectedTeachingProfile.nationality ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Marital Status:</span> {selectedTeachingProfile.maritalStatus ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">National ID:</span> {selectedTeachingProfile.nationalId ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Qualification:</span> {selectedTeachingProfile.qualification ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Languages:</span> {selectedTeachingProfile.languages ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Date of Joining:</span> {selectedTeachingProfile.dateOfJoining ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Emergency Contact Name:</span> {selectedTeachingProfile.emergencyContactName ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Emergency Contact Phone:</span> {selectedTeachingProfile.emergencyContactPhone ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Referee Name:</span> {selectedTeachingProfile.refereeName ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Referee Contact:</span> {selectedTeachingProfile.refereeContact ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Staff Photo:</span> {selectedTeachingProfile.staffPhotoName ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2 sm:col-span-2"><span className="font-semibold text-[#636e72]">Address:</span> {selectedTeachingProfile.address ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2 sm:col-span-2"><span className="font-semibold text-[#636e72]">Experience:</span> {selectedTeachingProfile.experience ?? "—"}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#dde9df] pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt("Edit staff name", selectedTeachingProfile.name);
                    if (!next?.trim()) return;
                    setTeachingStaff((prev) =>
                      prev.map((x) =>
                        x.id === selectedTeachingProfile.id ? { ...x, name: next.trim() } : x,
                      ),
                    );
                    setSelectedTeachingProfile((curr) =>
                      curr ? { ...curr, name: next.trim() } : curr,
                    );
                  }}
                  className="rounded-full bg-[#e8f2fa] px-4 py-1.5 text-xs font-semibold text-[#2d3436]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete({ kind: "teaching", item: selectedTeachingProfile });
                  }}
                  className="rounded-full bg-[#fce8e5] px-4 py-1.5 text-xs font-semibold text-[#a9332a]"
                >
                  Delete
                </button>
              </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {showNonTeachingForm ? (
            <NonTeachingStaffForm
              onCancel={() => setShowNonTeachingForm(false)}
              onSave={(staff) => {
                setNonTeachingStaff((prev) => [staff, ...prev]);
                setSelectedNonTeachingProfile(staff);
              }}
            />
          ) : null}
          {showNonTeachingForm || selectedNonTeachingProfile ? null : (
          <div className="neo-card max-w-md p-4">
            <label
              htmlFor="non-teaching-category-select"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#636e72]"
            >
              Non-Teaching Category
            </label>
            <select
              id="non-teaching-category-select"
              value={nonTeachingCategory}
              onChange={(e) =>
                onChangeNonTeachingCategory(e.target.value as NonTeachingCategory)
              }
              className="neo-inset-field w-full rounded-xl px-3 py-2 text-sm text-[#2d3436]"
            >
              <option value="all">All Non-Teaching Staff</option>
              <option value="administration">Administration Staff</option>
              <option value="finance">Finance Staff</option>
              <option value="library">Library Staff</option>
              <option value="health">Health Staff</option>
              <option value="operations">Operations Staff</option>
            </select>
          </div>
          )}
          {showNonTeachingForm || selectedNonTeachingProfile ? null : (
          <section className="neo-card overflow-visible">
            <div className="border-b border-[#ebe4d9]/80 px-4 py-3 text-sm font-semibold text-[#2d3436]">
              {nonTeachingCategoryLabels[nonTeachingCategory]}
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#ebe4d9]/80 bg-[#faf7f0]/80 text-xs uppercase tracking-wide text-[#636e72]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe4d9]/70">
                {filteredNonTeaching.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-semibold text-[#2d3436]">{member.name}</td>
                    <td className="px-4 py-3 text-xs text-[#636e72]">{member.role}</td>
                    <td className="px-4 py-3 text-xs text-[#2d3436]">{nonTeachingCategoryLabels[member.category]}</td>
                    <StaffTableRowActionsMenu
                      rowKey={`nonTeaching:${member.id}`}
                      openMenuKey={staffRowActionsMenuKey}
                      onOpenMenuChange={setStaffRowActionsMenuKey}
                      onProfile={() => setSelectedNonTeachingProfile(member)}
                      onEdit={() => {
                        const next = window.prompt("Edit staff name", member.name);
                        if (!next?.trim()) return;
                        setNonTeachingStaff((prev) =>
                          prev.map((x) => (x.id === member.id ? { ...x, name: next.trim() } : x)),
                        );
                      }}
                      onDelete={() => setConfirmDelete({ kind: "nonTeaching", item: member })}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          )}
          {showNonTeachingForm || !selectedNonTeachingProfile ? null : (
            <section className="neo-card overflow-hidden border border-[#dce8dd] bg-gradient-to-br from-[#fffdf9] via-[#f7fbf8] to-[#eef6f2] p-0">
              <div className="flex items-start justify-between gap-3">
                <div className="w-full border-b border-[#e4eee5] px-4 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">Non-Teaching Staff Profile Card</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNonTeachingProfile(null)}
                  className="mr-3 mt-3 rounded-full bg-[#faf7f0] px-3 py-1 text-xs font-semibold text-[#636e72] ring-1 ring-[#ebe4d9] transition hover:bg-white"
                >
                  Close
                </button>
              </div>
              <div className="px-4 pb-4 pt-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/75 p-3 ring-1 ring-[#e5ede6]">
                <img src={selectedNonTeachingProfile.nationalIdPhotoUrl ?? "/school-badge.png"} alt="Staff profile" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-[#d6e3d7]" />
                <div>
                  <p className="text-base font-bold text-[#2d3436]">{selectedNonTeachingProfile.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#636e72]">
                    {nonTeachingCategoryLabels[selectedNonTeachingProfile.category]}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Role:</span> {selectedNonTeachingProfile.role}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Category:</span> {nonTeachingCategoryLabels[selectedNonTeachingProfile.category]}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Email:</span> {selectedNonTeachingProfile.email ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Phone:</span> {selectedNonTeachingProfile.phone ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Emergency Contact Name:</span> {selectedNonTeachingProfile.emergencyContactName ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">Emergency Contact Phone:</span> {selectedNonTeachingProfile.emergencyContactPhone ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">National ID Number:</span> {selectedNonTeachingProfile.nationalIdNumber ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">National ID Photo:</span> {selectedNonTeachingProfile.nationalIdPhotoName ?? "—"}</p>
                <p className="rounded-xl bg-white/80 px-3 py-2 sm:col-span-2"><span className="font-semibold text-[#636e72]">Address:</span> {selectedNonTeachingProfile.address ?? "—"}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#dde9df] pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt("Edit staff name", selectedNonTeachingProfile.name);
                    if (!next?.trim()) return;
                    setNonTeachingStaff((prev) =>
                      prev.map((x) =>
                        x.id === selectedNonTeachingProfile.id ? { ...x, name: next.trim() } : x,
                      ),
                    );
                    setSelectedNonTeachingProfile((curr) =>
                      curr ? { ...curr, name: next.trim() } : curr,
                    );
                  }}
                  className="rounded-full bg-[#e8f2fa] px-4 py-1.5 text-xs font-semibold text-[#2d3436]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete({ kind: "nonTeaching", item: selectedNonTeachingProfile });
                  }}
                  className="rounded-full bg-[#fce8e5] px-4 py-1.5 text-xs font-semibold text-[#a9332a]"
                >
                  Delete
                </button>
              </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
