import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchRolePermissions,
  fetchUserPermissions,
  updateRolePermissions,
  updateRolePermissionsBulk,
  updateUserPermissionOverrides,
} from "../../api/settings";
import {
  adminResetManagedUserPassword,
  createManagedUser,
  deleteManagedUser,
  fetchManagedUsers,
  type ManagedUser,
  updateManagedUserProfile,
  updateManagedUserStatus,
} from "../../api/account";
import {
  fetchClassrooms,
  fetchClassSections,
  fetchStaffMembers,
  updateStaffMember,
  type ClassRoomOption,
  type ClassSectionOption,
  type StaffMemberApiRow,
} from "../../api/students";
import {
  groupAvailableKeysBySector,
  orphanPermissionKeys,
  PERMISSION_DETAILS,
} from "./permissionCatalog";

type UserRoleOption = {
  id:
    | "admin"
    | "accountant"
    | "head_teacher"
    | "teacher"
    | "registrar"
    | "staff"
    | "student"
    | "parent";
  label: string;
  description: string;
};

const ROLE_OPTIONS: UserRoleOption[] = [
  {
    id: "admin",
    label: "admin",
    description: "Full school control and top-level system administration.",
  },
  {
    id: "accountant",
    label: "accountant",
    description: "Handles finance, payments, expenses, payroll, and bursary workflows.",
  },
  {
    id: "head_teacher",
    label: "head_teacher",
    description: "Oversees academic activity, teaching performance, and school learning records.",
  },
  {
    id: "teacher",
    label: "teacher",
    description: "Manages assigned classes, attendance, marks, and learner records.",
  },
  {
    id: "registrar",
    label: "registrar",
    description: "Manages admissions, student profiles, and parent-linked records.",
  },
  {
    id: "staff",
    label: "staff",
    description: "General internal access for approved non-teaching staff operations.",
  },
  {
    id: "student",
    label: "student",
    description: "Own-profile access for learner dashboards and school self-service.",
  },
  {
    id: "parent",
    label: "parent",
    description: "Parent/guardian access for linked children, fees, and communication.",
  },
];

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function SettingsUsersRolesPanel() {
  const [view, setView] = useState<"list" | "add" | "permissions">("list");
  const [permissionMode, setPermissionMode] = useState<"role" | "user">("role");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [permissionMappings, setPermissionMappings] = useState<{ role: string; permissionKey: string }[]>([]);
  const [availablePermissionKeys, setAvailablePermissionKeys] = useState<string[]>([]);
  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState<number | null>(null);
  const [selectedPermissionUserRole, setSelectedPermissionUserRole] = useState<string>("");
  const [rolePermissionKeySet, setRolePermissionKeySet] = useState<Set<string>>(new Set());
  const [userOverrideMap, setUserOverrideMap] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [actingUserId, setActingUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [activeManageRowId, setActiveManageRowId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [totalUsers, setTotalUsers] = useState(0);
  const [offset, setOffset] = useState(0);
  const USERS_PAGE_SIZE = 100;
  const [status, setStatus] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<ClassRoomOption[]>([]);
  const [sections, setSections] = useState<ClassSectionOption[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberApiRow[]>([]);
  const activeManageMenuRef = useRef<HTMLDivElement | null>(null);

  const roleSuggestions = useMemo(() => ROLE_OPTIONS.map((item) => item.id), []);
  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
      matches: password.length > 0 && password === confirmPassword,
      isStrong: STRONG_PASSWORD_REGEX.test(password),
    }),
    [password, confirmPassword],
  );
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const roleOk = roleFilter === "all" ? true : u.role === roleFilter;
      if (!roleOk) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, searchQuery]);

  function resetForm() {
    setName("");
    setEmail("");
    setRole("");
    setPassword("");
    setConfirmPassword("");
    setEditingUserId(null);
    setStatus(null);
  }

  const permissionSectors = useMemo(
    () => groupAvailableKeysBySector(availablePermissionKeys),
    [availablePermissionKeys],
  );
  const orphanKeys = useMemo(
    () => orphanPermissionKeys(availablePermissionKeys),
    [availablePermissionKeys],
  );

  useEffect(() => {
    setIsLoadingUsers(true);
    fetchManagedUsers(USERS_PAGE_SIZE, offset)
      .then((data) => {
        if (offset === 0) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        setTotalUsers(data.total);
      })
      .catch((err: Error) => setStatus("Error loading users: " + err.message))
      .finally(() => setIsLoadingUsers(false));
  }, [offset]);

  useEffect(() => {
    void Promise.all([fetchClassrooms(), fetchClassSections(), fetchStaffMembers("teaching")])
      .then(([rooms, secs, staff]) => {
        setClassrooms(rooms);
        setSections(secs);
        setStaffMembers(staff);
      })
      .catch(() => {
        // Keep users table functional even if class/staff helpers fail to load.
      });
  }, []);

  useEffect(() => {
    if (view === "permissions") {
      fetchRolePermissions()
        .then((data) => {
          setPermissionMappings(data.permissions);
          setAvailablePermissionKeys(data.availableKeys);
        })
        .catch((err) => {
          setStatus("Error loading permissions: " + err.message);
        });
    }
  }, [view]);

  useEffect(() => {
    if (view !== "permissions" || permissionMode !== "user") return;
    if (selectedPermissionUserId == null) return;
    fetchUserPermissions(selectedPermissionUserId)
      .then((data) => {
        setSelectedPermissionUserRole(data.userRole);
        setAvailablePermissionKeys(data.availableKeys);
        setRolePermissionKeySet(new Set(data.rolePermissions));
        const map: Record<string, boolean> = {};
        for (const row of data.overrides) map[row.permissionKey] = row.allowed;
        setUserOverrideMap(map);
      })
      .catch((err: Error) => setStatus("Error loading user permissions: " + err.message));
  }, [view, permissionMode, selectedPermissionUserId]);

  useEffect(() => {
    if (activeManageRowId == null) return;
    function onPointerDown(event: MouseEvent) {
      if (!activeManageMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !activeManageMenuRef.current.contains(target)) {
        setActiveManageRowId(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [activeManageRowId]);

  async function handleTogglePermission(roleId: string, permKey: string) {
    const isCurrentlyChecked = permissionMappings.some(m => m.role === roleId && m.permissionKey === permKey);
    let newMappings = [];
    if (isCurrentlyChecked) {
      newMappings = permissionMappings.filter(m => !(m.role === roleId && m.permissionKey === permKey));
    } else {
      newMappings = [...permissionMappings, { role: roleId, permissionKey: permKey }];
    }
    setPermissionMappings(newMappings);
  }

  async function handleSavePermissions() {
    setIsSaving(true);
    setStatus(null);
    try {
      const updates = ROLE_OPTIONS.map((r) => ({
        role: r.id,
        permissions: permissionMappings
          .filter((m) => m.role === r.id)
          .map((m) => m.permissionKey),
      }));
      await updateRolePermissionsBulk(updates);
      setStatus("Permissions updated successfully!");
    } catch (err: any) {
      setStatus("Error saving permissions: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function effectiveForUserPermission(permissionKey: string): boolean {
    if (permissionKey in userOverrideMap) return Boolean(userOverrideMap[permissionKey]);
    return rolePermissionKeySet.has(permissionKey);
  }

  function cycleUserPermissionOverride(permissionKey: string) {
    const baseAllowed = rolePermissionKeySet.has(permissionKey);
    const hasOverride = Object.prototype.hasOwnProperty.call(userOverrideMap, permissionKey);
    const current = hasOverride ? userOverrideMap[permissionKey] : baseAllowed;
    const next = !current;
    if (next === baseAllowed) {
      setUserOverrideMap((prev) => {
        const copy = { ...prev };
        delete copy[permissionKey];
        return copy;
      });
      return;
    }
    setUserOverrideMap((prev) => ({ ...prev, [permissionKey]: next }));
  }

  async function handleSaveUserPermissions() {
    if (selectedPermissionUserId == null) {
      setStatus("Select a user first.");
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      const overrides = Object.entries(userOverrideMap).map(([permissionKey, allowed]) => ({
        permissionKey,
        allowed,
      }));
      await updateUserPermissionOverrides(selectedPermissionUserId, overrides);
      setStatus("User permissions updated successfully!");
    } catch (err: any) {
      setStatus("Error saving user permissions: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setStatus("Enter the user's full name before creating the account.");
      return;
    }
    if (!email.trim()) {
      setStatus("Enter the user's email before creating the account.");
      return;
    }
    if (!role.trim()) {
      setStatus("Enter a role for this user.");
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingUserId != null) {
        const updated = await updateManagedUserProfile(editingUserId, {
          name: name.trim(),
          email: email.trim(),
          role: role.trim(),
        });
        setUsers((currentUsers) =>
          currentUsers.map((u) => (u.id === updated.id ? updated : u)),
        );
        setStatus(`Saved changes for ${updated.name}.`);
      } else {
        if (!passwordChecks.isStrong) {
          setStatus("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.");
          setIsSubmitting(false);
          return;
        }
        if (!passwordChecks.matches) {
          setStatus("Confirm password, please.");
          setIsSubmitting(false);
          return;
        }
        const created = await createManagedUser({
          name: name.trim(),
          email: email.trim(),
          role: role.trim(),
          password,
          confirmPassword,
        });
        setUsers((currentUsers) => [created, ...currentUsers]);
        setStatus(`User account created for role "${created.role}". They can sign in and access their dashboard.`);
      }
      setName("");
      setEmail("");
      setRole("");
      setPassword("");
      setConfirmPassword("");
      setEditingUserId(null);
      setView("list");
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditUser(user: ManagedUser) {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword("");
    setConfirmPassword("");
    setView("add");
    setActiveManageRowId(null);
    setStatus(null);
  }

  function permissionDetail(permKey: string) {
    const d = PERMISSION_DETAILS[permKey];
    return {
      title: d?.title ?? permKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      description:
        d?.description ??
        "Controls access for this capability. Extend permissionCatalog.ts when new keys are added.",
    };
  }

  async function handleToggleActive(user: ManagedUser) {
    try {
      setActingUserId(user.id);
      const updated = await updateManagedUserStatus(user.id, !user.isActive);
      setUsers((current) => current.map((row) => (row.id === user.id ? updated : row)));
      setStatus(
        updated.isActive
          ? `${updated.name} has been reactivated.`
          : `${updated.name} has been deactivated.`,
      );
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to update user status");
    } finally {
      setActingUserId(null);
    }
  }

  async function handleDeleteUser(user: ManagedUser) {
    const confirmed = window.confirm(`Delete ${user.name}? This action archives the account and removes it from active users.`);
    if (!confirmed) return;
    try {
      setActingUserId(user.id);
      await deleteManagedUser(user.id);
      setUsers((current) => current.filter((row) => row.id !== user.id));
      setStatus(`${user.name} was deleted successfully.`);
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to delete user");
    } finally {
      setActingUserId(null);
    }
  }

  async function handleAdminResetPassword(user: ManagedUser) {
    const newPassword = window.prompt(
      `Enter a temporary strong password for ${user.name}:`,
      "",
    );
    if (newPassword == null) return;
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      setStatus("Temporary password must include uppercase, lowercase, number, and symbol characters.");
      return;
    }
    try {
      setActingUserId(user.id);
      await adminResetManagedUserPassword(user.id, newPassword);
      setStatus(`Password reset completed for ${user.name}. Share the temporary password securely.`);
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to reset password");
    } finally {
      setActingUserId(null);
    }
  }

  function teacherAssignmentLabel(user: ManagedUser): string {
    if (user.role !== "teacher") return "—";
    const staff = staffMembers.find((row) => row.userId === user.id);
    if (!staff) return "Not linked";
    const className = (staff.assignedClass ?? "").trim();
    const section = (staff.teachingSection ?? "").trim();
    if (!className) return "Unassigned";
    return section ? `${className} · ${section}` : className;
  }

  async function handleAssignClass(user: ManagedUser) {
    if (user.role !== "teacher") return;
    const staff = staffMembers.find((row) => row.userId === user.id);
    if (!staff) {
      setStatus(`No staff profile linked to ${user.name}. Create/attach a staff record first.`);
      return;
    }
    const classOptions = classrooms.map((c) => c.name);
    if (classOptions.length === 0) {
      setStatus("No classes available for assignment.");
      return;
    }
    const classHint = classOptions.join(", ");
    const selectedClassRaw = window.prompt(
      `Assign class to ${user.name}.\nAvailable: ${classHint}`,
      staff.assignedClass ?? "",
    );
    if (selectedClassRaw == null) return;
    const selectedClass = selectedClassRaw.trim();
    if (!selectedClass) {
      setStatus("Class assignment was not changed.");
      return;
    }
    if (!classOptions.includes(selectedClass)) {
      setStatus("Selected class is not in the current class list.");
      return;
    }

    const room = classrooms.find((c) => c.name === selectedClass) ?? null;
    const classSections = room ? sections.filter((s) => s.classRoomId === room.id).map((s) => s.name) : [];
    const sectionHint = classSections.length > 0 ? `\nSections: ${classSections.join(", ")}` : "\nNo sections for this class.";
    const selectedSectionRaw = window.prompt(
      `Assign section for ${selectedClass} (optional).${sectionHint}`,
      staff.teachingSection ?? "",
    );
    if (selectedSectionRaw == null) return;
    const selectedSection = selectedSectionRaw.trim();
    if (selectedSection && classSections.length > 0 && !classSections.includes(selectedSection)) {
      setStatus("Selected section is not in the class sections list.");
      return;
    }

    try {
      setActingUserId(user.id);
      const updated = await updateStaffMember(staff.id, {
        assignedClass: selectedClass,
        teachingSection: selectedSection || undefined,
      });
      setStaffMembers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setStatus(`Assigned ${user.name} to ${selectedClass}${selectedSection ? ` (${selectedSection})` : ""}.`);
      setActiveManageRowId(null);
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to assign class");
    } finally {
      setActingUserId(null);
    }
  }

  function openUserPermissions(user: ManagedUser) {
    setView("permissions");
    setPermissionMode("user");
    setSelectedPermissionUserId(user.id);
    setStatus(null);
  }

  function renderPermissionMatrix(permKeys: string[]) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-[#0c2340]">
              <th className="min-w-[280px] px-4 py-3 text-left">Permission</th>
              {ROLE_OPTIONS.map((r) => (
                <th key={r.id} className="px-2 py-3 text-center whitespace-nowrap">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {permKeys.map((permKey) => {
              const { title, description } = permissionDetail(permKey);
              return (
                <tr key={permKey} className="align-top hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{description}</p>
                    <p className="mt-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {permKey}
                    </p>
                  </td>
                  {ROLE_OPTIONS.map((role) => {
                    const isChecked = permissionMappings.some(
                      (m) => m.role === role.id && m.permissionKey === permKey,
                    );
                    return (
                      <td key={role.id} className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(role.id, permKey)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#ea580c] focus:ring-[#ea580c]"
                          aria-label={`${role.label}: ${title}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (view === "permissions") {
    const successMessage = status?.startsWith("Permissions updated") || status?.startsWith("User permissions updated");
    return (
      <div className="max-w-[1100px] space-y-6 pb-24">
        <header className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 shadow-inner ring-1 ring-indigo-100">
                🔐
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800">
                  {permissionMode === "role" ? "Role Permissions" : "User Permissions"}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {permissionMode === "role"
                    ? "Configure system access for each role. Grant or revoke per sector, then save."
                    : "Individual permission overrides for specific administrative accounts."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPermissionMode("role");
                    setStatus(null);
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    permissionMode === "role" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  By Role
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPermissionMode("user");
                    setStatus(null);
                    if (selectedPermissionUserId == null && users.length > 0) {
                      setSelectedPermissionUserId(users[0].id);
                    }
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    permissionMode === "user" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  By User
                </button>
              </div>
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={permissionMode === "role" ? handleSavePermissions : handleSaveUserPermissions}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 disabled:pointer-events-none disabled:opacity-60 transition-all"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {permissionMode === "user" ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select User (Admin managed)
                </span>
                <select
                  value={selectedPermissionUserId ?? ""}
                  onChange={(event) => setSelectedPermissionUserId(Number.parseInt(event.target.value, 10))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none shadow-sm transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Base role: <span className="font-bold text-slate-700">{selectedPermissionUserRole || "not selected"}</span>.
                Unchecked options are denied, checked options are allowed. Overrides can differ from role defaults.
              </p>
            </section>
          ) : null}
          {permissionSectors.map((sector) => (
            <section
              key={sector.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{sector.title}</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{sector.subtitle}</p>
              </div>
              {permissionMode === "role" ? (
                renderPermissionMatrix([...sector.keys])
              ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {sector.keys.map((permKey) => {
                    const { title, description } = permissionDetail(permKey);
                    const checked = effectiveForUserPermission(permKey);
                    const roleBased = rolePermissionKeySet.has(permKey);
                    const overridden = Object.prototype.hasOwnProperty.call(userOverrideMap, permKey);
                    return (
                      <label
                        key={permKey}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-slate-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900">{title}</p>
                            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{description}</p>
                            <p className="mt-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {permKey}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              {overridden ? "Admin override" : roleBased ? "Inherited from role" : "Not granted"}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => cycleUserPermissionOverride(permKey)}
                            className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-[#ea580c] focus:ring-[#ea580c]"
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          {orphanKeys.length > 0 ? (
            <section className="neo-card overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
              <div className="border-b border-amber-100 bg-amber-50/80 px-5 py-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">Other permissions</h2>
                <p className="mt-1 text-xs font-medium text-amber-900/80">
                  Keys from the server not yet assigned to a sector in the catalog. Add them to{" "}
                  <span className="font-mono">permissionCatalog.ts</span> for full documentation.
                </p>
              </div>
              {renderPermissionMatrix(orphanKeys)}
            </section>
          ) : null}

          {status ? (
            <div
              className={`rounded-xl border px-5 py-4 text-sm font-bold ${
                successMessage
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {status}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (view === "add") {
    return (
      <div className="max-w-[860px] space-y-6 pb-24">
        <header className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 shadow-inner ring-1 ring-indigo-100">
                👤
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800">
                  {editingUserId != null ? "Edit User Account" : "Add New User Account"}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {editingUserId != null
                    ? "Update access and profile information for this user."
                    : "Create a new school identity with role-based dashboard access."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("list");
              }}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 shrink-0"
            >
              Back to users
            </button>
          </div>
        </header>

        <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Step 1: User Identity
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-bold text-slate-700">Full Name <span className="text-rose-500">*</span></span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Jane Namusoke"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none shadow-sm transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold text-slate-700">Email Address <span className="text-rose-500">*</span></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. jane@queens.school"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none shadow-sm transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {editingUserId != null ? "Step 2: Access Role" : "Step 2: Role & Security"}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-bold text-slate-700">Assigned Role <span className="text-rose-500">*</span></span>
                  <input
                    list="role-suggestions"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    placeholder="e.g. teacher, accountant, registrar"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none shadow-sm transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                  <datalist id="role-suggestions">
                    {roleSuggestions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                  <p className="text-[11px] font-semibold text-slate-500">
                    You can type a custom role. Spaces and symbols are normalized when saved.
                  </p>
                </label>
                {editingUserId == null ? (
                  <>
                    <label className="block space-y-2">
                      <span className="text-xs font-bold text-slate-700">Account Password <span className="text-rose-500">*</span></span>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter secure password"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none shadow-sm transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-xs font-bold text-slate-700">Confirm Account Password <span className="text-rose-500">*</span></span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Re-type password"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none shadow-sm transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </label>
                  </>
                ) : null}
              </div>
              {editingUserId == null && password.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <PasswordRule ok={passwordChecks.minLength} label="At least 8 characters" />
                  <PasswordRule ok={passwordChecks.uppercase} label="At least one uppercase letter" />
                  <PasswordRule ok={passwordChecks.lowercase} label="At least one lowercase letter" />
                  <PasswordRule ok={passwordChecks.number} label="At least one number" />
                  <PasswordRule ok={passwordChecks.symbol} label="At least one symbol" />
                  <PasswordRule ok={passwordChecks.matches} label="Password confirmation matches" />
                </div>
              ) : null}
            </section>

            {status ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                {status}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full inline-flex justify-center items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 disabled:pointer-events-none disabled:opacity-60 transition-all"
              >
                {isSubmitting
                  ? editingUserId != null
                    ? "Saving Changes..."
                    : "Creating Account..."
                  : editingUserId != null
                    ? "Save User Changes"
                    : "Create User Account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("list");
                }}
                className="w-full inline-flex justify-center rounded-2xl bg-white border border-slate-200 px-6 py-4 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
              >
                Cancel and Return
              </button>
            </div>
        </div>
      </div>
    );
  }

    return (
      <div className="max-w-[1000px] space-y-6 pb-24">
        <header className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 shadow-inner ring-1 ring-indigo-100">
                👥
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800">Users & Roles</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Administrative control for system accounts, role definitions, and portal access permissions.
                </p>
              </div>
            </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView("permissions")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
            >
              Manage System Permissions
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("add");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New User
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search accounts..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 outline-none shadow-sm transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none shadow-sm transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="all">All Roles</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="inline-flex items-center rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
                {filteredUsers.length} Active Accounts
              </div>
            </div>
          </div>
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[980px] text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4">Assigned Role</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4">Academic Assignment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const rowBusy = actingUserId === user.id;
                  return (
                    <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{user.name}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            user.isActive
                              ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                              : "border-rose-100 bg-rose-50 text-rose-600"
                          }`}
                        >
                          {user.isActive ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-600 italic">
                          {teacherAssignmentLabel(user)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          ref={activeManageRowId === user.id ? activeManageMenuRef : null}
                          className="relative flex justify-end"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveManageRowId((prev) => (prev === user.id ? null : user.id))
                            }
                            disabled={rowBusy}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-indigo-600 disabled:pointer-events-none disabled:opacity-60"
                          >
                            {activeManageRowId === user.id ? "Close" : "Manage"}
                          </button>
                          {activeManageRowId === user.id ? (
                            <div
                              role="menu"
                              aria-orientation="vertical"
                              className="absolute right-0 top-full z-[60] mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150"
                            >
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditUser(user)}
                                  disabled={rowBusy}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                >
                                  Edit Identity
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openUserPermissions(user)}
                                  disabled={rowBusy}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                >
                                  Account Permissions
                                </button>
                                {user.role === "teacher" ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleAssignClass(user)}
                                    disabled={rowBusy}
                                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                                  >
                                    Class Assignment
                                  </button>
                                ) : null}
                                <div className="my-1 h-px bg-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => void handleToggleActive(user)}
                                  disabled={rowBusy}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  {user.isActive ? "Deactivate Account" : "Reactivate Account"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleAdminResetPassword(user)}
                                  disabled={rowBusy}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors"
                                >
                                  Force Password Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteUser(user)}
                                  disabled={rowBusy}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  Purge Record
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm font-medium text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm font-medium text-slate-400">
                      No users match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
        {users.length < totalUsers && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setOffset((prev) => prev + USERS_PAGE_SIZE)}
              disabled={isLoadingUsers}
              className="rounded-xl border border-slate-200 bg-white px-8 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              {isLoadingUsers ? "Loading..." : "Load More Users"}
            </button>
          </div>
        )}
        {status ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-bold text-blue-700">
            {status}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className={`rounded-lg px-3 py-2 text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      {ok ? "OK" : "Need"} - {label}
    </p>
  );
}
