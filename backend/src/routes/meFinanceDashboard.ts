import { Router } from "express";
import { Op, fn, col } from "sequelize";
import {
  DailyExpenseEntry,
  DailyFinanceReport,
  StaffPayrollEntry,
  StudentFeePayment,
} from "../models/index.js";

function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function createMeFinanceDashboardRouter() {
  const r = Router();

  r.get("/finance/dashboard", async (req, res) => {
    try {
      const today = ymd();
      const ymRaw = typeof req.query.month === "string" ? req.query.month.trim() : "";
      const monthKey = /^\d{4}-\d{2}$/.test(ymRaw) ? ymRaw : today.slice(0, 7);
      const [y, m] = monthKey.split("-").map(Number);
      const monthStart = `${monthKey}-01`;
      const monthEnd = `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

      const [todayPaymentsRaw, todayExpensesRaw, report, payrollRows] = await Promise.all([
        StudentFeePayment.sum("amount_paid_ugx", {
          where: { createdAt: { [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`] } },
        }),
        DailyExpenseEntry.sum("amount_ugx", { where: { expenseDate: today } }),
        DailyFinanceReport.findOne({ where: { reportDate: today } }),
        StaffPayrollEntry.findAll({
          where: { monthKey },
          order: [["created_at", "DESC"]],
        }),
      ]);

      const [monthIncomeRaw, monthExpensesRaw] = await Promise.all([
        StudentFeePayment.sum("amount_paid_ugx", {
          where: { createdAt: { [Op.between]: [`${monthStart} 00:00:00`, `${monthEnd} 23:59:59`] } },
        }),
        DailyExpenseEntry.sum("amount_ugx", {
          where: { expenseDate: { [Op.between]: [monthStart, monthEnd] } },
        }),
      ]);

      const totalPayroll = payrollRows.reduce((acc, r) => acc + (Number(r.grossAmountUgx) || 0), 0);
      const paidPayroll = payrollRows.reduce((acc, r) => acc + (Number(r.paidAmountUgx) || 0), 0);
      const payrollArrears = payrollRows.reduce((acc, r) => acc + (Number(r.arrearsUgx) || 0), 0);

      return res.json({
        today: {
          date: today,
          feesReceived: Number(todayPaymentsRaw ?? 0) || 0,
          expenses: Number(todayExpensesRaw ?? 0) || 0,
          net: (Number(todayPaymentsRaw ?? 0) || 0) - (Number(todayExpensesRaw ?? 0) || 0),
          reportStatus: report?.status ?? "not_submitted",
          isReopened: report?.isReopened ?? false,
          reopenedReason: report?.reopenedReason ?? null,
        },
        month: {
          key: monthKey,
          totalIncome: Number(monthIncomeRaw ?? 0) || 0,
          totalExpenses: Number(monthExpensesRaw ?? 0) || 0,
          net: (Number(monthIncomeRaw ?? 0) || 0) - (Number(monthExpensesRaw ?? 0) || 0),
        },
        payroll: {
          monthKey,
          totalPayroll,
          paidToDate: paidPayroll,
          arrears: payrollArrears,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
