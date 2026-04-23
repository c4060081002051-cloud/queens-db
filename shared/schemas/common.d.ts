import { z } from "zod";
export declare function optionalTrimmed(max: number): z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
export declare function nullableTrimmed(max: number): z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
export declare function requiredTrimmed(max: number, message: string): z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodString>;
export declare function optionalPositiveInt(): z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
//# sourceMappingURL=common.d.ts.map