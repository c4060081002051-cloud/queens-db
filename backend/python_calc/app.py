from fastapi import FastAPI
from pydantic import BaseModel, Field


app = FastAPI(title="Queens Finance Calculator", version="1.0.0")


def normalize_non_negative(value: float) -> int:
    if value is None:
        return 0
    try:
        n = float(value)
    except (TypeError, ValueError):
        return 0
    if n < 0:
        return 0
    return int(round(n))


class PaymentSummaryRequest(BaseModel):
    previousPaidUgx: float = Field(ge=0)
    amountPaidUgx: float = Field(gt=0)
    targetDueUgx: float = Field(ge=0)


class PaymentSummaryResponse(BaseModel):
    previousPaidUgx: int
    amountPaidUgx: int
    targetDueUgx: int
    totalAfterUgx: int
    totalFeesDueUgx: int
    outstandingAfterUgx: int
    creditAmountUgx: int


class StatementSummaryRequest(BaseModel):
    totalAssignedUgx: float = Field(ge=0)
    paymentAmountsUgx: list[float] = Field(default_factory=list)


class StatementSummaryResponse(BaseModel):
    totalAssignedUgx: int
    totalPaidUgx: int
    normalizedAssignedUgx: int
    outstandingAmountUgx: int
    creditAmountUgx: int
    runningBalancesUgx: list[int]


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true"}


@app.post("/v1/finance/payment-summary", response_model=PaymentSummaryResponse)
def payment_summary(payload: PaymentSummaryRequest) -> PaymentSummaryResponse:
    previous_paid = normalize_non_negative(payload.previousPaidUgx)
    amount_paid = normalize_non_negative(payload.amountPaidUgx)
    target_due = normalize_non_negative(payload.targetDueUgx)

    total_after = previous_paid + amount_paid
    total_fees_due = max(target_due, total_after)
    outstanding_after = max(total_fees_due - total_after, 0)
    credit_amount = max(total_after - total_fees_due, 0)

    return PaymentSummaryResponse(
        previousPaidUgx=previous_paid,
        amountPaidUgx=amount_paid,
        targetDueUgx=target_due,
        totalAfterUgx=total_after,
        totalFeesDueUgx=total_fees_due,
        outstandingAfterUgx=outstanding_after,
        creditAmountUgx=credit_amount,
    )


@app.post("/v1/finance/statement-summary", response_model=StatementSummaryResponse)
def statement_summary(payload: StatementSummaryRequest) -> StatementSummaryResponse:
    total_assigned = normalize_non_negative(payload.totalAssignedUgx)
    normalized_payments = [normalize_non_negative(x) for x in payload.paymentAmountsUgx]
    total_paid = sum(normalized_payments)
    normalized_assigned = total_assigned if total_assigned > 0 else total_paid
    outstanding = max(normalized_assigned - total_paid, 0)
    credit = max(total_paid - normalized_assigned, 0)

    running_paid = 0
    running_balances: list[int] = []
    for amount in normalized_payments:
        running_paid += amount
        running_balances.append(max(normalized_assigned - running_paid, 0))

    return StatementSummaryResponse(
        totalAssignedUgx=total_assigned,
        totalPaidUgx=total_paid,
        normalizedAssignedUgx=normalized_assigned,
        outstandingAmountUgx=outstanding,
        creditAmountUgx=credit,
        runningBalancesUgx=running_balances,
    )
