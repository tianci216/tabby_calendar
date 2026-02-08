'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t, type Locale } from '@/lib/i18n';
import { formatDisplayDate } from '@/lib/calendar-utils';

interface LessonTeacher {
  id: number;
  displayName: string;
  role: string;
}

interface Lesson {
  id: number;
  lessonNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  isCancelled: boolean;
  notes: string | null;
  teachers: LessonTeacher[];
  hasOverride: boolean;
}

interface LessonListProps {
  lessons: Lesson[];
  totalLessons: number;
  allTeachers: { id: number; displayName: string }[];
  locale: Locale;
}

export function LessonList({ lessons, totalLessons, allTeachers, locale }: LessonListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function toggleCancel(lesson: Lesson) {
    setSaving(true);
    await fetch(`/api/lessons/${lesson.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCancelled: !lesson.isCancelled }),
    });
    setSaving(false);
    router.refresh();
  }

  async function updateLesson(lessonId: number, data: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {lessons.map((lesson) => (
        <div
          key={lesson.id}
          className={`bg-white border rounded-lg p-3 ${
            lesson.isCancelled ? 'opacity-50 border-red-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">
                {t(locale, 'lessonOf', { current: lesson.lessonNumber, total: totalLessons })}
              </span>
              <span className="text-sm text-gray-500 ml-3">
                {formatDisplayDate(lesson.date)} {lesson.startTime}-{lesson.endTime}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingId(editingId === lesson.id ? null : lesson.id)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {t(locale, 'edit')}
              </button>
              <button
                onClick={() => toggleCancel(lesson)}
                disabled={saving}
                className={`text-xs ${lesson.isCancelled ? 'text-green-600' : 'text-red-600'}`}
              >
                {lesson.isCancelled ? t(locale, 'restoreLesson') : t(locale, 'cancelLesson')}
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {lesson.teachers.map((teacher) => teacher.displayName).join(' & ')}
            {lesson.hasOverride && (
              <span className="ml-1 text-orange-500">({t(locale, 'substituteTeacher')})</span>
            )}
          </div>

          {lesson.notes && (
            <div className="text-xs text-gray-400 mt-1">{lesson.notes}</div>
          )}

          {editingId === lesson.id && (
            <LessonEditForm
              lesson={lesson}
              allTeachers={allTeachers}
              locale={locale}
              onSave={(data) => updateLesson(lesson.id, data)}
              onCancel={() => setEditingId(null)}
              saving={saving}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function LessonEditForm({
  lesson,
  allTeachers,
  locale,
  onSave,
  onCancel,
  saving,
}: {
  lesson: Lesson;
  allTeachers: { id: number; displayName: string }[];
  locale: Locale;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [date, setDate] = useState(lesson.date);
  const [startTime, setStartTime] = useState(lesson.startTime);
  const [endTime, setEndTime] = useState(lesson.endTime);
  const [notes, setNotes] = useState(lesson.notes || '');
  const [overrideTeachers, setOverrideTeachers] = useState(
    lesson.hasOverride
      ? lesson.teachers.map((t) => ({ teacherId: t.id, role: t.role }))
      : []
  );
  const [useOverride, setUseOverride] = useState(lesson.hasOverride);

  function handleSave() {
    const data: Record<string, unknown> = { date, startTime, endTime, notes: notes || null };
    if (useOverride && overrideTeachers.length > 0) {
      data.teacherOverrides = overrideTeachers;
    } else if (!useOverride && lesson.hasOverride) {
      data.teacherOverrides = [];
    }
    onSave(data);
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500">{t(locale, 'date')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">{t(locale, 'startTime')}</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">{t(locale, 'endTime')}</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm" />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useOverride}
            onChange={(e) => {
              setUseOverride(e.target.checked);
              if (e.target.checked && overrideTeachers.length === 0) {
                setOverrideTeachers(lesson.teachers.map((t) => ({ teacherId: t.id, role: t.role })));
              }
            }}
          />
          {t(locale, 'substituteTeacher')}
        </label>
        {useOverride && (
          <div className="mt-2 space-y-2">
            {overrideTeachers.map((ot, i) => (
              <div key={i} className="flex gap-2">
                <select
                  value={ot.teacherId}
                  onChange={(e) => {
                    const updated = [...overrideTeachers];
                    updated[i] = { ...updated[i], teacherId: Number(e.target.value) };
                    setOverrideTeachers(updated);
                  }}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                >
                  {allTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 self-center">{ot.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-500">{t(locale, 'notes')}</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm" />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
          {t(locale, 'save')}
        </button>
        <button onClick={onCancel}
          className="text-gray-500 px-3 py-1 rounded text-sm border hover:bg-gray-50">
          {t(locale, 'cancel')}
        </button>
      </div>
    </div>
  );
}
