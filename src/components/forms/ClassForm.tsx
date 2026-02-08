'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/useLocale';

interface Teacher {
  id: number;
  displayName: string;
}

interface ClassFormProps {
  teachers: Teacher[];
  initialData?: {
    id: number;
    name: string;
    type: 'solo' | 'social';
    room: 'rendez_vous' | 'palomar';
    color: string;
    notes: string;
    totalLessons: number;
    studentCount: number;
    status: string;
    teachers: { id: number; role: string }[];
  };
}

const TIME_SLOTS = [
  { start: '11:00', end: '12:30' },
  { start: '13:00', end: '14:30' },
  { start: '14:45', end: '16:15' },
  { start: '16:30', end: '18:00' },
  { start: '18:15', end: '19:45' },
  { start: '20:00', end: '21:30' },
  { start: '21:00', end: '22:30' },
];

const DAYS = [
  { value: 1, label: 'monday' },
  { value: 2, label: 'tuesday' },
  { value: 3, label: 'wednesday' },
  { value: 4, label: 'thursday' },
  { value: 5, label: 'friday' },
  { value: 6, label: 'saturday' },
  { value: 0, label: 'sunday' },
];


export function ClassForm({ teachers, initialData }: ClassFormProps) {
  const router = useRouter();
  const t = useT();
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<'solo' | 'social'>(initialData?.type || 'social');
  const [room, setRoom] = useState<'rendez_vous' | 'palomar'>(initialData?.room || 'rendez_vous');
  const [color, setColor] = useState(initialData?.color || '#4A90D9');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [totalLessons, setTotalLessons] = useState(initialData?.totalLessons || 6);
  const [studentCount, setStudentCount] = useState(initialData?.studentCount || 0);

  // Teachers
  const [soloTeacher, setSoloTeacher] = useState<number>(initialData?.teachers?.[0]?.id || 0);
  const [leaderTeacher, setLeaderTeacher] = useState<number>(
    initialData?.teachers?.find((t) => t.role === 'leader')?.id || 0
  );
  const [followerTeacher, setFollowerTeacher] = useState<number>(
    initialData?.teachers?.find((t) => t.role === 'follower')?.id || 0
  );

  // Schedule (only for new classes)
  const [firstDate, setFirstDate] = useState('');
  const [patterns, setPatterns] = useState([
    { dayOfWeek: 3, startTime: '18:15', endTime: '19:45' },
  ]);
  const [useCustomTime, setUseCustomTime] = useState<boolean[]>([false]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addPattern() {
    setPatterns([...patterns, { dayOfWeek: 4, startTime: '18:15', endTime: '19:45' }]);
    setUseCustomTime([...useCustomTime, false]);
  }

  function removePattern(index: number) {
    setPatterns(patterns.filter((_, i) => i !== index));
    setUseCustomTime(useCustomTime.filter((_, i) => i !== index));
  }

  function updatePattern(index: number, field: string, value: string | number) {
    const updated = [...patterns];
    (updated[index] as Record<string, string | number>)[field] = value;
    setPatterns(updated);
  }

  function selectTimeSlot(index: number, slotIndex: number) {
    const slot = TIME_SLOTS[slotIndex];
    updatePattern(index, 'startTime', slot.start);
    updatePattern(index, 'endTime', slot.end);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const teacherList = type === 'solo'
        ? [{ teacherId: soloTeacher, role: 'solo' }]
        : [
            { teacherId: leaderTeacher, role: 'leader' },
            { teacherId: followerTeacher, role: 'follower' },
          ];

      if (isEdit) {
        const res = await fetch(`/api/classes/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, type, room, color, notes, totalLessons, studentCount,
            teachers: teacherList,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        router.push('/classes');
        router.refresh();
      } else {
        const res = await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, type, room, color, notes, totalLessons,
            teachers: teacherList,
            firstDate,
            patterns,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        router.push('/classes');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('className')}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('classType')}</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" value="solo" checked={type === 'solo'} onChange={() => setType('solo')} />
            <span className="text-sm">{t('solo')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="social" checked={type === 'social'} onChange={() => setType('social')} />
            <span className="text-sm">{t('social')}</span>
          </label>
        </div>
      </div>

      {/* Room */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('room')}</label>
        <select
          value={room}
          onChange={(e) => setRoom(e.target.value as 'rendez_vous' | 'palomar')}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="rendez_vous">{t('rendezVous')}</option>
          <option value="palomar">{t('palomar')}</option>
        </select>
      </div>

      {/* Teachers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('teachers')}</label>
        {type === 'solo' ? (
          <select
            value={soloTeacher}
            onChange={(e) => setSoloTeacher(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value={0}>--</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.displayName}</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-gray-500">{t('leader')}</span>
              <select
                value={leaderTeacher}
                onChange={(e) => setLeaderTeacher(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={0}>--</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-xs text-gray-500">{t('follower')}</span>
              <select
                value={followerTeacher}
                onChange={(e) => setFollowerTeacher(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={0}>--</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.displayName}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Total Lessons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('totalLessons')}</label>
        <input
          type="number"
          value={totalLessons}
          onChange={(e) => setTotalLessons(Number(e.target.value))}
          min={1}
          max={20}
          className="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Student Count (edit only) */}
      {isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('studentCount')}</label>
          <input
            type="number"
            value={studentCount}
            onChange={(e) => setStudentCount(Number(e.target.value))}
            min={0}
            className="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">{t('minStudents')}</p>
        </div>
      )}

      {/* Schedule (new only) */}
      {!isEdit && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstLessonDate')}</label>
            <input
              type="date"
              value={firstDate}
              onChange={(e) => setFirstDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('schedule')}</label>
            {patterns.map((pattern, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 mb-3 p-3 bg-gray-50 rounded">
                <div>
                  <span className="text-xs text-gray-500">{t('scheduleDay', { n: i + 1 })}</span>
                  <select
                    value={pattern.dayOfWeek}
                    onChange={(e) => updatePattern(i, 'dayOfWeek', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>{t(d.label)}</option>
                    ))}
                  </select>
                </div>

                {!useCustomTime[i] ? (
                  <div>
                    <span className="text-xs text-gray-500">Time slot</span>
                    <select
                      value={`${pattern.startTime}-${pattern.endTime}`}
                      onChange={(e) => {
                        const idx = TIME_SLOTS.findIndex(
                          (s) => `${s.start}-${s.end}` === e.target.value
                        );
                        if (idx >= 0) selectTimeSlot(i, idx);
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      {TIME_SLOTS.map((s) => (
                        <option key={`${s.start}-${s.end}`} value={`${s.start}-${s.end}`}>
                          {s.start} - {s.end}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...useCustomTime];
                        updated[i] = true;
                        setUseCustomTime(updated);
                      }}
                      className="text-xs text-blue-500 mt-1"
                    >
                      Custom time
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div>
                      <span className="text-xs text-gray-500">{t('startTime')}</span>
                      <input
                        type="time"
                        value={pattern.startTime}
                        onChange={(e) => updatePattern(i, 'startTime', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">{t('endTime')}</span>
                      <input
                        type="time"
                        value={pattern.endTime}
                        onChange={(e) => updatePattern(i, 'endTime', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...useCustomTime];
                        updated[i] = false;
                        setUseCustomTime(updated);
                      }}
                      className="text-xs text-blue-500 self-end pb-2"
                    >
                      Preset
                    </button>
                  </div>
                )}

                {patterns.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePattern(i)}
                    className="text-red-500 text-sm pb-2"
                  >
                    {t('delete')}
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPattern}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Add another day
            </button>
          </div>
        </>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : isEdit ? t('save') : t('create')}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-600 px-6 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
