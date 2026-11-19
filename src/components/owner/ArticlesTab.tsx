import { ChangeEvent, FormEvent, useState } from 'react';
import { Edit3, Eye, EyeOff, FileText, Plus, Trash2, Upload, X } from 'lucide-react';
import { STUDIO_IMAGE_PRESETS } from '../../data/catalog';
import { Article, MainCategory } from '../../types/catalog';
import { ownerFetch } from '../../utils/ownerApi';
import { ResilientImage } from '../ResilientImage';

interface ArticlesTabProps {
  articles: Article[];
  categories: MainCategory[];
  onRefreshWorkspace: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

function createEmptyArticle(categories: MainCategory[]): Article {
  const now = new Date().toISOString();
  return {
    id: `art_${Date.now()}`,
    title: '',
    summary: '',
    content: '',
    coverImage:
      categories[0]?.image || '/src/assets/images/cat_content_creation_1795108122118.jpg',
    categoryId: categories[0]?.id || 'content-creation',
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function ArticlesTab({
  articles,
  categories,
  onRefreshWorkspace,
  onNotify,
}: ArticlesTabProps) {
  const [editing, setEditing] = useState<Article | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editing) return;
    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
      });
      const res = await ownerFetch('/api/owner/upload-image', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.imageUrl) {
        throw new Error(data?.error || 'تعذر رفع الصورة');
      }
      setEditing({ ...editing, coverImage: data.imageUrl });
      onNotify('تم رفع صورة الغلاف.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'فشل رفع الصورة', true);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.title.trim()) {
      onNotify('يرجى كتابة عنوان المقال.', true);
      return;
    }

    setIsSaving(true);
    try {
      const url = isNew
        ? '/api/owner/articles'
        : `/api/owner/articles/${encodeURIComponent(editing.id)}`;
      const res = await ownerFetch(url, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(editing),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر حفظ المقال.', true);
        return;
      }
      await onRefreshWorkspace();
      onNotify(isNew ? 'تم نشر المقال بنجاح.' : 'تم تحديث المقال بنجاح.');
      setEditing(null);
    } catch {
      onNotify('حدث خطأ أثناء حفظ المقال.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublished = async (article: Article) => {
    try {
      const res = await ownerFetch(`/api/owner/articles/${encodeURIComponent(article.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...article,
          isPublished: !article.isPublished,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر تغيير حالة المقال.', true);
        return;
      }
      await onRefreshWorkspace();
      onNotify(article.isPublished ? 'تم تحويل المقال لمسودة.' : 'تم نشر المقال.');
    } catch {
      onNotify('حدث خطأ أثناء تحديث الحالة.', true);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await ownerFetch(`/api/owner/articles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر حذف المقال.', true);
        return;
      }
      await onRefreshWorkspace();
      onNotify('تم حذف المقال.');
      setConfirmDeleteId(null);
    } catch {
      onNotify('حدث خطأ أثناء الحذف.', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-950">
            إدارة المقالات وأدلة الشراء ({articles.length})
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            أضف مقالات تعليمية ومقارنات تساعد الزوار على اختيار المعدات المناسبة.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsNew(true);
            setEditing(createEmptyArticle(categories));
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>كتابة مقال جديد</span>
        </button>
      </div>

      {articles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800">لا توجد مقالات مضافة بعد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((article) => {
            const catTitle =
              categories.find((c) => c.id === article.categoryId)?.title ?? 'دليل عام';
            return (
              <div
                key={article.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 bg-slate-100 overflow-hidden">
                    <ResilientImage
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-amber-800 font-semibold">{catTitle}</span>
                      <span
                        className={`font-semibold ${
                          article.isPublished ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {article.isPublished ? 'منشور' : 'مسودة'}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-950">
                      {article.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{article.summary}</p>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNew(false);
                        setEditing({ ...article });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublished(article)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {article.isPublished ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>إلغاء النشر</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>نشر</span>
                        </>
                      )}
                    </button>
                  </div>

                  {confirmDeleteId === article.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleDelete(article.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-semibold"
                      >
                        تأكيد الحذف
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(article.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Article Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl bg-white rounded-2xl p-6 sm:p-7 space-y-4 text-right max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-950">
                {isNew ? 'كتابة مقال جديد' : 'تعديل المقال'}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-800">عنوان المقال</span>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-800">القسم المرتبط</span>
                <select
                  value={editing.categoryId}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 pt-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isPublished}
                  onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
                  className="w-4 h-4 accent-amber-700"
                />
                <span className="text-sm font-semibold text-slate-800">نشر المقال للزوار</span>
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-800">ملخص قصير</span>
              <textarea
                rows={2}
                value={editing.summary}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-800">محتوى المقال</span>
              <textarea
                rows={7}
                required
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 leading-relaxed"
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-800 block">صورة الغلاف</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>{isUploading ? 'جاري الرفع...' : 'رفع صورة من جهازك'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCover}
                    className="sr-only"
                  />
                </label>
                <select
                  value={editing.coverImage}
                  onChange={(e) => setEditing({ ...editing, coverImage: e.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                >
                  {STUDIO_IMAGE_PRESETS.map((preset) => (
                    <option key={preset.url} value={preset.url}>
                      {preset.label}
                    </option>
                  ))}
                  {!STUDIO_IMAGE_PRESETS.some((p) => p.url === editing.coverImage) && (
                    <option value={editing.coverImage}>صورة مخصصة ({editing.coverImage})</option>
                  )}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold disabled:opacity-60"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ المقال'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
