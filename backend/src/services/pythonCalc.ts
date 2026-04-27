const PY_CALC_BASE_URL = (process.env.PY_CALC_BASE_URL ?? "http://127.0.0.1:8100").replace(
  /\/+$/,
  "",
);

function toMoneyInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${PY_CALC_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Python calc service error (${response.status}): ${text || "no details"}`);
  }
  return (await response.json()) as T;
}

export type PaymentSummary = {
  previousPaidUgx: number;
  amountPaidUgx: number;
  targetDueUgx: number;
  totalAfterUgx: number;
  totalFeesDueUgx: number;
  outstandingAfterUgx: number;
  creditAmountUgx: number;
};

export async function calculatePaymentSummary(input: {
  previousPaidUgx: number;
  amountPaidUgx: number;
  targetDueUgx: number;
}): Promise<PaymentSummary> {
  try {
    return await postJson<PaymentSummary>("/v1/finance/payment-summary", input);
  } catch (error) {
    // Keep finance flows operational if the Python calc service is unavailable.
    console.warn("[python-calc] Falling back to local payment summary calculation.", error);
    const previousPaidUgx = clampNonNegative(toMoneyInt(input.previousPaidUgx));
    const amountPaidUgx = clampNonNegative(toMoneyInt(input.amountPaidUgx));
    const targetDueUgx = clampNonNegative(toMoneyInt(input.targetDueUgx));
    const totalAfterUgx = previousPaidUgx + amountPaidUgx;
    const totalFeesDueUgx = targetDueUgx;
    return {
      previousPaidUgx,
      amountPaidUgx,
      targetDueUgx,
      totalAfterUgx,
      totalFeesDueUgx,
      outstandingAfterUgx: clampNonNegative(totalFeesDueUgx - totalAfterUgx),
      creditAmountUgx: clampNonNegative(totalAfterUgx - totalFeesDueUgx),
    };
  }
}

export type StatementSummary = {
  totalAssignedUgx: number;
  totalPaidUgx: number;
  normalizedAssignedUgx: number;
  outstandingAmountUgx: number;
  creditAmountUgx: number;
  runningBalancesUgx: number[];
};

export async function calculateStatementSummary(input: {
  totalAssignedUgx: number;
  paymentAmountsUgx: number[];
}): Promise<StatementSummary> {
  try {
    return await postJson<StatementSummary>("/v1/finance/statement-summary", input);
  } catch (error) {
    // Keep statement endpoints available when Python service is offline.
    console.warn("[python-calc] Falling back to local statement summary calculation.", error);
    const normalizedAssignedUgx = clampNonNegative(toMoneyInt(input.totalAssignedUgx));
    const normalizedPayments = (input.paymentAmountsUgx ?? []).map((x) =>
      clampNonNegative(toMoneyInt(x)),
    );
    const runningBalancesUgx: number[] = [];
    let runningPaid = 0;
    for (const payment of normalizedPayments) {
      runningPaid += payment;
      runningBalancesUgx.push(clampNonNegative(normalizedAssignedUgx - runningPaid));
    }
    const totalPaidUgx = normalizedPayments.reduce((sum, value) => sum + value, 0);
    return {
      totalAssignedUgx: normalizedAssignedUgx,
      totalPaidUgx,
      normalizedAssignedUgx,
      outstandingAmountUgx: clampNonNegative(normalizedAssignedUgx - totalPaidUgx),
      creditAmountUgx: clampNonNegative(totalPaidUgx - normalizedAssignedUgx),
      runningBalancesUgx,
    };
  }
}
