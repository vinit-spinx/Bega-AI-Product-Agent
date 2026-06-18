'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import HeroPreview from '@/components/admin/HeroPreview';
import { fetchHeroContent, saveHeroContent, uploadHeroImage } from '@/services/admin/heroContentService';
import type { HeroContent } from '@/types/admin';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB — must match the backend limit

const INPUT = 'w-full px-3.5 py-3 rounded-xl border border-bega-border-2 text-[13px] text-bega-text-1 bg-white placeholder:text-bega-text-3 focus:outline-none focus:ring-2 focus:ring-bega-black/10 focus:border-bega-black/40 transition-colors';
const LABEL = 'block text-[11px] font-semibold text-bega-text-2 uppercase tracking-wider mb-1.5';

export default function HeroContentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Omit<HeroContent, 'id'>>({
    title: '',
    description: '',
    backgroundImageUrl: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHeroContent();
      setForm({ title: data.title, description: data.description, backgroundImageUrl: data.backgroundImageUrl });
    } catch {
      setError('Failed to load hero content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await saveHeroContent(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    await load();
    setSaved(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setUploadError('');

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('File exceeds the 5MB size limit.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Only JPG, PNG, and WEBP images are allowed.');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadHeroImage(file);
      set('backgroundImageUrl', url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Hero Content"
        description="Manage the headline and description shown on the chat landing page."
      />

      {loading ? (
        <div className="grid grid-cols-[1fr_360px] gap-8">
          <div className="bg-white rounded-2xl border border-bega-border-1 p-6 space-y-5 animate-pulse">
            <div className="h-4 bg-bega-bg-2 rounded w-1/4 mb-4" />
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-2.5 bg-bega-bg-2 rounded w-1/5 mb-2" />
                <div className="h-10 bg-bega-bg-2 rounded-xl" />
              </div>
            ))}
          </div>
          <div className="h-[300px] bg-white rounded-2xl border border-bega-border-1 animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-[1fr_360px] gap-8 items-start">

            {/* ── Form card ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-bega-border-1 p-6 space-y-5">
              <div>
                <p className="text-[12px] font-semibold text-bega-text-2 mb-4">Page Content</p>

                {/* Hero Title */}
                <div className="space-y-5">
                  <div>
                    <label className={LABEL}>Hero Title <span className="text-red-500">*</span></label>
                    <input
                      className={INPUT}
                      placeholder="Find the Perfect Lighting Solution"
                      value={form.title}
                      onChange={e => set('title', e.target.value)}
                      required
                    />
                  </div>

                  {/* Hero Description */}
                  <div>
                    <label className={LABEL}>Hero Description</label>
                    <textarea
                      className={`${INPUT} resize-none`}
                      rows={3}
                      placeholder="Discover lighting, furniture, and control solutions…"
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-bega-border-1 pt-5">
                <p className="text-[12px] font-semibold text-bega-text-2 mb-4">Background Image</p>
                <div className="space-y-3">
                  <div>
                    <label className={LABEL}>Image URL</label>
                    <input
                      type="url"
                      className={INPUT}
                      placeholder="https://example.com/image.jpg"
                      value={form.backgroundImageUrl}
                      onChange={e => set('backgroundImageUrl', e.target.value)}
                    />
                    <p className="text-[11px] text-bega-text-3 mt-1.5">
                      Leave blank to use the default background. Image is shown at 6% opacity with grayscale.
                    </p>
                  </div>

                  {/* Upload from device */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-bega-border-1" />
                    <span className="text-[11px] text-bega-text-3">or</span>
                    <div className="flex-1 h-px bg-bega-border-1" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl
                               border-2 border-dashed border-bega-border-2 text-bega-text-3 text-[12px]
                               hover:border-bega-border-3 hover:text-bega-text-2 transition-colors
                               disabled:opacity-60 disabled:cursor-wait"
                  >
                    {uploading ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 animate-spin">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        Uploading…
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <path d="M10 3v10M6 7l4-4 4 4" />
                          <path d="M3 15h14" />
                        </svg>
                        Upload Image
                        <span className="text-[10px] text-bega-text-3">JPG, PNG, or WEBP — max 5MB</span>
                      </>
                    )}
                  </button>
                  {uploadError && (
                    <p className="text-[11px] text-red-600">{uploadError}</p>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-bega-border-2 text-[13px] font-medium
                             text-bega-text-2 hover:bg-bega-bg-1 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium
                               text-white transition-all active:scale-[0.98] disabled:opacity-50
                               ${saved ? 'bg-emerald-600' : 'bg-bega-black hover:bg-bega-black/85'}`}
                >
                  {saved ? (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5">
                        <path d="M3 8l3.5 3.5 6.5-7" />
                      </svg>
                      Saved
                    </>
                  ) : saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* ── Preview ───────────────────────────────────────────────── */}
            <HeroPreview
              title={form.title}
              description={form.description}
              backgroundImageUrl={form.backgroundImageUrl}
            />
          </div>
        </form>
      )}
    </div>
  );
}
