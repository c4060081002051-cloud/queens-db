import { useEffect, useState, useRef } from "react";
import { debugClientLog } from "../../api/debugSessionLog";
import { fetchGeneralSettings, saveGeneralSettings } from "../../api/settingsGeneral";

type ToastMessage = {
  message: string;
  type: "success" | "error";
};

const DEFAULT_SETTINGS: Record<string, string> = {
  school_name: "Queens Nursery and Primary School",
  school_motto: "",
  school_address: "Bunamwaya",
  school_email: "",
  school_phone: "",
  school_website: "",
  academic_year: new Date().getFullYear().toString(),
  current_term: "Term 1",
  term_start_date: "",
  term_end_date: "",
  currency_code: "UGX",
  country: "Uganda",
  timezone: "Africa/Kampala",
  term_lock_date: "",
  marks_entry_deadline: "",
  promotion_mode: "manual",
  grading_scale: "uganda_primary",
  users_allow_self_registration: "no",
  users_default_new_user_role: "staff",
  users_require_admin_approval: "yes",
  roles_allow_custom_roles: "no",
  roles_allow_non_admin_user_management: "no",
  security_mfa_admin_required: "yes",
  security_session_timeout_minutes: "60",
  security_password_min_length: "8",
  security_password_expiry_days: "90",
  security_max_login_attempts: "5",
  security_lockout_minutes: "15",
  security_audit_log_retention_days: "365",
};

export function SettingsGeneralPanel() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dirty, setDirty] = useState(false);
  const originalRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGeneralSettings()
      .then((data) => {
        if (!cancelled) {
          const merged = { ...DEFAULT_SETTINGS, ...data };
          setSettings(merged);
          originalRef.current = JSON.stringify(merged);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load settings.";
          // #region agent log
          debugClientLog({
            hypothesisId: "H3",
            location: "SettingsGeneralPanel.tsx:load:catch",
            message: "settings_panel_load_failed",
            data: {
              errType: err instanceof Error ? err.constructor.name : typeof err,
              errMsgLen: message.length,
              errMsgPrefix: message.slice(0, 120),
            },
          });
          // #endregion
          setToast({ message, type: "error" });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (originalRef.current && JSON.stringify(settings) !== originalRef.current) {
      setDirty(true);
    } else {
      setDirty(false);
    }
  }, [settings]);

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function discardChanges() {
    if (originalRef.current) {
      setSettings(JSON.parse(originalRef.current));
      setDirty(false);
    }
  }

  async function onSave() {
    const hasEmptyRequired = 
      !settings.school_name?.trim() ||
      !settings.academic_year?.trim() ||
      !settings.currency_code?.trim() ||
      !settings.country?.trim();

    if (hasEmptyRequired) {
        setToast({ message: "Please fill in all required fields before saving.", type: "error" });
        return;
    }

    setSaving(true);
    setToast(null);
    try {
      const res = await saveGeneralSettings(settings);
      const merged = { ...DEFAULT_SETTINGS, ...res.settings };
      setSettings(merged);
      originalRef.current = JSON.stringify(merged);
      setDirty(false);
      setToast({ message: "Settings saved successfully.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-[#94a3b8]">
          <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-widest">Loading Settings</span>
        </div>
      </div>
    );
  }

  const baseControlClass =
    "neo-inset-field h-10 w-full sm:w-[320px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0c2340] focus:ring-2 focus:ring-[#0c2340]/10";

  const renderToggle = (key: keyof typeof DEFAULT_SETTINGS) => {
    const enabled = settings[key] === "yes";
    return (
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => handleChange(key, enabled ? "no" : "yes")}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:ring-offset-2 ${
          enabled ? "bg-[#0c2340]" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    );
  };

  return (
    <section className="mx-auto max-w-[860px] space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-24">
      <header className="neo-card relative overflow-hidden rounded-2xl bg-white px-6 py-8 sm:px-8 shadow-sm">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#0c2340] to-[#ea580c]" />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c2340]/10 to-[#ea580c]/10 text-2xl shadow-inner">
            🏫
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#0c2340]">General Settings</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Configure school profile, preferences, access rules, and security policy.
            </p>
          </div>
        </div>
      </header>

      <SettingsSection title="General">
        <SettingsRow
          label="School Name"
          description="Main school name used across dashboards and reports."
          control={
            <input
              value={settings.school_name}
              onChange={(e) => handleChange("school_name", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="School Motto"
          description="Optional line shown on official printable documents."
          control={
            <input
              value={settings.school_motto}
              onChange={(e) => handleChange("school_motto", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Physical Address"
          description="School location details used in profiles and receipts."
          control={
            <input
              value={settings.school_address}
              onChange={(e) => handleChange("school_address", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="School Email"
          description="Official email for account and communication records."
          control={
            <input
              type="email"
              value={settings.school_email}
              onChange={(e) => handleChange("school_email", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="School Phone"
          description="Primary phone number used in reports and contact cards."
          control={
            <input
              value={settings.school_phone}
              onChange={(e) => handleChange("school_phone", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="School Website"
          description="Public website link displayed where applicable."
          control={
            <input
              value={settings.school_website}
              onChange={(e) => handleChange("school_website", e.target.value)}
              className={baseControlClass}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow
          label="Academic Year"
          description="Current active academic year."
          control={
            <input
              value={settings.academic_year}
              onChange={(e) => handleChange("academic_year", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Current Term"
          description="Default term for new finance and academic operations."
          control={
            <select
              value={settings.current_term}
              onChange={(e) => handleChange("current_term", e.target.value)}
              className={baseControlClass}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          }
        />
        <SettingsRow
          label="Term Start Date"
          description="Reference start date used for term-level calculations."
          control={
            <input
              type="date"
              value={settings.term_start_date}
              onChange={(e) => handleChange("term_start_date", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Term End Date"
          description="Reference end date used for closure workflows."
          control={
            <input
              type="date"
              value={settings.term_end_date}
              onChange={(e) => handleChange("term_end_date", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Term Lock Date"
          description="After this date, term edits can be restricted."
          control={
            <input
              type="date"
              value={settings.term_lock_date}
              onChange={(e) => handleChange("term_lock_date", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Marks Entry Deadline"
          description="Deadline date for marks and assessment entry."
          control={
            <input
              type="date"
              value={settings.marks_entry_deadline}
              onChange={(e) => handleChange("marks_entry_deadline", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Promotion Mode"
          description="Choose manual approval or automatic promotion."
          control={
            <select
              value={settings.promotion_mode}
              onChange={(e) => handleChange("promotion_mode", e.target.value)}
              className={baseControlClass}
            >
              <option value="manual">Manual Approval</option>
              <option value="auto">Automatic</option>
            </select>
          }
        />
        <SettingsRow
          label="Grading Scale"
          description="Default grading model for score interpretation."
          control={
            <select
              value={settings.grading_scale}
              onChange={(e) => handleChange("grading_scale", e.target.value)}
              className={baseControlClass}
            >
              <option value="uganda_primary">Uganda Primary (A-E)</option>
              <option value="percentage">Percentage (0-100)</option>
              <option value="points">Points System</option>
            </select>
          }
        />
      </SettingsSection>

      <SettingsSection title="Layout">
        <SettingsRow
          label="Currency Code"
          description="Currency used for fee, expense, and payroll values."
          control={
            <input
              value={settings.currency_code}
              onChange={(e) => handleChange("currency_code", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Country"
          description="Country-level default for regional forms."
          control={
            <input
              value={settings.country}
              onChange={(e) => handleChange("country", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Timezone"
          description="Timezone used for dates, records, and timestamps."
          control={
            <input
              value={settings.timezone}
              onChange={(e) => handleChange("timezone", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Allow Self Registration"
          description="Permit users to create accounts without invitation."
          control={renderToggle("users_allow_self_registration")}
        />
        <SettingsRow
          label="Default New User Role"
          description="Role pre-assigned when a user is created."
          control={
            <select
              value={settings.users_default_new_user_role}
              onChange={(e) => handleChange("users_default_new_user_role", e.target.value)}
              className={baseControlClass}
            >
              <option value="staff">Staff</option>
              <option value="teacher">Teacher</option>
              <option value="registrar">Registrar</option>
              <option value="accountant">Accountant</option>
              <option value="head_teacher">Head Teacher</option>
              <option value="admin">Admin</option>
            </select>
          }
        />
        <SettingsRow
          label="Require Admin Approval"
          description="Require admin approval before a new account becomes active."
          control={renderToggle("users_require_admin_approval")}
        />
        <SettingsRow
          label="Allow Custom Roles"
          description="Enable creation of extra role types beyond defaults."
          control={renderToggle("roles_allow_custom_roles")}
        />
        <SettingsRow
          label="Allow Non-Admin User Management"
          description="Allow delegated roles to manage user accounts."
          control={renderToggle("roles_allow_non_admin_user_management")}
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsRow
          label="MFA Required for Admin"
          description="Require multi-factor authentication for administrator accounts."
          control={renderToggle("security_mfa_admin_required")}
        />
        <SettingsRow
          label="Session Timeout (minutes)"
          description="Auto-sign-out duration when user is inactive."
          control={
            <input
              type="number"
              min={5}
              step={5}
              value={settings.security_session_timeout_minutes}
              onChange={(e) => handleChange("security_session_timeout_minutes", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Password Minimum Length"
          description="Minimum number of characters required for passwords."
          control={
            <input
              type="number"
              min={6}
              value={settings.security_password_min_length}
              onChange={(e) => handleChange("security_password_min_length", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Password Expiry (days)"
          description="Number of days before users must reset password."
          control={
            <input
              type="number"
              min={0}
              value={settings.security_password_expiry_days}
              onChange={(e) => handleChange("security_password_expiry_days", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Max Login Attempts"
          description="Allowed failed attempts before lockout."
          control={
            <input
              type="number"
              min={1}
              value={settings.security_max_login_attempts}
              onChange={(e) => handleChange("security_max_login_attempts", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Lockout Duration (minutes)"
          description="How long the account remains locked after violations."
          control={
            <input
              type="number"
              min={1}
              value={settings.security_lockout_minutes}
              onChange={(e) => handleChange("security_lockout_minutes", e.target.value)}
              className={baseControlClass}
            />
          }
        />
        <SettingsRow
          label="Audit Log Retention (days)"
          description="Retention period for audit and security logs."
          control={
            <input
              type="number"
              min={30}
              value={settings.security_audit_log_retention_days}
              onChange={(e) => handleChange("security_audit_log_retention_days", e.target.value)}
              className={baseControlClass}
            />
          }
        />
      </SettingsSection>

      <div className="neo-card sticky bottom-6 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50/90 px-6 py-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          {dirty ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-bold text-amber-600">Unsaved changes</span>
              <button
                type="button"
                onClick={discardChanges}
                className="text-sm font-bold text-slate-500 underline underline-offset-2 hover:text-slate-800 transition"
              >
                Discard
              </button>
            </>
          ) : (
            <span className="text-sm font-bold text-slate-400">All changes saved</span>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={
            saving ||
            !dirty ||
            !settings.school_name?.trim() ||
            !settings.academic_year?.trim() ||
            !settings.currency_code?.trim() ||
            !settings.country?.trim()
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0c2340] to-[#1a3a5c] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#0c2340]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:pointer-events-none disabled:opacity-60"
        >
          {saving && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {toast ? (
        <div className="fixed bottom-24 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold shadow-2xl backdrop-blur-md ${
            toast.type === "success" ? "bg-emerald-50/90 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50/90 text-red-800 ring-1 ring-red-200"
          }`}>
            <span>{toast.type === "success" ? "✅" : "❌"}</span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 rounded-full p-1 opacity-70 hover:bg-black/5 hover:opacity-100 transition">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section>
      <h2 className="mb-3 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h2>
      <div className="neo-card overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
        {children}
      </div>
    </section>
  );
}

type SettingsRowProps = {
  label: string;
  description: string;
  control: React.ReactNode;
};

function SettingsRow({ label, description, control }: SettingsRowProps) {
  // If it's a required field visually based on our previous logic, we check label text
  const isRequired = ["School Name", "Academic Year", "Currency Code", "Country"].includes(label);

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:px-6 last:border-b-0 hover:bg-slate-50/50 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </p>
        <p className="mt-1 max-w-xl text-xs font-semibold text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="shrink-0 flex sm:justify-end">{control}</div>
    </div>
  );
}
