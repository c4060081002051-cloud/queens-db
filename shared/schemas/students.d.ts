import { z } from "zod";
export declare const studentSortBySchema: z.ZodEnum<{
    id: "id";
    name: "name";
    date: "date";
    class: "class";
}>;
export declare const studentSortDirSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export declare const studentListQuerySchema: z.ZodObject<{
    q: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    sortBy: z.ZodDefault<z.ZodEnum<{
        id: "id";
        name: "name";
        date: "date";
        class: "class";
    }>>;
    sortDir: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    limit: z.ZodPipe<z.ZodTransform<number, unknown>, z.ZodNumber>;
}, z.core.$strip>;
export declare const studentCreateBodySchema: z.ZodObject<{
    firstName: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodString>;
    middleName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    lastName: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodString>;
    dateOfBirth: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    parentEmail: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    classRoomId: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    gender: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    sectionName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    nationality: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    countryCode: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodString>>>;
    district: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    registrationType: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodEnum<{
        first: "first";
        continuing: "continuing";
    }>>>;
    previousSchool: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    previousSchoolLocation: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    lastClassAttended: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    lastTermYear: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    previousGrades: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    transferReason: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodEnum<{
        relocation: "relocation";
        discipline: "discipline";
        better_education: "better_education";
    }>>>;
    parentAliveStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodEnum<{
        both: "both";
        one: "one";
        none: "none";
    }>>>;
    parentFullName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    parentPhone: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    parentAddress: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    religion: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    specialNeeds: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    boardingStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodEnum<{
        day_half: "day_half";
        day_full: "day_full";
        boarding: "boarding";
    }>>>;
    residenceAddress: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    medicalInfo: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    emergencyContactName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    emergencyContactPhone: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    guardianName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    guardianPhone: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const studentUpdateBodySchema: z.ZodObject<{
    firstName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    middleName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    lastName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    dateOfBirth: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    parentEmail: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    classRoomId: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    gender: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    sectionName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    nationality: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    countryCode: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodString>>>;
    district: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    registrationType: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodEnum<{
        first: "first";
        continuing: "continuing";
    }>>>;
    previousSchool: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    previousSchoolLocation: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    lastClassAttended: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    lastTermYear: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    previousGrades: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    transferReason: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodEnum<{
        relocation: "relocation";
        discipline: "discipline";
        better_education: "better_education";
    }>>>>;
    parentAliveStatus: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodEnum<{
        both: "both";
        one: "one";
        none: "none";
    }>>>>;
    parentFullName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    parentPhone: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    parentAddress: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    religion: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    specialNeeds: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    boardingStatus: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodEnum<{
        day_half: "day_half";
        day_full: "day_full";
        boarding: "boarding";
    }>>>>;
    residenceAddress: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    medicalInfo: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    emergencyContactName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    emergencyContactPhone: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    guardianName: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    guardianPhone: z.ZodPipe<z.ZodTransform<{} | null | undefined, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
export type StudentListQueryInput = z.input<typeof studentListQuerySchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
export type StudentCreateBodyInput = z.input<typeof studentCreateBodySchema>;
export type StudentCreateBody = z.infer<typeof studentCreateBodySchema>;
export type StudentUpdateBodyInput = z.input<typeof studentUpdateBodySchema>;
export type StudentUpdateBody = z.infer<typeof studentUpdateBodySchema>;
//# sourceMappingURL=students.d.ts.map