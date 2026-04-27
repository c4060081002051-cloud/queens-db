import { useEffect, useMemo, useState } from "react";
import {
  fetchCountries,
  fetchDistricts,
  fetchNationalities,
  type CountryOption,
} from "../../api/geo";
import {
  fetchClassSections,
  createStudent,
  fetchClassrooms,
  uploadStudentPhoto,
  type ClassRoomOption,
  type ClassSectionOption,
} from "../../api/students";
import { fetchGeneralSettings } from "../../api/settingsGeneral";
import { useI18n } from "../../i18n/I18nProvider";

type NewAdmissionFormProps = {
  onCreated: () => void;
};

const fieldClass =
  "w-full rounded-lg border border-[#e0d8cc] bg-[#faf9f7] px-3 py-2 text-sm text-[#2d3436] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.06)] outline-none focus:border-[#6a9570]/60 placeholder:text-[#636e72]/70";

export function NewAdmissionForm({ onCreated }: NewAdmissionFormProps) {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<ClassRoomOption[]>([]);
  const [loadRoomsError, setLoadRoomsError] = useState<string | null>(null);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [sections, setSections] = useState<ClassSectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsStreamsEnabled, setSectionsStreamsEnabled] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [gender, setGender] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [nationality, setNationality] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [district, setDistrict] = useState("");
  const [registrationType, setRegistrationType] = useState<"first" | "continuing" | "">("");
  const [transferReason, setTransferReason] = useState<
    "" | "relocation" | "discipline" | "better_education"
  >("");
  const [parentAliveStatus, setParentAliveStatus] = useState<"both" | "one" | "none" | "">("");
  const [singleParentType, setSingleParentType] = useState<"mother" | "father" | "">("");
  const [parentFullName, setParentFullName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentAddress, setParentAddress] = useState("");
  const [religion, setReligion] = useState("");
  const [specialNeeds, setSpecialNeeds] = useState("");
  const [boardingStatus, setBoardingStatus] = useState<
    "boarding" | "day_half" | "day_full" | ""
  >("");
  const [residenceAddress, setResidenceAddress] = useState("");
  const [medicalInfo, setMedicalInfo] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const activeRooms = useMemo(
    () => rooms.filter((r) => r.isActive !== false),
    [rooms],
  );
  const sortedActiveRooms = useMemo(
    () =>
      [...activeRooms].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [activeRooms],
  );
  const selectedClassRoom = useMemo(() => {
    const id = Number.parseInt(classRoomId, 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return rooms.find((room) => room.id === id) ?? null;
  }, [classRoomId, rooms]);
  const religions = [
    "Christian",
    "Muslim",
    "Catholic",
    "Protestant",
    "Born Again",
    "Seventh-day Adventist",
    "Orthodox",
    "Traditional",
    "Other",
  ];

  useEffect(() => {
    let cancelled = false;
    void fetchClassrooms()
      .then((list) => {
        if (!cancelled) setRooms(list);
      })
      .catch(() => {
        if (!cancelled) setLoadRoomsError(t("students.form.classroomsError"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchGeneralSettings()
      .then((settings) => {
        if (cancelled) return;
        setSectionsStreamsEnabled((settings.classes_sections_streams_enabled ?? "yes") === "yes");
      })
      .catch(() => {
        if (!cancelled) setSectionsStreamsEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchNationalities(), fetchCountries()])
      .then(([nat, ctry]) => {
        if (!cancelled) {
          setGeoError(null);
          setNationalities(nat);
          setCountries(ctry);
        }
      })
      .catch(() => {
        if (!cancelled) setGeoError(t("students.form.geoLoadError"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  useEffect(() => {
    const code = countryCode.trim();
    if (!code) {
      setDistricts([]);
      setDistrict("");
      return;
    }
    let cancelled = false;
    setDistrictsLoading(true);
    void fetchDistricts(code)
      .then((list) => {
        if (!cancelled) {
          setGeoError(null);
          setDistricts(list);
          setDistrict((d) => (d && list.includes(d) ? d : ""));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDistricts([]);
          setDistrict("");
          setGeoError(t("students.form.geoLoadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setDistrictsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [countryCode, t]);

  useEffect(() => {
    if (!sectionsStreamsEnabled) {
      setSectionName("");
      return;
    }
    const id = Number.parseInt(classRoomId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setSectionName("");
      return;
    }
    if (sectionsLoading) {
      setSectionName("");
      return;
    }
    if (sections.length > 0) {
      setSectionName(sections[0].name);
    } else {
      setSectionName("");
    }
  }, [classRoomId, sections, sectionsLoading, sectionsStreamsEnabled]);

  useEffect(() => {
    if (!sectionsStreamsEnabled) {
      setSections([]);
      setSectionsLoading(false);
      return;
    }
    const id = Number.parseInt(classRoomId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setSections([]);
      return;
    }
    let cancelled = false;
    setSections([]);
    setSectionsLoading(true);
    void fetchClassSections(id)
      .then((list) => {
        if (!cancelled) setSections(list);
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      })
      .finally(() => {
        if (!cancelled) setSectionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classRoomId, sectionsStreamsEnabled]);

  const resetForm = () => {
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setDateOfBirth("");
    setParentEmail("");
    setGender("");
    setSectionName("");
    setClassRoomId("");
    setSections([]);
    setNationality("");
    setCountryCode("");
    setDistrict("");
    setDistricts([]);
    setRegistrationType("");
    setTransferReason("");
    setParentAliveStatus("");
    setSingleParentType("");
    setParentFullName("");
    setParentPhone("");
    setParentAddress("");
    setReligion("");
    setSpecialNeeds("");
    setBoardingStatus("");
    setResidenceAddress("");
    setMedicalInfo("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setGuardianName("");
    setGuardianPhone("");
    setPhotoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      if (!firstName.trim() || !lastName.trim()) {
        setFormError(t("students.form.firstLastRequired"));
        setSubmitting(false);
        return;
      }
      const cr =
        classRoomId.trim() === "" ? undefined : Number.parseInt(classRoomId, 10);
      if (!cr || !Number.isFinite(cr) || cr <= 0) {
        setFormError(t("students.form.classRequired"));
        setSubmitting(false);
        return;
      }
      if (!boardingStatus) {
        setFormError(t("students.form.boardingStatusUnset"));
        setSubmitting(false);
        return;
      }
      if (!registrationType) {
        setFormError(t("students.form.registrationTypeUnset"));
        setSubmitting(false);
        return;
      }
      const cc = countryCode.trim();
      const dist = district.trim();
      const created = await createStudent({
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        parentEmail: parentEmail.trim() || undefined,
        classRoomId: cr,
        gender: gender.trim() || undefined,
        sectionName: sectionName.trim() || undefined,
        nationality: nationality.trim() || undefined,
        countryCode: cc ? cc : undefined,
        district: dist || undefined,
        registrationType,
        previousGrades: undefined,
        transferReason: registrationType === "continuing" && transferReason ? transferReason : undefined,
        parentAliveStatus: parentAliveStatus || undefined,
        parentFullName: parentFullName.trim() || undefined,
        parentPhone: parentPhone.trim() || undefined,
        parentAddress: parentAddress.trim() || undefined,
        religion: religion || undefined,
        specialNeeds: specialNeeds.trim() || undefined,
        boardingStatus: boardingStatus || undefined,
        residenceAddress: residenceAddress.trim() || undefined,
        medicalInfo: medicalInfo.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
      });

      if (photoFile) {
        try {
          await uploadStudentPhoto(created.id, photoFile);
        } catch {
          setFormSuccess(
            `${t("students.form.success")} ${t("students.photo.uploadLaterHint")}`,
          );
          resetForm();
          onCreated();
          return;
        }
      }
      setFormSuccess(
        `${t("students.form.success")} (${t("students.form.admissionNumberLabel")}: ${created.admissionNumber})`,
      );
      resetForm();
      onCreated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("students.form.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ebe4d9] bg-[#fffcf7] shadow-[6px_8px_24px_rgba(45,52,54,0.08)]">
      <div className="border-b border-[#ebe4d9] bg-gradient-to-r from-[#f8f9f6] to-[#e8f4e9] px-5 py-4">
        <h2 className="text-base font-bold text-[#2d3436]">{t("students.form.title")}</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {geoError ? (
          <p className="text-sm text-amber-800" role="status">
            {geoError}
          </p>
        ) : null}
        {loadRoomsError ? (
          <p className="text-sm text-amber-800" role="status">
            {loadRoomsError}
          </p>
        ) : null}
        {formError ? (
          <p className="text-sm text-rose-800" role="alert">
            {formError}
          </p>
        ) : null}
        {formSuccess ? (
          <p className="text-sm text-emerald-800" role="status">
            {formSuccess}
          </p>
        ) : null}
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <p className="col-span-full text-[11px] font-bold uppercase tracking-[0.12em] text-[#636e72]">
            {t("students.form.sectionStudent")}
          </p>
          <label className="block text-xs font-semibold text-[#636e72]">
            {t("students.form.firstName")} *
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`${fieldClass} mt-1`}
              autoComplete="given-name"
            />
          </label>
          <label className="block text-xs font-semibold text-[#636e72]">
            {t("students.form.middleName")}
            <input
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className={`${fieldClass} mt-1`}
              autoComplete="additional-name"
            />
          </label>
          <label className="block text-xs font-semibold text-[#636e72]">
            {t("students.form.lastName")} *
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={`${fieldClass} mt-1`}
              autoComplete="family-name"
            />
          </label>
          <label className="block text-xs font-semibold text-[#636e72]">
            {t("students.form.dob")} *
            <input
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block text-xs font-semibold text-[#636e72]">
            {t("students.form.gender")} *
            <select
              required
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={`${fieldClass} mt-1`}
            >
              <option value="">{t("students.form.genderUnset")}</option>
              <option value="Female">{t("students.form.genderFemale")}</option>
              <option value="Male">{t("students.form.genderMale")}</option>
              <option value="Other">{t("students.form.genderOther")}</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#636e72]">
            {t("students.form.boardingStatus")} *
            <select
              required
              value={boardingStatus}
              onChange={(e) =>
                setBoardingStatus(
                  e.target.value as "boarding" | "day_half" | "day_full" | "",
                )
              }
              className={`${fieldClass} mt-1`}
            >
              <option value="">{t("students.form.boardingStatusUnset")}</option>
              <option value="day_half">{t("students.form.boardingStatusDayHalf")}</option>
              <option value="day_full">{t("students.form.boardingStatusDayFull")}</option>
              <option value="boarding">{t("students.form.boardingStatusBoarding")}</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#636e72]">
            {t("students.form.religion")} *
            <select
              required
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              className={`${fieldClass} mt-1`}
            >
              <option value="">{t("students.form.religionUnset")}</option>
              {religions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
            {t("students.form.specialNeeds")}
            <input
              value={specialNeeds}
              onChange={(e) => setSpecialNeeds(e.target.value)}
              className={`${fieldClass} mt-1`}
              placeholder={t("students.form.specialNeedsPlaceholder")}
            />
          </label>
          <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
            {t("students.form.residenceAddress")} *
            <textarea
              required
              value={residenceAddress}
              onChange={(e) => setResidenceAddress(e.target.value)}
              className={`${fieldClass} mt-1 min-h-[84px]`}
              placeholder={t("students.form.residenceAddressPlaceholder")}
            />
          </label>
          <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
            {t("students.form.medicalInfo")}
            <textarea
              value={medicalInfo}
              onChange={(e) => setMedicalInfo(e.target.value)}
              className={`${fieldClass} mt-1 min-h-[84px]`}
              placeholder={t("students.form.medicalInfoPlaceholder")}
            />
          </label>
          <p className="col-span-full mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#636e72]">
            {t("students.form.sectionRegistration")}
          </p>
          <label className="block min-w-0 text-xs font-semibold text-[#636e72]">
            {t("students.form.registrationType")} *
            <select
              required
              value={registrationType}
              onChange={(e) => {
                const v = e.target.value as "first" | "continuing" | "";
                setRegistrationType(v);
                if (v === "continuing") {
                } else if (v === "first") {
                  setTransferReason("");
                } else {
                  setTransferReason("");
                }
              }}
              className={`${fieldClass} mt-1`}
            >
              <option value="">{t("students.form.registrationTypeUnset")}</option>
              <option value="first">{t("students.form.registrationNewAdmission")}</option>
              <option value="continuing">{t("students.form.registrationTransferIn")}</option>
            </select>
          </label>
          {registrationType === "continuing" ? (
            <label className="block min-w-0 text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
              {t("students.form.transferReason")}
              <select
                value={transferReason}
                onChange={(e) =>
                  setTransferReason(
                    e.target.value as "" | "relocation" | "discipline" | "better_education",
                  )
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="">{t("students.form.transferReasonUnset")}</option>
                <option value="relocation">{t("students.form.transferReasonRelocation")}</option>
                <option value="discipline">{t("students.form.transferReasonDiscipline")}</option>
                <option value="better_education">
                  {t("students.form.transferReasonBetterEducation")}
                </option>
              </select>
            </label>
          ) : null}
          <label className="block min-w-0 text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
            {t("students.form.classroom")} *
            <select
              required
              value={classRoomId}
              onChange={(e) => setClassRoomId(e.target.value)}
              className={`${fieldClass} mt-1`}
            >
              <option value="">{t("students.form.classroomUnset")}</option>
              {sortedActiveRooms.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                  {r.academicYear ? ` (${r.academicYear})` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="block min-w-0 text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
            <span className="block">Category</span>
            <div
              className={`${fieldClass} mt-1 flex min-h-[42px] items-center text-sm font-medium text-[#2d3436]`}
              aria-live="polite"
            >
              {!classRoomId ? "Select class first" : selectedClassRoom?.categoryName || "No category assigned"}
            </div>
            <span className="mt-1 block text-[11px] font-normal text-[#636e72]">
              Set automatically from the class you choose.
            </span>
          </div>
          {sectionsStreamsEnabled ? (
            <div className="block min-w-0 text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
              <span className="block">{t("students.form.section")}</span>
              <div
                className={`${fieldClass} mt-1 flex min-h-[42px] items-center text-sm font-medium text-[#2d3436]`}
                aria-live="polite"
              >
                {!classRoomId
                  ? t("students.form.sectionPickClass")
                  : sectionsLoading
                    ? t("students.form.sectionLoading")
                    : sectionName || t("students.form.sectionNoData")}
              </div>
              <span className="mt-1 block text-[11px] font-normal text-[#636e72]">
                {t("students.form.sectionAutoHint")}
              </span>
            </div>
          ) : null}

          <label className="block min-w-0 text-xs font-semibold text-[#636e72]">
            {t("students.form.nationality")} *
            <select
              required
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className={`${fieldClass} mt-1`}
            >
              <option value="">{t("students.form.nationalityUnset")}</option>
              {nationalities.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 text-xs font-semibold text-[#636e72]">
            {t("students.form.country")} *
            <select
              required
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                setDistrict("");
              }}
              className={`${fieldClass} mt-1`}
            >
              <option value="">{t("students.form.countryUnset")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 text-xs font-semibold text-[#636e72]">
            {t("students.form.district")}
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!countryCode.trim() || districtsLoading}
              className={`${fieldClass} mt-1 disabled:opacity-60`}
            >
              <option value="">
                {!countryCode.trim()
                  ? t("students.form.districtPickCountry")
                  : districtsLoading
                    ? t("students.form.districtLoading")
                    : t("students.form.districtUnset")}
              </option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
            {t("students.photo.labelAdmission")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mt-1 block w-full text-xs text-[#636e72] file:mr-2 file:rounded-lg file:border-0 file:bg-[#d4e8f5] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2d3436]"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="col-span-full mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <p className="col-span-full text-[11px] font-bold uppercase tracking-[0.12em] text-[#636e72]">
              {t("students.form.sectionParentGuardian")}
            </p>
            <label className="block text-xs font-semibold text-[#636e72]">
            {t("students.form.parentAliveStatus")} *
            <select
              required
              value={parentAliveStatus}
              onChange={(e) => {
                const next = e.target.value as "both" | "one" | "none" | "";
                setParentAliveStatus(next);
                if (next !== "one") setSingleParentType("");
                if (next === "none") {
                  setParentFullName("");
                  setParentPhone("");
                  setParentEmail("");
                  setParentAddress("");
                } else {
                  setGuardianName("");
                  setGuardianPhone("");
                }
              }}
              className={`${fieldClass} mt-1`}
            >
              <option value="">{t("students.form.parentAliveUnset")}</option>
              <option value="both">{t("students.form.parentAliveBoth")}</option>
              <option value="one">{t("students.form.parentAliveOne")}</option>
              <option value="none">{t("students.form.parentAliveNone")}</option>
            </select>
            </label>
            {parentAliveStatus === "one" ? (
              <label className="block text-xs font-semibold text-[#636e72]">
              {t("students.form.singleParentType")}
              <select
                value={singleParentType}
                onChange={(e) => setSingleParentType(e.target.value as "mother" | "father" | "")}
                className={`${fieldClass} mt-1`}
              >
                <option value="">{t("students.form.singleParentTypeUnset")}</option>
                <option value="mother">{t("students.form.singleParentMother")}</option>
                <option value="father">{t("students.form.singleParentFather")}</option>
              </select>
              </label>
            ) : null}
            {parentAliveStatus === "both" || parentAliveStatus === "one" ? (
              <>
              <label className="block text-xs font-semibold text-[#636e72]">
                {parentAliveStatus === "one" && singleParentType
                  ? t("students.form.parentFullNameSingle").replace(
                      "{parent}",
                      singleParentType === "mother"
                        ? t("students.form.singleParentMother")
                        : t("students.form.singleParentFather"),
                    )
                  : t("students.form.parentFullName")} *
                <input
                  required
                  value={parentFullName}
                  onChange={(e) => setParentFullName(e.target.value)}
                  className={`${fieldClass} mt-1`}
                  autoComplete="name"
                />
              </label>
              <label className="block text-xs font-semibold text-[#636e72]">
                {parentAliveStatus === "one" && singleParentType
                  ? t("students.form.parentPhoneSingle").replace(
                      "{parent}",
                      singleParentType === "mother"
                        ? t("students.form.singleParentMother")
                        : t("students.form.singleParentFather"),
                    )
                  : t("students.form.parentPhone")} *
                <input
                  required
                  type="tel"
                  minLength={10}
                  maxLength={13}
                  value={parentPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d+]/g, '');
                    setParentPhone(val);
                  }}
                  className={`${fieldClass} mt-1`}
                  autoComplete="tel"
                />
              </label>
              <label className="block text-xs font-semibold text-[#636e72]">
                {parentAliveStatus === "one" && singleParentType
                  ? t("students.form.parentEmailSingle").replace(
                      "{parent}",
                      singleParentType === "mother"
                        ? t("students.form.singleParentMother")
                        : t("students.form.singleParentFather"),
                    )
                  : t("students.form.parentEmail")}
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className={`${fieldClass} mt-1`}
                  autoComplete="email"
                />
              </label>
              <label className="block text-xs font-semibold text-[#636e72] sm:col-span-2 lg:col-span-3">
                {parentAliveStatus === "one" && singleParentType
                  ? t("students.form.parentAddressSingle").replace(
                      "{parent}",
                      singleParentType === "mother"
                        ? t("students.form.singleParentMother")
                        : t("students.form.singleParentFather"),
                    )
                  : t("students.form.parentAddress")}
                <input
                  required
                  value={parentAddress}
                  onChange={(e) => setParentAddress(e.target.value)}
                  className={`${fieldClass} mt-1`}
                  autoComplete="street-address"
                />
              </label>
              </>
            ) : null}
            {parentAliveStatus === "none" ? (
              <>
              <label className="block text-xs font-semibold text-[#636e72]">
                {t("students.form.guardianName")} *
                <input
                  required
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className={`${fieldClass} mt-1`}
                  autoComplete="name"
                />
              </label>
              <label className="block text-xs font-semibold text-[#636e72]">
                {t("students.form.guardianPhone")} *
                <input
                  type="tel"
                  required
                  minLength={10}
                  maxLength={13}
                  value={guardianPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d+]/g, '');
                    setGuardianPhone(val);
                  }}
                  className={`${fieldClass} mt-1`}
                  autoComplete="tel"
                />
              </label>
              </>
            ) : null}
            <p className="col-span-full mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#636e72]">
              {t("students.form.sectionNextOfKin")}
            </p>
            <label className="block text-xs font-semibold text-[#636e72]">
              {t("students.form.emergencyContactName")} *
              <input
                required
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className={`${fieldClass} mt-1`}
                autoComplete="name"
              />
            </label>
            <label className="block text-xs font-semibold text-[#636e72]">
              {t("students.form.emergencyContactPhone")} *
              <input
                type="tel"
                required
                minLength={10}
                maxLength={13}
                value={emergencyContactPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d+]/g, '');
                  setEmergencyContactPhone(val);
                }}
                className={`${fieldClass} mt-1`}
                autoComplete="tel"
              />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              resetForm();
              setFormError(null);
              setFormSuccess(null);
            }}
            className="rounded-full bg-[#faf7f0] px-6 py-2.5 text-sm font-semibold text-[#636e72] ring-1 ring-[#ebe4d9] transition hover:bg-[#f0ebe3] disabled:opacity-60"
          >
            {t("students.form.cancelAdmission")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gradient-to-br from-[#6a9570] to-[#4a6b4e] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? t("students.form.saving") : t("students.form.submit")}
          </button>
        </div>
      </form>
    </section>
  );
}
