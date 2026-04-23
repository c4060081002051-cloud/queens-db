type SafeParseSuccess<T> = { success: true; data: T };
type SafeParseFailure = { success: false; error: { issues: Array<{ message?: string }> } };

type SafeParsableSchema<T> = {
  safeParse(payload: unknown): SafeParseSuccess<T> | SafeParseFailure;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function validateWithSchema<T>(
  schema: SafeParsableSchema<T>,
  payload: unknown,
): ValidationResult<T> {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, error: issue?.message ?? "Invalid request payload" };
}
