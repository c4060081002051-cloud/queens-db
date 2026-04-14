const PY_CALC_BASE_URL = (process.env.PY_CALC_BASE_URL ?? "http://127.0.0.1:8100").replace(
  /\/+$/,
  "",
);

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
  return postJson<PaymentSummary>("/v1/finance/payment-summary", input);
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
  return postJson<StatementSummary>("/v1/finance/statement-summary", input);
}
