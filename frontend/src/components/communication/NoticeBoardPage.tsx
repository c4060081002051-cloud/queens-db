import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  fetchNotices,
  createNotice,
  addComment,
  deleteNotice,
  type NoticeEntry,
} from "../../api/communication";
import type { AdminUser } from "../admin/AdminLayout";

type NoticeBoardPageProps = {
  user: AdminUser | null;
};

export function NoticeBoardPage({ user }: NoticeBoardPageProps) {
  const { t } = useI18n();
  const [notices, setNotices] = useState<NoticeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "function" | "assignment">("all");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newNotice, setNewNotice] = useState({
    title: "",
    body: "",
    type: "general" as "function" | "assignment" | "general",
    eventDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await fetchNotices();
      setNotices(data);
    } catch (err) {
      setError("Failed to load notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createNotice(newNotice);
      setShowAddModal(false);
      setNewNotice({ title: "", body: "", type: "general", eventDate: "" });
      refresh();
    } catch (err) {
      alert("Failed to create notice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
      await deleteNotice(id);
      refresh();
    } catch (err) {
      alert("Failed to delete notice");
    }
  };

  const filteredNotices = notices.filter((n) => filter === "all" || n.type === filter);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3436]">{t("nav.communication.notice")}</h1>
          <p className="text-sm text-[#636e72]">Stay updated with school functions and assignments.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#5a8faf] to-[#4a6b4e] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:translate-y-px"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add New Notice
          </button>
        )}
      </header>

      {/* Tabs / Filters */}
      <div className="flex gap-2">
        {(["all", "function", "assignment"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              filter === f
                ? "bg-[#2d3436] text-white shadow-md"
                : "bg-white/50 text-[#636e72] hover:bg-white/80"
            }`}
          >
            {f === "all" ? "All Notices" : f === "function" ? "Functions" : "Assignments"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5a8faf] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="neo-card p-6 text-center text-red-500">{error}</div>
      ) : filteredNotices.length === 0 ? (
        <div className="neo-card p-12 text-center text-[#636e72]">
          <p className="text-lg font-semibold">No notices found.</p>
          <p className="text-sm">Check back later for updates.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredNotices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              isAdmin={isAdmin}
              onDelete={() => handleDelete(notice.id)}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {/* Add Notice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="neo-card w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-[#2d3436]">Create New Notice</h2>
            <form onSubmit={handleAddNotice} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#636e72]">Title</label>
                <input
                  required
                  type="text"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="neo-inset-field mt-1 w-full px-4 py-2 text-sm"
                  placeholder="e.g. End of Term Party"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[#636e72]">Type</label>
                  <select
                    value={newNotice.type}
                    onChange={(e) =>
                      setNewNotice({
                        ...newNotice,
                        type: e.target.value as any,
                      })
                    }
                    className="neo-inset-field mt-1 w-full px-4 py-2 text-sm"
                  >
                    <option value="general">General</option>
                    <option value="function">Function</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#636e72]">Event Date</label>
                  <input
                    type="date"
                    value={newNotice.eventDate}
                    onChange={(e) => setNewNotice({ ...newNotice, eventDate: e.target.value })}
                    className="neo-inset-field mt-1 w-full px-4 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[#636e72]">Content</label>
                <textarea
                  required
                  rows={4}
                  value={newNotice.body}
                  onChange={(e) => setNewNotice({ ...newNotice, body: e.target.value })}
                  className="neo-inset-field mt-1 w-full px-4 py-2 text-sm"
                  placeholder="Provide context or details..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[#2d3436] py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                >
                  {submitting ? "Publishing..." : "Publish Notice"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl bg-[#ebe4d9] px-6 py-2.5 text-sm font-bold text-[#636e72] transition hover:bg-[#dcd5c9]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NoticeCard({
  notice,
  isAdmin,
  onDelete,
  onRefresh,
}: {
  notice: NoticeEntry;
  isAdmin: boolean;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSendingComment(true);
      await addComment(notice.id, commentText);
      setCommentText("");
      onRefresh();
    } catch (err) {
      alert("Failed to add comment");
    } finally {
      setSendingComment(false);
    }
  };

  const typeColor =
    notice.type === "function"
      ? "from-[#e8f4e9] to-[#cde8cf] text-[#4a6b4e]"
      : notice.type === "assignment"
        ? "from-[#e8f2fa] to-[#b9d9eb] text-[#5a8faf]"
        : "from-[#f5f0e6] to-[#ebe4d9] text-[#636e72]";

  return (
    <article className="neo-card flex flex-col overflow-hidden">
      <header className={`bg-gradient-to-br p-4 ${typeColor}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
            {notice.type}
          </span>
          {isAdmin && (
            <button
              onClick={onDelete}
              className="rounded-full p-1.5 transition hover:bg-black/5 text-[#d63031]"
              title="Delete Notice"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
        <h3 className="mt-2 text-lg font-bold leading-tight">{notice.title}</h3>
        {notice.eventDate && (
          <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-90">
            📅 {notice.eventDate}
          </p>
        )}
      </header>

      <div className="flex-1 p-5">
        <p className="text-sm leading-relaxed text-[#2d3436] whitespace-pre-wrap">{notice.body}</p>
        <div className="mt-4 flex items-center justify-between border-t border-[#ebe4d9] pt-4 text-[10px] font-bold uppercase tracking-wide text-[#636e72]">
          <span>By: {notice.authorLabel}</span>
          <span>{new Date(notice.publishedAt).toLocaleDateString()}</span>
        </div>
      </div>

      <footer className="bg-[#f0f3f6]/50 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#5a8faf] transition hover:text-[#4a7a9a]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            {notice.comments.length} Comments
          </button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-3">
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {notice.comments.length === 0 ? (
                <p className="text-center text-[11px] italic text-[#636e72]">No comments yet.</p>
              ) : (
                notice.comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg bg-white/60 p-2 text-sm shadow-sm ring-1 ring-black/5">
                    <p className="text-[10px] font-bold text-[#5a8faf] uppercase">{comment.authorName}</p>
                    <p className="text-xs text-[#2d3436]">{comment.body}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="neo-inset-field flex-1 px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={sendingComment || !commentText.trim()}
                className="rounded-lg bg-[#5a8faf] px-3 py-1.5 text-xs font-bold text-white shadow hover:brightness-110 disabled:opacity-50"
              >
                {sendingComment ? "..." : "Post"}
              </button>
            </form>
          </div>
        )}
      </footer>
    </article>
  );
}
