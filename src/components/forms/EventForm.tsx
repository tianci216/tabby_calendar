'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/useLocale';

interface Teacher {
  id: number;
  displayName: string;
}

interface EventFormProps {
  teachers: Teacher[];
  initialData?: {
    id: number;
    type: string;
    title: string;
    date: string;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    room: string | null;
    teacherId: number | null;
    notes: string | null;
  };
}

const EVENT_TYPES = ['party', 'gig', 'absence', 'note'] as const;

export function EventForm({ teachers, initialData }: EventFormProps) {
  const router = useRouter();
  const t = useT();
  const isEdit = !!initialData;

  const [type, setType] = useState(initialData?.type || 'party');
  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [startTime, setStartTime] = useState(initialData?.startTime || '');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
  const [room, setRoom] = useState(initialData?.room || '');
  const [teacherId, setTeacherId] = useState<number>(initialData?.teacherId || 0);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        type, title, date,
        endDate: endDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        room: room || null,
        teacherId: teacherId || null,
        notes: notes || null,
      };

      const url = isEdit ? `/api/events/${initialData.id}` : '/api/events';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      router.push('/calendar/weekly');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !confirm('Delete this event?')) return;
    await fetch(`/api/events/${initialData.id}`, { method: 'DELETE' });
    router.push('/calendar/weekly');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventType')}</label>
        <div className="flex gap-3">
          {EVENT_TYPES.map((et) => (
            <label key={et} className="flex items-center gap-1.5">
              <input type="radio" value={et} checked={type === et} onChange={() => setType(et)} />
              <span className="text-sm">{t(et)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('title')}</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {(type === 'absence') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('endDate')}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
      </div>

      {(type === 'party' || type === 'gig') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      {(type === 'party' || type === 'gig') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('room')}</label>
          <select value={room} onChange={(e) => setRoom(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">--</option>
            <option value="rendez_vous">{t('rendezVous')}</option>
            <option value="palomar">{t('palomar')}</option>
          </select>
        </div>
      )}

      {(type === 'absence' || type === 'gig') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('teacher')}</label>
          <select value={teacherId} onChange={(e) => setTeacherId(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value={0}>--</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? '...' : isEdit ? t('save') : t('create')}
        </button>
        {isEdit && (
          <button type="button" onClick={handleDelete}
            className="text-red-600 px-4 py-2 rounded border border-red-200 hover:bg-red-50 transition-colors">
            {t('delete')}
          </button>
        )}
        <button type="button" onClick={() => router.back()}
          className="text-gray-600 px-6 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors">
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
