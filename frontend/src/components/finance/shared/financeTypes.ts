import type { StudentApiRow } from "../../../api/students";

export type StudentPaymentReceipt = {
  id: number;
  receiptNo: string;
  issuedAt: Date;
  term: string;
  paymentMethod: string;
  paidBy: string;
  amountPaid: number;
  outstandingAfter: number;
  creditAmount: number;
  student: StudentApiRow;
  totalFeesDue: number;
  previousPaid: number;
};

export type FinanceDashboardPayload = {
  today: {
    date: string;
    feesReceived: number;
    expenses: number;
    net: number;
    reportStatus: string;
    isReopened: boolean;
    reopenedReason: string | null;
  };
  month: {
    key: string;
    totalIncome: number;
    totalExpenses: number;
    net: number;
  };
  payroll: {
    monthKey: string;
    totalPayroll: number;
    paidToDate: number;
    arrears: number;
  };
};

export type FinanceLedgerItem = {
  id: string;
  type: "income" | "expense";
  category: string;
  entity: string;
  amountUgx: number;
  method: string;
  status: string;
  receiptNo: string | null;
  at: string;
};

export type FinanceLedgerPayload = {
  date: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  };
  report: {
    id: number;
    status: string;
    isReopened: boolean;
    reopenedReason: string | null;
    adminNotes: string | null;
  } | null;
  items: FinanceLedgerItem[];
};

export type FinanceReportRow = {
  id: number;
  reportDate: string;
  status: string;
  isReopened: boolean;
  reopenedReason: string | null;
  adminNotes: string | null;
  totalEarnings: number;
  totalExpenditure: number;
  netTotal: number;
};

export type StudentStatementPayload = {
  student: StudentApiRow;
  term: string;
  assignedAmount: number;
  totalPaid: number;
  outstandingAmount: number;
  creditAmount: number;
  transactions: Array<{
    id: number;
    date: string;
    receiptNo: string;
    method: string;
    paidBy: string;
    amountPaid: number;
    runningBalance: number;
  }>;
};
