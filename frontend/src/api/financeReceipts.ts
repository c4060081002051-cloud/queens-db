import { createFinancePayment } from "./financePayments";
import type { StudentPaymentReceipt } from "../components/finance/shared/financeTypes";

export type StudentFeeReceiptApiRow = StudentPaymentReceipt;

export async function createStudentFeeReceipt(body: {
  studentId: number;
  term: string;
  paymentMethod: string;
  paidBy: string;
  amountPaid: number;
  amountDueUgx?: number;
}): Promise<StudentFeeReceiptApiRow> {
  return createFinancePayment(body);
}
