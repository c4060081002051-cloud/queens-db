import { useCallback, useEffect, useState } from "react";
import {
  markAllMessagesRead,
  markAllNotificationsRead,
  fetchMessages,
  fetchNotifications,
} from "./api/inbox";
import {
  fetchDashboard,
  type DashboardPayload,
} from "./api/dashboard";
import { AdminLayout, type AdminUser } from "./components/admin/AdminLayout";
import { InboxDetailView } from "./components/inbox/InboxDetailView";
import { InboxListView } from "./components/inbox/InboxListView";
import type { InboxItem } from "./components/admin/headerInboxDemo";
import { SettingsModesPanel } from "./components/settings/SettingsModesPanel";
import { SettingsFeesStructurePanel } from "./components/settings/SettingsFeesStructurePanel";
import { SettingsUsersRolesPanel } from "./components/settings/SettingsUsersRolesPanel";
import { ExpensesAllPage } from "./components/expenses/ExpensesAllPage";
import {
  FinanceSectionPage,
  type FinanceSection,
} from "./components/finance/FinanceSectionPage";
import {
  StudentsSectionPage,
  type StudentNavSection,
} from "./components/students/StudentsSectionPage";
import {
  StaffSectionPage,
  type StaffNavSection,
  type TeachingSection,
  type NonTeachingCategory,
} from "./components/staff/StaffSectionPage";
import {
  ClassesSectionPage,
  type ClassesSection,
} from "./components/classes/ClassesSectionPage";
import {
  CurriculumSectionPage,
  type CurriculumSection,
} from "./components/curriculum/CurriculumSectionPage";
import { NoticeBoardPage } from "./components/communication/NoticeBoardPage";
import { formatShortAgo } from "./utils/formatShortAgo";
import { HeadTeacherOverview } from "./components/dashboard/HeadTeacherOverview";
import { DOSOverview } from "./components/dashboard/DOSOverview";
import { AccountantOverview } from "./components/dashboard/AccountantOverview";

type DashboardProps = {
  user: AdminUser | null;
  profileLoading: boolean;
  profileError: string | null;
  onLogout: () => void;
  onAccountUpdated?: () => void;
};

const DASHBOARD_VIEW_STATE_KEY = "junior_school_dashboard_view_state";

type InboxScreen =
  | { screen: "home" }
  | { screen: "list"; kind: "notifications" | "messages" }
  | { screen: "detail"; kind: "notifications" | "messages"; id: number };

type PersistedViewState = {
  settingsPanel: string | null;
  inboxScreen: InboxScreen;
  mainView:
    | "dashboard"
    | "expenses"
    | "students"
    | "staff"
    | "finance"
    | "classes"
    | "curriculum"
    | "communication";
  studentSection: StudentNavSection;
  staffSection: StaffNavSection;
  teachingSection: TeachingSection;
  nonTeachingCategory: NonTeachingCategory;
  financeSection: FinanceSection;
  classesSection: ClassesSection;
  curriculumSection: CurriculumSection;
  selectedClassName: string | null;
};

function readPersistedViewState(): PersistedViewState | null {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_VIEW_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedViewState>;
    const mainView =
      parsed.mainView === "expenses" ||
      parsed.mainView === "students" ||
      parsed.mainView === "staff" ||
      parsed.mainView === "finance" ||
      parsed.mainView === "classes" ||
      parsed.mainView === "curriculum" ||
      parsed.mainView === "communication"
        ? parsed.mainView
        : "dashboard";
    const studentSection =
      parsed.studentSection === "admissions" ||
      parsed.studentSection === "import"
        ? parsed.studentSection
        : "all";
    const staffSection =
      parsed.staffSection === "nonTeaching" || parsed.staffSection === "teaching"
        ? parsed.staffSection
        : "teaching";
    const teachingSection =
      parsed.teachingSection === "kindergarten" ||
      parsed.teachingSection === "lower_primary" ||
      parsed.teachingSection === "upper_primary" ||
      parsed.teachingSection === "all"
        ? parsed.teachingSection
        : "all";
    const nonTeachingCategory =
      parsed.nonTeachingCategory === "administration" ||
      parsed.nonTeachingCategory === "finance" ||
      parsed.nonTeachingCategory === "library" ||
      parsed.nonTeachingCategory === "health" ||
      parsed.nonTeachingCategory === "operations" ||
      parsed.nonTeachingCategory === "all"
        ? parsed.nonTeachingCategory
        : "all";
    const financeSection =
      parsed.financeSection === "daily_report" ||
      parsed.financeSection === "debtors_report" ||
      parsed.financeSection === "record_payment" ||
      parsed.financeSection === "bursery" ||
      parsed.financeSection === "busery" ||
      parsed.financeSection === "staff_payment" ||
      parsed.financeSection === "finance_summary" ||
      parsed.financeSection === "overview"
        ? parsed.financeSection
        : "overview";
    const classesSection: ClassesSection =
      parsed.classesSection === "all_classes" ||
      parsed.classesSection === "sections_streams" ||
      parsed.classesSection === "class_students" ||
      parsed.classesSection === "class_teachers" ||
      parsed.classesSection === "class_categories" ||
      parsed.classesSection === "class_reports"
        ? parsed.classesSection
        : "all_classes";
    const curriculumSection: CurriculumSection =
      parsed.curriculumSection === "exam_bot" ||
      parsed.curriculumSection === "exam_mid" ||
      parsed.curriculumSection === "exam_eot" ||
      parsed.curriculumSection === "assessment_tests" ||
      parsed.curriculumSection === "result_entry" ||
      parsed.curriculumSection === "blank_page"
        ? parsed.curriculumSection
        : "exam_bot";
    const inboxScreen: InboxScreen =
      parsed.inboxScreen?.screen === "list" &&
      (parsed.inboxScreen.kind === "notifications" || parsed.inboxScreen.kind === "messages")
        ? { screen: "list", kind: parsed.inboxScreen.kind }
        : parsed.inboxScreen?.screen === "detail" &&
            (parsed.inboxScreen.kind === "notifications" ||
              parsed.inboxScreen.kind === "messages") &&
            Number.isFinite(parsed.inboxScreen.id)
          ? { screen: "detail", kind: parsed.inboxScreen.kind, id: Number(parsed.inboxScreen.id) }
          : { screen: "home" };
    return {
      settingsPanel: typeof parsed.settingsPanel === "string" ? parsed.settingsPanel : null,
      inboxScreen,
      mainView,
      studentSection,
      staffSection,
      teachingSection,
      nonTeachingCategory,
      financeSection,
      classesSection,
      curriculumSection,
      selectedClassName:
        typeof parsed.selectedClassName === "string" ? parsed.selectedClassName : null,
    };
  } catch {
    return null;
  }
}

function mapToHeaderItems(rows: { id: number; title: string; body: string; read: boolean; createdAt: string }[]): InboxItem[] {
  return rows.map((x) => ({
    id: String(x.id),
    title: x.title,
    body: x.body,
    read: x.read,
    time: formatShortAgo(x.createdAt),
  }));
}

export function Dashboard({
  user,
  profileLoading,
  profileError,
  onLogout,
  onAccountUpdated,
}: DashboardProps) {
  const initialView = readPersistedViewState();
  const [settingsPanel, setSettingsPanel] = useState<string | null>(
    initialView?.settingsPanel ?? null,
  );
  const [inboxScreen, setInboxScreen] = useState<InboxScreen>(
    initialView?.inboxScreen ?? { screen: "home" },
  );
  const [headerNotifications, setHeaderNotifications] = useState<InboxItem[]>([]);
  const [headerMessages, setHeaderMessages] = useState<InboxItem[]>([]);
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [mainView, setMainView] = useState<
    "dashboard" | "expenses" | "students" | "staff" | "finance" | "classes" | "curriculum" | "communication"
  >(
    initialView?.mainView ?? "dashboard",
  );
  const [studentSection, setStudentSection] = useState<StudentNavSection>(
    initialView?.studentSection ?? "all",
  );
  const [staffSection, setStaffSection] = useState<StaffNavSection>(
    initialView?.staffSection ?? "teaching",
  );
  const [teachingSection, setTeachingSection] = useState<TeachingSection>(
    initialView?.teachingSection ?? "all",
  );
  const [nonTeachingCategory, setNonTeachingCategory] = useState<NonTeachingCategory>(
    initialView?.nonTeachingCategory ?? "all",
  );
  const [financeSection, setFinanceSection] = useState<FinanceSection>(
    initialView?.financeSection ?? "overview",
  );
  const [classesSection, setClassesSection] = useState<ClassesSection>(
    initialView?.classesSection ?? "all_classes",
  );
  const [curriculumSection, setCurriculumSection] = useState<CurriculumSection>(
    initialView?.curriculumSection ?? "exam_bot",
  );
  const [selectedClassName, setSelectedClassName] = useState<string | null>(
    initialView?.selectedClassName ?? null,
  );

  const refreshHeaderInbox = useCallback(async () => {
    try {
      const [n, m] = await Promise.all([
        fetchNotifications({ unreadOnly: true }),
        fetchMessages({ unreadOnly: true }),
      ]);
      setHeaderNotifications(mapToHeaderItems(n));
      setHeaderMessages(mapToHeaderItems(m));
    } catch {
      setHeaderNotifications([]);
      setHeaderMessages([]);
    }
  }, []);

  useEffect(() => {
    void refreshHeaderInbox();
  }, [refreshHeaderInbox]);

  useEffect(() => {
    if (settingsPanel === "modes") return;
    if (inboxScreen.screen !== "home") return;
    let cancelled = false;
    setDashLoading(true);
    setDashError(null);
    void fetchDashboard({ calendarMonth: "2026-04" })
      .then((data) => {
        if (!cancelled) setDash(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setDashError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inboxScreen.screen, settingsPanel]);

  useEffect(() => {
    try {
      const value: PersistedViewState = {
        settingsPanel,
        inboxScreen,
        mainView,
        studentSection,
        staffSection,
        teachingSection,
        nonTeachingCategory,
        financeSection,
        classesSection,
        curriculumSection,
        selectedClassName,
      };
      sessionStorage.setItem(DASHBOARD_VIEW_STATE_KEY, JSON.stringify(value));
    } catch {
      // Ignore storage failures (e.g. privacy mode/storage disabled).
    }
  }, [settingsPanel, inboxScreen, mainView, studentSection, staffSection, teachingSection, nonTeachingCategory, financeSection, classesSection, curriculumSection, selectedClassName]);
  return (
    <AdminLayout
      user={user}
      profileLoading={profileLoading}
      onLogout={onLogout}
      headerNotifications={headerNotifications}
      headerMessages={headerMessages}
      onMarkAllNotificationsRead={async () => {
        await markAllNotificationsRead();
        await refreshHeaderInbox();
      }}
      onMarkAllMessagesRead={async () => {
        await markAllMessagesRead();
        await refreshHeaderInbox();
      }}
      onOpenNotificationFromHeader={(id) => {
        setSettingsPanel(null);
        setInboxScreen({
          screen: "detail",
          kind: "notifications",
          id: Number.parseInt(id, 10),
        });
      }}
      onOpenMessageFromHeader={(id) => {
        setSettingsPanel(null);
        setInboxScreen({
          screen: "detail",
          kind: "messages",
          id: Number.parseInt(id, 10),
        });
      }}
      onReadMoreNotifications={() => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "list", kind: "notifications" });
      }}
      onReadMoreMessages={() => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "list", kind: "messages" });
      }}
      onOpenInboxList={(kind) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "list", kind });
      }}
      onDashboardHome={() => {
        setMainView("dashboard");
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
      }}
      onSelectSettingsPanel={(panel) => {
        setInboxScreen({ screen: "home" });
        setSettingsPanel(panel);
      }}
      onSelectStudentSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("students");
        setStudentSection(section);
      }}
      onSelectStaffSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("staff");
        setStaffSection(section);
      }}
      onSelectTeachingSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("staff");
        setStaffSection("teaching");
        setTeachingSection(section);
      }}
      onSelectNonTeachingCategory={(category) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("staff");
        setStaffSection("nonTeaching");
        setNonTeachingCategory(category);
      }}
      onSelectClassList={(className) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setSelectedClassName(className);
        setMainView("students");
        setStudentSection("all");
      }}
      onSelectClassSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("classes");
        setClassesSection(section);
      }}
      onSelectFinanceSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("finance");
        setFinanceSection(section);
      }}
      onSelectCurriculumSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("curriculum");
        setCurriculumSection(section);
      }}
      onSelectCommunicationSection={() => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("communication");
      }}
      onAccountUpdated={onAccountUpdated}
    >
      <main className="dashboard-main-padding">
        {settingsPanel === "modes" ? <SettingsModesPanel /> : null}
        {settingsPanel === "fees_structure" ? <SettingsFeesStructurePanel /> : null}
        {settingsPanel === "users_roles" ? <SettingsUsersRolesPanel /> : null}
        {settingsPanel === "modes" ||
        settingsPanel === "fees_structure" ||
        settingsPanel === "users_roles" ? null : inboxScreen.screen !== "home" ? (
          inboxScreen.screen === "list" ? (
            <InboxListView
              kind={inboxScreen.kind}
              onBack={() => setInboxScreen({ screen: "home" })}
              onSelectItem={(id) =>
                setInboxScreen({
                  screen: "detail",
                  kind: inboxScreen.kind,
                  id,
                })
              }
              onInboxChanged={refreshHeaderInbox}
            />
          ) : (
            <InboxDetailView
              kind={inboxScreen.kind}
              id={inboxScreen.id}
              onBack={() =>
                setInboxScreen({
                  screen: "list",
                  kind: inboxScreen.kind,
                })
              }
              onInboxChanged={refreshHeaderInbox}
            />
          )
        ) : mainView === "expenses" ? (
          <ExpensesAllPage />
        ) : mainView === "students" ? (
          <StudentsSectionPage
            section={studentSection}
            classNameFilter={selectedClassName}
            onChangeSection={setStudentSection}
          />
        ) : mainView === "staff" ? (
          <StaffSectionPage
            section={staffSection}
            teachingSection={teachingSection}
            nonTeachingCategory={nonTeachingCategory}
            onChangeTeachingSection={setTeachingSection}
            onChangeNonTeachingCategory={setNonTeachingCategory}
          />
        ) : mainView === "finance" ? (
          <FinanceSectionPage
            section={financeSection}
            onChangeSection={setFinanceSection}
            user={user}
          />
        ) : mainView === "classes" ? (
          <ClassesSectionPage section={classesSection} />
        ) : mainView === "curriculum" ? (
          <CurriculumSectionPage section={curriculumSection} />
        ) : mainView === "communication" ? (
          <NoticeBoardPage user={user} />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {profileError || dashError ? (
              <div className="neo-card mb-6 px-4 py-3 text-sm text-[#2d3436]" role="alert">
                {profileError || dashError}
              </div>
            ) : null}
            {user?.permissions?.includes("nav_curriculum") ? (
              <DOSOverview dash={dash} loading={dashLoading} />
            ) : user?.permissions?.includes("nav_operations") ? (
              <AccountantOverview dash={dash} loading={dashLoading} />
            ) : (
              <HeadTeacherOverview dash={dash} loading={dashLoading} />
            )}
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
