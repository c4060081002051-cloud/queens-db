import { z } from "zod";

export function optionalTrimmed(max: number) {
  return z.preprocess((value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(max).optional());
}

export function nullableTrimmed(max: number) {
  return z.preprocess((value: unknown) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.string().max(max).nullable().optional());
}

export function requiredTrimmed(max: number, message: string) {
  return z.preprocess((value: unknown) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }, z.string().min(1, message).max(max));
}

export function optionalPositiveInt() {
  return z.preprocess((value: unknown) => {
    if (value === undefined || value === "") return undefined;
    if (value === null) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().int().positive().nullable().optional());
}

export function ugandanPhoneRequired(message?: string) {
  return z.preprocess((value: unknown) => {
    if (typeof value !== "string" && typeof value !== "number") return value;
    const str = String(value).replace(/[\s\-\(\)]/g, "");
    return str;
  }, z.string().regex(/^(?:\+256|0|256)[1-9]\d{8}$/, message || "Must be a valid Ugandan phone number (e.g. 0772123456 or +256772123456)"));
}

export function ugandanPhoneOptional(message?: string) {
  return z.preprocess((value: unknown) => {
    if (value === undefined || value === null || value === "") return value;
    if (typeof value !== "string" && typeof value !== "number") return value;
    const str = String(value).replace(/[\s\-\(\)]/g, "");
    if (str.length === 0) return undefined;
    return str;
  }, z.string().regex(/^(?:\+256|0|256)[1-9]\d{8}$/, message || "Must be a valid Ugandan phone number (e.g. 0772123456 or +256772123456)").optional().nullable());
}
