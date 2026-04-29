import { useState, useState } from "react";
import { useTheme } from "../../../theme/ThemeProvider";

function SubjectsConfigPage() {
  const { resolvedTheme } = useTheme();
  const isDarkUi = resolvedTheme === "dark" || resolvedTheme === "tinted-dark";

  const [activeTab, setActiveTab] = useState<"subjects" | "exams" | "schedule">("subjects");
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [subjectItems, setSubjectItems] = useState<SubjectAssignmentConfigRow[]>([]);
  const [examTypes, setExamTypes] = useState<ExamTypeConfigRow[]>([]);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New scheduler state
  const [schedClassId, setSchedClassId] = useState("");
  const [schedExamType, setSchedExamType] = useState("");
  const [schedSubject, setSchedSubject] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedBusy, setSchedBusy] = useState(false);

  // Existing assignment state
  const [subjectCategoryId, setSubjectCategoryId] = useState<number | null>(null);
  const [subjectSectionName, setSubjectSectionName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [newExamKey, setNewExamKey] = useState("");
  const [newExamLabel, setNewExamLabel] = useState("");

  const createdExamTypes = useMemo(
    () => examTypes.filter((row) => !row.isSystem && row.isActive),
    [examTypes],
  );

  const schedClassOptions = useMemo(() => {
    const assignedCategoryIds = new Set(subjectItems.map((row) => row.classCategoryId));
    const assignedCategoryNames = new Set(
      categories.filter((c) => assignedCategoryIds.has(c.id)).map((c) => c.name.trim()),
    );
    if (assignedCategoryNames.size === 0) return [];
    return classes.filter((cls) => assignedCategoryNames.has(cls.name.trim()));
  }, [subjectItems, categories, classes]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [subjectPayload, examRows, entryOptions] = await Promise.all([
        fetchSubjectConfigs(),
        fetchExamTypeConfigs(),
        fetchResultEntryOptions()
      ]);
      setCategories(subjectPayload.categories);
      setSubjectItems(subjectPayload.items);
      setExamTypes(examRows);
      setClasses(entryOptions.classes);
      if (subjectPayload.categories.length > 0 && subjectCategoryId == null) {
        setSubjectCategoryId(subjectPayload.categories[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onScheduleExam() {
    if (!schedClassId || !schedExamType || !schedSubject || !schedDate) {
      setError("Please fill all scheduling fields.");
      return;
    }
    setSchedBusy(true);
    setError(null);
    try {
      await createExam({
        examKey: schedExamType,
        classRoomId: Number(schedClassId),
        subject: schedSubject,
        examDate: schedDate
      });
      setSchedSubject("");
      setSchedDate("");
      alert("Exam/Assessment scheduled successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule exam");
    } finally {
      setSchedBusy(false);
    }
  }

  async function onAddExamType() {
    const examKey = newExamKey.trim();
    const displayName = newExamLabel.trim();
    if (!examKey || !displayName) return;
    try {
      await createExamTypeConfig({ examKey, displayName });
      setNewExamKey("");
      setNewExamLabel("");
      await refresh();
      window.dispatchEvent(new Event("academics:exam-types-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add exam type");
    }
  }

  async function onDeleteExamType(row: ExamTypeConfigRow) {
    try {
      await deleteExamTypeConfig(row.id);
      await refresh();
      window.dispatchEvent(new Event("academics:exam-types-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete exam type");
    }
  }

  async function onAddSubject() {
    if (!subjectCategoryId) return;
    const cleanSubject = subjectName.trim();
    if (!cleanSubject) return;
    try {
      await createSubjectConfig({
        classCategoryId: subjectCategoryId,
        sectionName: subjectSectionName.trim() || undefined,
        subjectName: cleanSubject,
      });
      setSubjectName("");
      setSubjectSectionName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add subject assignment");
    }
  }

  async function onDeleteSubject(id: number) {
    try {
      await deleteSubjectConfig(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete subject assignment");
    }
  }

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const inputClass = `w-full rounded-xl border px-4 py-2.5 text-xs transition-all focus:ring-4 outline-none ${isDarkUi
      ? "bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500/10"
      : "bg-slate-50 border-slate-100 text-[#2d3436] placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/5"
    }`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Header */}
      <div className={`neo-card overflow-hidden rounded-3xl border shadow-sm transition-all duration-500 ${isDarkUi ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"
        }`}>
        <div className={`border-b px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${isDarkUi ? "border-slate-800" : "border-slate-50"}`}>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>Curriculum Configuration</h1>
            <p className="mt-1 text-sm font-medium text-slate-500 uppercase tracking-widest">Subjects & Exam Engine</p>
          </div>
          <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <TabBtn active={activeTab === "subjects"} onClick={() => setActiveTab("subjects")} label="Subject Assignment" icon="📚" isDarkUi={isDarkUi} />
            <TabBtn active={activeTab === "exams"} onClick={() => setActiveTab("exams")} label="Exam Types" icon="📝" isDarkUi={isDarkUi} />
            <TabBtn active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} label="Scheduling" icon="📅" isDarkUi={isDarkUi} />
          </div>
        </div>

        {error && (
          <div className="mx-8 mt-6 flex items-center gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-500">
            <span className="text-xl">⚠️</span>
            <p className="text-xs font-black uppercase tracking-tight">{error}</p>
          </div>
        )}

        <div className="p-8">
          {activeTab === "subjects" && (
            <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10">
              <div className="space-y-6">
                <div>
                  <h3 className={`text-lg font-black ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>New Subject Assignment</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Define subjects for specific class categories.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Category</label>
                    <select
                      value={subjectCategoryId ?? ""}
                      onChange={(e) => setSubjectCategoryId(Number(e.target.value))}
                      className={inputClass}
                    >
                      <option value="" disabled>Select Category...</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Section (Optional)</label>
                    <input
                      value={subjectSectionName}
                      onChange={(e) => setSubjectSectionName(e.target.value)}
                      placeholder="e.g. Upper Primary"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Subject Name</label>
                    <input
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className={inputClass}
                    />
                  </div>
                  <button
                    onClick={() => void onAddSubject()}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-teal-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Assign Subject
                  </button>
                </div>
              </div>

              <div className={`rounded-3xl border p-6 ${isDarkUi ? "bg-slate-800/20 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkUi ? "text-slate-400" : "text-slate-500"}`}>Current Subject Ledger</h3>
                <div className="grid gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {subjectItems.map((row) => (
                    <div
                      key={row.id}
                      className={`group flex items-center justify-between rounded-2xl border p-4 transition-all hover:scale-[1.02] ${isDarkUi ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                        }`}
                    >
                      <div>
                        <p className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{row.subjectName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {categoryNameById.get(row.classCategoryId)} · {row.sectionName || "General Curriculum"}
                        </p>
                      </div>
                      <button
                        onClick={() => void onDeleteSubject(row.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "exams" && (
            <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10">
              <div className="space-y-6">
                <div>
                  <h3 className={`text-lg font-black ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>Custom Exam Types</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Add non-standard assessment cycles.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Reference Key</label>
                    <input
                      value={newExamKey}
                      onChange={(e) => setNewExamKey(e.target.value.toUpperCase())}
                      placeholder="e.g. MOCK"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Display Label</label>
                    <input
                      value={newExamLabel}
                      onChange={(e) => setNewExamLabel(e.target.value)}
                      placeholder="e.g. Mock Examination"
                      className={inputClass}
                    />
                  </div>
                  <button
                    onClick={() => void onAddExamType()}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Register Exam Type
                  </button>
                </div>
              </div>

              <div className={`rounded-3xl border p-6 ${isDarkUi ? "bg-slate-800/20 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkUi ? "text-slate-400" : "text-slate-500"}`}>Exam Registry</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {examTypes.map((row) => (
                    <div
                      key={row.id}
                      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:scale-[1.02] ${isDarkUi ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl ${row.isSystem ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"
                          }`}>
                          {row.isSystem ? "⚙️" : "📝"}
                        </div>
                        <div>
                          <p className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{row.displayName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{row.examKey}</p>
                        </div>
                      </div>
                      {row.isSystem && (
                        <span className="absolute top-0 right-0 bg-slate-100 px-3 py-1 text-[8px] font-black uppercase text-slate-400 rounded-bl-xl">System</span>
                      )}
                      {!row.isSystem && (
                        <button
                          onClick={() => void onDeleteExamType(row)}
                          className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="max-w-2xl mx-auto space-y-10">
              <div className="text-center">
                <h3 className={`text-2xl font-black tracking-tight ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>Schedule New Assessment</h3>
                <p className="text-sm font-medium text-slate-500 mt-2">Publish an exam or test to the academic calendar.</p>
              </div>

              <div className={`grid gap-8 p-10 rounded-[2.5rem] border ${isDarkUi ? "bg-slate-800/20 border-slate-700" : "bg-slate-50 border-slate-100"
                }`}>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Target Class</label>
                    <select
                      value={schedClassId}
                      onChange={(e) => setSchedClassId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select class...</option>
                      {schedClassOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {schedClassOptions.length === 0 && (
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">No subject assignments found.</p>
                    )}
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Assessment Cycle</label>
                    <select
                      value={schedExamType}
                      onChange={(e) => setSchedExamType(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select type...</option>
                      {createdExamTypes.map((t) => <option key={t.examKey} value={t.examKey}>{t.displayName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Subject Domain</label>
                    <input
                      value={schedSubject}
                      onChange={(e) => setSchedSubject(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Scheduled Date</label>
                    <input
                      type="date"
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  disabled={schedBusy}
                  onClick={() => void onScheduleExam()}
                  className="h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-600/30 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                >
                  {schedBusy ? "Processing..." : "Publish Assessment Schedule"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon, isDarkUi }: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  isDarkUi: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-5 py-2.5 text-xs font-black transition-all ${active
          ? isDarkUi ? "bg-slate-700 text-white shadow-lg shadow-slate-950/20" : "bg-white text-[#0c2340] shadow-sm"
          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}
