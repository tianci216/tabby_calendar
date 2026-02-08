'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/useLocale';
import {
  getMonthStart, getMonthEnd, getWeekStart, formatDateStr, addDays, DAY_LABELS_SHORT,
} from '@/lib/calendar-utils';
import Link from 'next/link';

interface CalendarLesson {
  id: number;
  className: string;
  classColor: string | null;
  classStatus: string;
  lessonNumber: number;
  totalLessons: number;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  isCancelled: boolean;
}

interface CalendarEvent {
  id: number;
  type: string;
  title: string;
  date: string;
  startTime: string | null;
}

interface CalendarData {
  lessons: CalendarLesson[];
  events: CalendarEvent[];
}

export function MonthlyGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();

  const dateParam = searchParams.get('date');
  const [currentDate, setCurrentDate] = useState(() => {
    return dateParam ? new Date(dateParam) : new Date();
  });
  const [data, setData] = useState<CalendarData>({ lessons: [], events: [] });
  const [loading, setLoading] = useState(true);

  const monthStart = getMonthStart(currentDate);
  const monthEnd = getMonthEnd(currentDate);
  const gridStart = getWeekStart(monthStart);

  // Calculate grid: 5 or 6 weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let day = new Date(gridStart);
    while (day <= monthEnd || result.length < 5) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(day));
        day = addDays(day, 1);
      }
      result.push(week);
      if (result.length >= 6) break;
    }
    return result;
  }, [currentDate.toISOString()]);

  // Fetch data for the visible grid range
  useEffect(() => {
    const start = formatDateStr(weeks[0][0]);
    const end = formatDateStr(weeks[weeks.length - 1][6]);
    setLoading(true);
    fetch(`/api/calendar?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [currentDate.toISOString()]);

  // Group items by date
  const byDate = useMemo(() => {
    const map: Record<string, { lessons: CalendarLesson[]; events: CalendarEvent[] }> = {};
    for (const lesson of data.lessons) {
      if (!map[lesson.date]) map[lesson.date] = { lessons: [], events: [] };
      map[lesson.date].lessons.push(lesson);
    }
    for (const event of data.events) {
      if (!map[event.date]) map[event.date] = { lessons: [], events: [] };
      map[event.date].events.push(event);
    }
    return map;
  }, [data]);

  function navigateMonth(direction: number) {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + direction);
    setCurrentDate(next);
    router.replace(`/calendar/monthly?date=${formatDateStr(next)}`, { scroll: false });
  }

  const todayStr = formatDateStr(new Date());
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-100 rounded">&larr;</button>
          <button onClick={() => { setCurrentDate(new Date()); router.replace('/calendar/monthly'); }}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50">
            {t('today')}
          </button>
          <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-100 rounded">&rarr;</button>
          <span className="text-sm font-medium ml-2">
            {monthNames[monthStart.getMonth()]} {monthStart.getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/calendar/weekly?date=${formatDateStr(currentDate)}`}
            className="text-sm px-3 py-1 rounded hover:bg-gray-50 text-gray-600">
            {t('weekly')}
          </Link>
          <Link href={`/calendar/monthly?date=${formatDateStr(currentDate)}`}
            className="text-sm px-3 py-1 rounded bg-blue-50 text-blue-700 font-medium">
            {t('monthly')}
          </Link>
        </div>
      </div>

      {/* Month grid */}
      <div className="flex-1 overflow-auto p-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS_SHORT.map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 py-1 font-medium">
              {t(day)}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden">
          {weeks.flat().map((day, i) => {
            const dateStr = formatDateStr(day);
            const isCurrentMonth = day.getMonth() === monthStart.getMonth();
            const isToday = dateStr === todayStr;
            const dayData = byDate[dateStr];

            return (
              <div
                key={i}
                className={`bg-white min-h-[100px] p-1 ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
              >
                <Link
                  href={`/calendar/weekly?date=${dateStr}`}
                  className="text-xs font-medium text-gray-600 hover:text-blue-600"
                >
                  {day.getDate()}
                </Link>

                {dayData && (
                  <div className="mt-0.5 space-y-0.5">
                    {dayData.lessons.slice(0, 4).map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`text-[9px] leading-tight rounded px-1 py-0.5 truncate ${
                          lesson.isCancelled ? 'opacity-40 line-through' : ''
                        }`}
                        style={{ backgroundColor: (lesson.classColor || '#4A90D9') + '20' }}
                      >
                        <span style={{ color: lesson.classColor || '#4A90D9' }}>
                          {lesson.className} {lesson.lessonNumber}/{lesson.totalLessons}
                        </span>
                      </div>
                    ))}
                    {dayData.events.slice(0, 2).map((event) => (
                      <div key={event.id} className={`text-[9px] leading-tight rounded px-1 py-0.5 truncate ${
                        event.type === 'party' ? 'bg-purple-100 text-purple-700' :
                        event.type === 'absence' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {event.title}
                      </div>
                    ))}
                    {(dayData.lessons.length > 4 || dayData.events.length > 2) && (
                      <div className="text-[9px] text-gray-400">...</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
