import { z } from "zod";
export function optionalTrimmed(max) {
    return z.preprocess((value) => {
        if (value === undefined)
            return undefined;
        if (value === null)
            return null;
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }, z.string().max(max).optional());
}
export function nullableTrimmed(max) {
    return z.preprocess((value) => {
        if (value === undefined || value === null)
            return value;
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }, z.string().max(max).nullable().optional());
}
export function requiredTrimmed(max, message) {
    return z.preprocess((value) => {
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : "";
    }, z.string().min(1, message).max(max));
}
export function optionalPositiveInt() {
    return z.preprocess((value) => {
        if (value === undefined || value === "")
            return undefined;
        if (value === null)
            return null;
        if (typeof value === "number")
            return value;
        if (typeof value === "string")
            return Number(value);
        return value;
    }, z.number().int().positive().nullable().optional());
}
//# sourceMappingURL=common.js.map