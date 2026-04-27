import { useState } from "react";
import { BuseryPage, type BuseryRecord } from "./BuseryPage";
import { DailyExpensesPage } from "./expenses/DailyExpensesPage";
import { DailyLedgerPage } from "./ledger/DailyLedgerPage";
import { FinanceOverviewPage } from "./overview/FinanceOverviewPage";
import { AssignFeesPage } from "./payments/AssignFeesPage";
import { ReceiptsHistoryPage } from "./payments/ReceiptsHistoryPage";
import { RecordStudentPaymentPage } from "./payments/RecordStudentPaymentPage";
import { PayrollSummaryPage } from "./payroll/PayrollSummaryPage";
import { AdminDailyReportsPage } from "./reports/AdminDailyReportsPage";
import { DebtorsReportPage } from "./reports/DebtorsReportPage";
import { AssignBurseryPage } from "./AssignBurseryPage";

export type FinanceSection =
  | "overview"
  | "daily_report"
  | "debtors_report"
  | "assign_fees"
  | "record_payment"
  | "receipts"
  | "bursery"
  | "busery"
  | "bursery_assignment"
  | "staff_payment"
  | "finance_summary";

function hasFinancePermission(user: any, permissionKey: string): boolean {
  const role = String(user?.role ?? "").toLowerCase();
  if (role === "admin" || role === "super_admin") return true;
  return Array.isArray(user?.permissions) && user.permissions.includes(permissionKey);
}

function requiredPermissionForSection(section: FinanceSection): string | null {
  if (section === "assign_fees") return "finance_assign_fees";
  if (section === "record_payment" || section === "receipts" || section === "bursery") return "finance_record_payments";
  if (section === "busery" || section === "bursery_assignment") return "finance_bursary";
  if (section === "staff_payment") return "finance_staff_pay";
  if (section === "finance_summary") return "finance_summaries";
  if (section === "daily_report" || section === "debtors_report") return "finance_reports";
  return null;
}

const sectionTitle: Record<FinanceSection, string> = {
  overview: "Financial Overview",
  daily_report: "Daily Ledger",
  debtors_report: "Debtors Report",
  assign_fees: "Assign Fees",
  record_payment: "Record Student Payment",
  receipts: "Receipts",
  bursery: "Record expences",
  busery: "Busery",
  bursery_assignment: "Assign Student Bursary",
  staff_payment: "Payroll Summary",
  finance_summary: "Admin Daily Reports",
};

export function FinanceSectionPage({
  section,
  onChangeSection,
  user,
}: {
  section: FinanceSection;
  onChangeSection: (value: FinanceSection) => void;
  user: any;
}) {
  const [ledgerDate, setLedgerDate] = useState<string | undefined>(undefined);
  const [selectedBuseryRecord, setSelectedBuseryRecord] = useState<BuseryRecord | null>(null);

  const navigateToLedger = (date: string) => {
    setLedgerDate(date);
    onChangeSection("daily_report");
  };

  const cards: Array<{ key: FinanceSection; desc: string; icon: string; color: string }> = [
    { key: "record_payment", desc: "Record payments and print DB-backed receipts.", icon: "💳", color: "from-[#eef2f7] to-[#e0e7f1]" },
    { key: "receipts", desc: "View, reopen, and print all saved receipts.", icon: "🧾", color: "from-[#f8fbff] to-[#e8f0ff]" },
    { key: "assign_fees", desc: "Assign and adjust student term fees for accountants.", icon: "🧮", color: "from-[#eef7ff] to-[#dcecff]" },
    { key: "daily_report", desc: "Track ledger entries for the selected day.", icon: "📚", color: "from-[#fdfcfb] to-[#f4f1ee]" },
    { key: "finance_summary", desc: "Run daily report submission and review flow.", icon: "📑", color: "from-[#f5fbf8] to-[#e8f5ed]" },
    { key: "staff_payment", desc: "View payroll totals and arrears by month.", icon: "👥", color: "from-[#f8f9ff] to-[#e8ebf9]" },
    { key: "busery", desc: "Open the bursery expenses page.", icon: "🧾", color: "from-[#fff9f4] to-[#ffeadb]" },
    { key: "bursery", desc: "Capture day expenses into the school ledger.", icon: "🛒", color: "from-[#fff9f4] to-[#ffeadb]" },
    { key: "debtors_report", desc: "Review student debtors and outstanding balances.", icon: "📉", color: "from-[#fff5f5] to-[#ffe8e8]" },
  ];
  const visibleCards = cards.filter((card) => {
    const required = requiredPermissionForSection(card.key);
    if (!required) return true;
    return hasFinancePermission(user, required);
  });
  const sectionRequiredPermission = requiredPermissionForSection(section);
  const sectionAllowed =
    section === "overview" ||
    !sectionRequiredPermission ||
    hasFinancePermission(user, sectionRequiredPermission);

  const renderHeader = (title: string, subtitle?: string) => (
    <header className="mb-6 flex flex-col gap-2 border-b border-[#ebe4d9]/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#636e72]">{subtitle}</p>}
      </div>
      {section !== "overview" && (
        <button
          onClick={() => onChangeSection("overview")}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#5a8faf] shadow-sm ring-1 ring-[#ebe4d9] transition hover:bg-[#f8fbff]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Overview
        </button>
      )}
    </header>
  );

  if (!sectionAllowed) {
    return (
      <div className="neo-card rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm font-semibold text-amber-900">
        You do not have permission to view this finance section. Contact admin to grant access.
      </div>
    );
  }

  if (section === "record_payment") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.record_payment, "Capture fee payments and issue receipts.")}
        <RecordStudentPaymentPage />
      </div>
    );
  }

  if (section === "assign_fees") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.assign_fees, "Search students and assign term fee amounts.")}
        <AssignFeesPage />
      </div>
    );
  }

  if (section === "receipts") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.receipts, "Review all generated receipts and reprint when needed.")}
        <ReceiptsHistoryPage />
      </div>
    );
  }

  if (section === "daily_report") {
    const canViewPastRecords = hasFinancePermission(user, "finance_past_ledger");
    const isAdmin =
      String(user?.role ?? "").toLowerCase() === "admin" ||
      String(user?.role ?? "").toLowerCase() === "super_admin";
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.daily_report, "Detailed tracking of daily income and expenses.")}
        <DailyLedgerPage
          initialDate={ledgerDate}
          canViewPastRecords={canViewPastRecords}
          isAdmin={isAdmin}
        />
      </div>
    );
  }


  if (section === "debtors_report") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.debtors_report, "Monitor students with outstanding fee balances.")}
        <DebtorsReportPage />
      </div>
    );
  }

  if (section === "bursery") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.bursery, "Log operational expenses into the system.")}
        <DailyExpensesPage />
      </div>
    );
  }

  if (section === "busery") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.busery, "Track bursary awards and support records.")}
        <BuseryPage 
          isAdmin={user?.role === "admin"} 
          onAssignClick={() => {
            setSelectedBuseryRecord(null);
            onChangeSection("bursery_assignment");
          }}
          onEditRow={(row) => {
            setSelectedBuseryRecord(row);
            onChangeSection("bursery_assignment");
          }}
        />
      </div>
    );
  }

  if (section === "bursery_assignment") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.bursery_assignment, "Assign percentage-based discounts to students.")}
        <AssignBurseryPage
          initialStudentId={selectedBuseryRecord?.id}
          initialTerm={selectedBuseryRecord?.term}
          initialPercentage={selectedBuseryRecord?.coverageLabel.replace("%", "")}
        />
      </div>
    );
  }

  if (section === "staff_payment") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.staff_payment, "Management of staff salaries and payment history.")}
        <PayrollSummaryPage />
      </div>
    );
  }

  if (section === "finance_summary") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.finance_summary, "Review and close daily financial records.")}
        <AdminDailyReportsPage onViewLedger={navigateToLedger} />
      </div>
    );
  }


  return (
    <div className="min-w-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="border-b border-[#ebe4d9]/80 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-[#2d3436]">Finance Command Center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#636e72]">
          Monitor real-time cash flow, manage fee collections, and track school expenditures from a unified dashboard.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => onChangeSection(card.key)}
            className={`group neo-card text-left p-5 transition-all hover:translate-y-[-2px] hover:shadow-lg bg-gradient-to-br ${card.color}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl" role="img" aria-label={card.key}>{card.icon}</span>
              <svg className="h-5 w-5 text-[#5a8faf] opacity-0 group-hover:opacity-100 transition-opacity translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#2d3436] group-hover:text-[#5a8faf] transition-colors">{sectionTitle[card.key]}</h2>
            <p className="mt-1 text-xs text-[#636e72] leading-relaxed">{card.desc}</p>
          </button>
        ))}
      </section>

      <div className="pt-4 border-t border-[#ebe4d9]/50">
        <FinanceOverviewPage />
      </div>
    </div>
  );
}
