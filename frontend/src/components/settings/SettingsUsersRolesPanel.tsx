import { useEffect, useMemo, useState } from "react";
import { fetchRolePermissions, updateRolePermissions } from "../../api/settings";

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

  if (view === "permissions") {
    return (
      <section className="neo-card p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebe4d9]/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#2d3436]">Role Permissions</h1>
            <p className="mt-2 text-sm text-[#636e72]">
              Check the boxes to provision specific permissions for each role.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSavePermissions}
              className="rounded-full bg-gradient-to-br from-[#5a8faf] to-[#4a6b4e] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-[3px_3px_6px_rgba(90,143,175,0.35)] transition hover:brightness-105"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
            >
              Back
            </button>
          </div>
        </header>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#ebe4d9]/80 text-[10px] uppercase text-[#636e72]">
                <th className="px-3 py-3">Permission</th>
                {ROLE_OPTIONS.map(r => (
                  <th key={r.id} className="px-3 py-3 text-center">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]/70">
              {availablePermissionKeys.map(permKey => (
                <tr key={permKey} className="hover:bg-white/30">
                  <td className="px-3 py-3 text-xs font-semibold text-[#2d3436]">
                    {permKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  {ROLE_OPTIONS.map(role => {
                    const isChecked = permissionMappings.some(m => m.role === role.id && m.permissionKey === permKey);
                    return (
                      <td key={role.id} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(role.id, permKey)}
                          className="h-4 w-4 rounded border-[#ebe4d9] text-[#5a8faf] focus:ring-[#5a8faf]"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {status && (
          <p className="mt-5 text-sm font-medium text-[#c0392b]">{status}</p>
        )}
      </section>
    );
  }

  if (view === "add") {
    return (
      <section className="neo-card p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebe4d9]/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#2d3436]">Add user</h1>
            <p className="mt-2 text-sm text-[#636e72]">
              Start by selecting the user role. The `super_admin` role is displayed as
              `admin` for easier assignment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setView("list");
            }}
            className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
          >
            Back to users
          </button>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#636e72]">
              Step 1: Select user role
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#5a8faf] bg-gradient-to-br from-[#e8f2fa] to-[#d4e8f5] shadow-[3px_3px_8px_rgba(90,143,175,0.22)]"
                        : "border-[#ebe4d9]/90 bg-[#faf7f0]/55 hover:border-[#b9d9eb]/80"
                    }`}
                  >
                    <p className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">
                      {role.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#636e72]">
                      {role.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-8">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#636e72]">
                Step 2: User details
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-semibold text-[#2d3436]">
                  Full name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Jane Namusoke"
                    className="neo-inset-field w-full rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1 text-sm font-semibold text-[#2d3436]">
                  Email
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. jane@queens.school"
                    className="neo-inset-field w-full rounded-lg px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          </div>

          <aside className="neo-card-elevated rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">
              New user summary
            </h2>
            <div className="mt-4 space-y-3 text-sm text-[#636e72]">
              <SummaryRow label="Role" value={selectedRole?.label ?? "Not selected"} />
              <SummaryRow label="Internal role key" value={selectedRole?.id ?? "Not selected"} />
              <SummaryRow label="Full name" value={name.trim() || "Not entered"} />
              <SummaryRow label="Email" value={email.trim() || "Not entered"} />
            </div>

            {status ? (
              <p className="mt-5 rounded-xl border border-[#ebe4d9] bg-white/70 px-3 py-3 text-sm text-[#2d3436]">
                {status}
              </p>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-full bg-gradient-to-br from-[#b8d8ba] to-[#8fb892] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-[3px_3px_8px_rgba(120,150,125,0.4),-2px_-2px_6px_rgba(255,255,255,0.8)] transition hover:brightness-105"
              >
                Create user
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
              >
                Clear
              </button>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="neo-card p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebe4d9]/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#2d3436]">Users & roles</h1>
          <p className="mt-2 text-sm text-[#636e72]">
            Manage system access and prepare user accounts for finance, academics,
            administration, and portal access.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("permissions")}
            className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
          >
            Manage Permissions
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setView("add");
            }}
            className="rounded-full bg-gradient-to-br from-[#5a8faf] to-[#4a6b4e] px-5 py-2 text-sm font-bold text-white shadow-[3px_3px_8px_rgba(90,143,175,0.35)] transition hover:brightness-105"
          >
            Add user
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead>
              <tr className="border-b border-[#ebe4d9]/80 text-xs uppercase text-[#636e72]">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]/70">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-3 text-sm font-semibold text-[#2d3436]">{user.name}</td>
                  <td className="px-3 py-3 text-sm text-[#636e72]">{user.email}</td>
                  <td className="px-3 py-3 text-sm text-[#2d3436]">{user.roleLabel}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-flex rounded-full bg-[#e8f4e9] px-2.5 py-1 text-xs font-bold text-[#2d3436]">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="neo-card-elevated rounded-2xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">
            Available roles
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-[#636e72]">
            {ROLE_OPTIONS.map((role) => (
              <li key={role.id} className="rounded-xl border border-[#ebe4d9]/80 bg-white/40 px-4 py-3">
                <p className="font-semibold text-[#2d3436]">{role.label}</p>
                <p className="mt-1 text-xs leading-relaxed">{role.description}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#ebe4d9]/80 bg-white/50 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#636e72]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#2d3436]">{value}</p>
    </div>
  );
}
