import { useEffect, useMemo, useState } from "react";
import { fetchRolePermissions, updateRolePermissions } from "../../api/settings";
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

const sampleUsers = [
  { id: 1, name: "Alice Administrator", email: "alice@queens.school", roleLabel: "admin" },
  { id: 2, name: "Brian Accounts", email: "accounts@queens.school", roleLabel: "accountant" },
  { id: 3, name: "Grace Head Teacher", email: "headteacher@queens.school", roleLabel: "head_teacher" },
];

export function SettingsUsersRolesPanel() {
  const [view, setView] = useState<"list" | "add" | "permissions">("list");
  const [users, setUsers] = useState(sampleUsers);
  const [permissionMappings, setPermissionMappings] = useState<{ role: string; permissionKey: string }[]>([]);
  const [availablePermissionKeys, setAvailablePermissionKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<UserRoleOption["id"] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const selectedRole = useMemo(
    () => ROLE_OPTIONS.find((role) => role.id === selectedRoleId) ?? null,
    [selectedRoleId],
  );

  function resetForm() {
    setSelectedRoleId(null);
    setName("");
    setEmail("");
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
    if (view === "permissions") {
      fetchRolePermissions().then(data => {
        setPermissionMappings(data.permissions);
        setAvailablePermissionKeys(data.availableKeys);
      }).catch(err => {
        setStatus("Error loading permissions: " + err.message)
      });
    }
  }, [view]);

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

  function handleSubmit() {
    if (!selectedRole) {
      setStatus("Select a role before creating the user.");
      return;
    }
    if (!name.trim()) {
      setStatus("Enter the user's full name before creating the account.");
      return;
    }
    if (!email.trim()) {
      setStatus("Enter the user's email before creating the account.");
      return;
    }

    const nextUser = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      roleLabel: selectedRole.label,
    };

    setUsers((currentUsers) => [nextUser, ...currentUsers]);
    setSelectedRoleId(null);
    setName("");
    setEmail("");
    setStatus(`User prepared successfully for the ${selectedRole.label} role.`);
    setView("list");
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
                <tr key={permKey} className="align-top hover:bg-slate-50/50 transition-colors">
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
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#ea580c] focus:ring-[#ea580c] transition"
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
    const successMessage = status?.startsWith("Permissions updated");
    return (
      <div className="max-w-[1100px] mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <header className="neo-card relative overflow-hidden rounded-2xl bg-white px-6 py-6 sm:px-8 shadow-sm">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#0c2340] to-[#ea580c]" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c2340]/10 to-[#ea580c]/10 text-2xl shadow-inner">
                🔐
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#0c2340]">Role Permissions</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Each sector lists its permissions in detail. Use the checkboxes to grant or revoke a permission per
                  role, then save.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePermissions}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0c2340] to-[#1a3a5c] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0c2340]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:pointer-events-none disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {permissionSectors.map((sector) => (
            <section
              key={sector.id}
              className="neo-card overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0c2340]">{sector.title}</h2>
                <p className="mt-1 text-xs font-medium text-slate-600">{sector.subtitle}</p>
              </div>
              {renderPermissionMatrix([...sector.keys])}
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
      <div className="max-w-[860px] mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <header className="neo-card relative overflow-hidden rounded-2xl bg-white px-6 py-6 sm:px-8 shadow-sm">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#0c2340] to-[#ea580c]" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c2340]/10 to-[#ea580c]/10 text-2xl shadow-inner">
                👤
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#0c2340]">Add New User</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Select a role and enter contact details to provision a new account.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("list");
              }}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 shrink-0"
            >
              Back to users
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="neo-card rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#0c2340]">
                Step 1: Select User Role
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLE_OPTIONS.map((role) => {
                  const active = selectedRoleId === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoleId(role.id);
                        setStatus(null);
                      }}
                      className={`relative flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        active
                          ? "border-[#ea580c] bg-orange-50/50 shadow-[0_0_0_1px_#ea580c]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {active ? (
                        <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[#ea580c]" />
                      ) : null}
                      <p
                        className={`text-sm font-bold uppercase tracking-wider ${active ? "text-[#ea580c]" : "text-[#0c2340]"}`}
                      >
                        {role.label}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{role.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="neo-card rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#0c2340]">
                Step 2: User Details
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-[#0c2340]">Full Name <span className="text-red-500">*</span></span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Jane Namusoke"
                    className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-[#0c2340]">Email <span className="text-red-500">*</span></span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. jane@queens.school"
                    className="neo-inset-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="neo-card rounded-2xl bg-white p-6 shadow-sm border border-slate-100 self-start sticky top-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[#0c2340]">
              New User Summary
            </h2>
            <div className="mt-5 space-y-3">
              <SummaryRow label="Role" value={selectedRole?.label ?? "Not selected"} active={!!selectedRole} />
              <SummaryRow label="Internal Key" value={selectedRole?.id ?? "Not selected"} active={!!selectedRole} />
              <SummaryRow label="Full Name" value={name.trim() || "Not entered"} active={name.trim().length > 0} />
              <SummaryRow label="Email" value={email.trim() || "Not entered"} active={email.trim().length > 0} />
            </div>

            {status ? (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                {status}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-[#0c2340] to-[#1a3a5c] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0c2340]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="w-full inline-flex justify-center rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Clear Form
              </button>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-3 duration-500">
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
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
            >
              Manage Permissions
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("add");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#c2410c] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#ea580c]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Add User
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="neo-card overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-[#0c2340]">
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-[#0c2340]">{user.name}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-500">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#ea580c]">
                        {user.roleLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm font-medium text-slate-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 transition-colors ${active ? "border-[#0c2340]/10 bg-[#0c2340]/5" : "border-slate-100 bg-slate-50"}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-bold ${active ? "text-[#0c2340]" : "text-slate-500"}`}>{value}</p>
    </div>
  );
}
