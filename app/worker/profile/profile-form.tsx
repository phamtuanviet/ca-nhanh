'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiClientError } from '@/lib/http';

/** Sửa hồ sơ người làm (PRF-01): trường, giới thiệu, kỹ năng (tối đa 6, theo danh mục vị trí) */
export function ProfileForm({
  initial,
  positions,
}: {
  initial: { school: string | null; bio: string | null; skills: string[] };
  positions: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [school, setSchool] = useState(initial.school ?? '');
  const [bio, setBio] = useState(initial.bio ?? '');
  const [skills, setSkills] = useState(initial.skills);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api('/me/worker-profile', {
        method: 'PATCH',
        body: { school: school.trim() || null, bio: bio.trim() || null, skills },
      });
      toast.success('Đã lưu hồ sơ');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="grid gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]"
      noValidate
    >
      <h2 className="font-semibold">Sửa hồ sơ</h2>
      <div className="grid gap-2">
        <Label htmlFor="school">Trường</Label>
        <Input
          id="school"
          value={school}
          maxLength={120}
          onChange={(e) => setSchool(e.target.value)}
          className="h-11"
        />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Kỹ năng (tối đa 6)</legend>
        <div className="flex flex-wrap gap-2">
          {positions.map((p) => {
            const on = skills.includes(p.code);
            return (
              <button
                key={p.code}
                type="button"
                aria-pressed={on}
                disabled={!on && skills.length >= 6}
                onClick={() =>
                  setSkills((s) => (on ? s.filter((x) => x !== p.code) : [...s, p.code]))
                }
                className="h-9 rounded-full border border-border px-3.5 text-sm font-medium transition-colors hover:bg-surface-sunken disabled:opacity-40 aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-on-primary-soft"
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="bio">Giới thiệu</Label>
        <textarea
          id="bio"
          rows={3}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded-[var(--radius-control)] border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={saving}>
        {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
      </Button>
    </form>
  );
}
