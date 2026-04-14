import { useState } from "react";
import { DailyExpensesPage } from "./expenses/DailyExpensesPage";
import { DailyLedgerPage } from "./ledger/DailyLedgerPage";
import { FinanceOverviewPage } from "./overview/FinanceOverviewPage";
import { RecordStudentPaymentPage } from "./payments/RecordStudentPaymentPage";
import { PayrollSummaryPage } from "./payroll/PayrollSummaryPage";
import { AdminDailyReportsPage } from "./reports/AdminDailyReportsPage";
import { DebtorsReportPage } from "./reports/DebtorsReportPage";

export type FinanceSection =
  | "overview"
  | "daily_report"
  | "debtors_report"
  | "record_payment"
  | "bursery"
  | "staff_payment"
  | "finance_summary";

const sectionTitle: Record<FinanceSection, string> = {
  overview: "Financial Overview",
  daily_report: "Daily Ledger",
  debtors_report: "Debtors Report",
  record_payment: "Record Student Payment",
  bursery: "Daily Expenses",
  staff_payment: "Payroll Summary",
  finance_summary: "Admin Daily Reports",
};

export function FinanceSectionPage({
  section,
  onChangeSection,
}: {
  section: FinanceSection;
  onChangeSection: (value: FinanceSection) => void;
}) {
  const [ledgerDate, setLedgerDate] = useState<string | undefined>(undefined);

  const navigateToLedger = (date: string) => {
    setLedgerDate(date);
    onChangeSection("daily_report");
  };

  const cards: Array<{ key: FinanceSection; desc: string; icon: string; color: string }> = [
    { key: "record_payment", desc: "Record payments and print DB-backed receipts.", icon: "💳", color: "from-[#eef2f7] to-[#e0e7f1]" },
    { key: "daily_report", desc: "Track ledger entries for the selected day.", icon: "📚", color: "from-[#fdfcfb] to-[#f4f1ee]" },
    { key: "finance_summary", desc: "Run daily report submission and review flow.", icon: "📑", color: "from-[#f5fbf8] to-[#e8f5ed]" },
    { key: "bursery", desc: "Capture day expenses into the school ledger.", icon: "🛒", color: "from-[#fff9f4] to-[#ffeadb]" },
    { key: "staff_payment", desc: "View payroll totals and arrears by month.", icon: "👥", color: "from-[#f8f9ff] to-[#e8ebf9]" },
    { key: "debtors_report", desc: "Review student debtors and outstanding balances.", icon: "📉", color: "from-[#fff5f5] to-[#ffe8e8]" },
  ];

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

  if (section === "record_payment") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.record_payment, "Capture fee payments and issue receipts.")}
        <RecordStudentPaymentPage />
      </div>
    );
  }

  if (section === "daily_report") {
    return (
      <div className="min-w-0 space-y-4">
        {renderHeader(sectionTitle.daily_report, "Detailed tracking of daily income and expenses.")}
        <DailyLedgerPage initialDate={ledgerDate} />
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
        {cards.map((card) => (
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
