import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchRolePermissions,
  fetchUserPermissions,
  updateRolePermissions,
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
    fetchManagedUsers()
      .then((loadedUsers) => {
        setUsers(loadedUsers);
      })
      .catch((err: Error) => setStatus("Error loading users: " + err.message))
      .finally(() => setIsLoadingUsers(false));
  }, []);

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
      // We save role by role for simplicity or bulk if needed. 
      // For now, let's group by role.
      const rolesToUpdate = ROLE_OPTIONS.map(r => r.id);
      for (const roleId of rolesToUpdate) {
        const perms = permissionMappings.filter(m => m.role === roleId).map(m => m.permissionKey);
        await updateRolePermissions(roleId, perms);
      }
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
        <header className="neo-card relative overflow-hidden rounded-2xl bg-white px-6 py-6 sm:px-8 shadow-sm">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#0c2340] to-[#ea580c]" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c2340]/10 to-[#ea580c]/10 text-2xl shadow-inner">
                🔐
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#0c2340]">
                  {permissionMode === "role" ? "Role Permissions" : "User Permissions"}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {permissionMode === "role"
                    ? "Each sector lists permissions. Grant or revoke per role, then save."
                    : "Select a user and configure individual permission overrides set by admin."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPermissionMode("role");
                    setStatus(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    permissionMode === "role" ? "bg-[#0c2340] text-white" : "text-slate-600 hover:bg-slate-100"
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
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    permissionMode === "user" ? "bg-[#0c2340] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  By User
                </button>
              </div>
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={permissionMode === "role" ? handleSavePermissions : handleSaveUserPermissions}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0c2340] to-[#1a3a5c] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0c2340]/20 hover:shadow-xl disabled:pointer-events-none disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {permissionMode === "user" ? (
            <section className="neo-card rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <label className="block space-y-1.5">
                <span className="text-xs font-black uppercase tracking-widest text-[#0c2340]">
                  Select User (Admin managed)
                </span>
                <select
                  value={selectedPermissionUserId ?? ""}
                  onChange={(event) => setSelectedPermissionUserId(Number.parseInt(event.target.value, 10))}
                  className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
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
              className="neo-card overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0c2340]">{sector.title}</h2>
                <p className="mt-1 text-xs font-medium text-slate-600">{sector.subtitle}</p>
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
        <header className="neo-card relative overflow-hidden rounded-2xl bg-white px-6 py-6 sm:px-8 shadow-sm">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#0c2340] to-[#ea580c]" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c2340]/10 to-[#ea580c]/10 text-2xl shadow-inner">
                👤
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#0c2340]">
                  {editingUserId != null ? "Edit User" : "Add New User"}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {editingUserId != null
                    ? "Update the user's saved account information."
                    : "Enter the user identity, role, and secure password to provision a login-ready account."}
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
            <section className="neo-card rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#0c2340]">
                Step 1: User Identity
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-[#0c2340]">Full Name <span className="text-red-500">*</span></span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Jane Namusoke"
                    className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-[#0c2340]">Email <span className="text-red-500">*</span></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. jane@queens.school"
                    className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
                  />
                </label>
              </div>
            </section>

            <section className="neo-card rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#0c2340]">
                {editingUserId != null ? "Step 2: Role" : "Step 2: Role & Password"}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-[#0c2340]">Role <span className="text-red-500">*</span></span>
                  <input
                    list="role-suggestions"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    placeholder="e.g. teacher, accountant, registrar"
                    className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
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
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-[#0c2340]">Password <span className="text-red-500">*</span></span>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter secure password"
                        className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-[#0c2340]">Confirm Password <span className="text-red-500">*</span></span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Re-type password"
                        className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
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
                className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-[#0c2340] to-[#1a3a5c] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0c2340]/20 hover:shadow-xl disabled:pointer-events-none disabled:opacity-60"
              >
                {isSubmitting
                  ? editingUserId != null
                    ? "Saving..."
                    : "Creating account..."
                  : editingUserId != null
                    ? "Save Changes"
                    : "Create Account"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="w-full inline-flex justify-center rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Clear Form
              </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] space-y-6 pb-24">
      <header className="neo-card relative overflow-hidden rounded-2xl bg-white px-6 py-6 sm:px-8 shadow-sm">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#0c2340] to-[#ea580c]" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c2340]/10 to-[#ea580c]/10 text-2xl shadow-inner">
              👥
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0c2340]">Users & Roles</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Manage system access and prepare user accounts for finance, academics, administration, and portal access.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setView("permissions")}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Manage Permissions
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("add");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#c2410c] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#ea580c]/20 hover:shadow-xl"
            >
              Add User
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <section className="neo-card overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, email, or role"
                className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
              />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="neo-inset-field rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
              >
                <option value="all">All roles</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                {filteredUsers.length} user(s)
              </div>
            </div>
          </div>
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-[#0c2340]">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Class assigned</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const rowBusy = actingUserId === user.id;
                  return (
                    <tr key={user.id} className="align-top hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-[#0c2340]">{user.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#ea580c]">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                            user.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {user.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold text-slate-600">
                          {teacherAssignmentLabel(user)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
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
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
                          >
                            {activeManageRowId === user.id ? "Hide" : "Manage"}
                          </button>
                          {activeManageRowId === user.id ? (
                            <div
                              role="menu"
                              aria-orientation="vertical"
                              className="neo-dropdown absolute right-full top-0 z-[60] mr-2 w-[min(100vw-2rem,18rem)] overflow-hidden p-2 shadow-lg"
                            >
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditUser(user)}
                                  disabled={rowBusy}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openUserPermissions(user)}
                                  disabled={rowBusy}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
                                >
                                  Permissions
                                </button>
                                {user.role === "teacher" ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleAssignClass(user)}
                                    disabled={rowBusy}
                                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:pointer-events-none disabled:opacity-60"
                                  >
                                    Assign Class
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => void handleToggleActive(user)}
                                  disabled={rowBusy}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
                                >
                                  {user.isActive ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleAdminResetPassword(user)}
                                  disabled={rowBusy}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-[11px] font-bold text-amber-800 hover:bg-amber-100 disabled:pointer-events-none disabled:opacity-60"
                                >
                                  Reset Password
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteUser(user)}
                                  disabled={rowBusy}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-left text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-60"
                                >
                                  Delete
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
