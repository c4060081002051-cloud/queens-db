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
  const cards: Array<{ key: FinanceSection; desc: string }> = [
    { key: "record_payment", desc: "Record payments and print DB-backed receipts." },
    { key: "daily_report", desc: "Track ledger entries for the selected day." },
    { key: "finance_summary", desc: "Run submit/review/close/reopen daily report flow." },
    { key: "bursery", desc: "Capture day expenses into the ledger." },
    { key: "staff_payment", desc: "View payroll totals and arrears by month." },
    { key: "debtors_report", desc: "Review student debtors." },
  ];
  if (section === "record_payment") {
    return (
      <div className="min-w-0 space-y-4">
        <header className="border-b border-[#ebe4d9]/80 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{sectionTitle.record_payment}</h1>
        </header>
        <RecordStudentPaymentPage />
      </div>
    );
  }

  if (section === "daily_report") {
    return (
      <div className="min-w-0 space-y-4">
        <header className="border-b border-[#ebe4d9]/80 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{sectionTitle.daily_report}</h1>
        </header>
        <DailyLedgerPage />
      </div>
    );
  }

  if (section === "debtors_report") {
    return (
      <div className="min-w-0 space-y-4">
        <header className="border-b border-[#ebe4d9]/80 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{sectionTitle.debtors_report}</h1>
        </header>
        <DebtorsReportPage />
      </div>
    );
  }

  if (section === "bursery") {
    return (
      <div className="min-w-0 space-y-4">
        <header className="border-b border-[#ebe4d9]/80 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{sectionTitle.bursery}</h1>
        </header>
        <DailyExpensesPage />
      </div>
    );
  }

  if (section === "staff_payment") {
    return (
      <div className="min-w-0 space-y-4">
        <header className="border-b border-[#ebe4d9]/80 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{sectionTitle.staff_payment}</h1>
        </header>
        <PayrollSummaryPage />
      </div>
    );
  }

  if (section === "finance_summary") {
    return (
      <div className="min-w-0 space-y-4">
        <header className="border-b border-[#ebe4d9]/80 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{sectionTitle.finance_summary}</h1>
        </header>
        <AdminDailyReportsPage />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="border-b border-[#ebe4d9]/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">Financial Overview</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#636e72]">
          Template-aligned dashboard for payments, ledger, reports, expenses, and payroll.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => onChangeSection(card.key)}
            className="neo-card text-left p-5 transition hover:brightness-105"
          >
            <h2 className="text-base font-bold text-[#2d3436]">{sectionTitle[card.key]}</h2>
            <p className="mt-2 text-sm text-[#636e72]">{card.desc}</p>
          </button>
        ))}
      </section>
      <FinanceOverviewPage />
    </div>
  );
}
