'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/useLocale';
import {
  getWeekStart, getWeekEnd, formatDateStr, formatDisplayDate, addDays, getWeekDays,
  timeToMinutes, DAY_LABELS_SHORT, ROOM_IDS,
} from '@/lib/calendar-utils';
import Link from 'next/link';

interface Teacher {
  id: number;
  displayName: string;
  role: string;
}

interface CalendarLesson {
  id: number;
  classId: number;
  className: string;
  classType: string;
  classStatus: string;
  classColor: string | null;
  studentCount: number;
  lessonNumber: number;
  totalLessons: number;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  isCancelled: boolean;
  notes: string | null;
  teachers: Teacher[];
}

interface CalendarEvent {
  id: number;
  type: string;
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  teacherId: number | null;
  teacherName: string | null;
  notes: string | null;
}

interface CalendarData {
  lessons: CalendarLesson[];
  events: CalendarEvent[];
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function WeeklyGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const isMobile = useIsMobile();

  const dateParam = searchParams.get('date');
  const [currentDate, setCurrentDate] = useState(() => {
    return dateParam ? new Date(dateParam) : new Date();
  });
  const [data, setData] = useState<CalendarData>({ lessons: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 ? 6 : day - 1; // Mon=0 .. Sun=6
  });

  const weekStart = getWeekStart(currentDate);
  const weekEnd = getWeekEnd(currentDate);
  const weekDays = getWeekDays(weekStart);

  useEffect(() => {
    const start = formatDateStr(weekStart);
    const end = formatDateStr(weekEnd);
    setLoading(true);
    fetch(`/api/calendar?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [currentDate.toISOString()]);

  function navigate(direction: number) {
    const next = addDays(currentDate, direction * 7);
    setCurrentDate(next);
    router.replace(`/calendar/weekly?date=${formatDateStr(next)}`, { scroll: false });
  }

  function goToday() {
    const today = new Date();
    setCurrentDate(today);
    const day = today.getDay();
    setSelectedDayIdx(day === 0 ? 6 : day - 1);
    router.replace(`/calendar/weekly?date=${formatDateStr(today)}`, { scroll: false });
  }

  // Fixed hourly time slots from 09:00 to 22:00
  const timeSlots = useMemo(() => {
    const slots: { start: string; end: string; startMin: number }[] = [];
    for (let h = 11; h < 24; h++) {
      const start = `${String(h).padStart(2, '0')}:00`;
      const end = `${String(h + 1).padStart(2, '0')}:00`;
      slots.push({ start, end, startMin: h * 60 });
    }
    return slots;
  }, []);

  // Build lookup: date -> room -> timeSlot -> items
  // Items are placed in the hourly slot that contains their start time
  const grid = useMemo(() => {
    const map: Record<string, Record<string, Record<string, { lessons: CalendarLesson[]; events: CalendarEvent[] }>>> = {};
    for (const day of weekDays) {
      const dateStr = formatDateStr(day);
      map[dateStr] = {};
      for (const room of ROOM_IDS) {
        map[dateStr][room] = {};
        for (const slot of timeSlots) {
          map[dateStr][room][`${slot.start}-${slot.end}`] = { lessons: [], events: [] };
        }
      }
    }
    function findSlotKey(startTime: string): string | null {
      const mins = timeToMinutes(startTime);
      for (const slot of timeSlots) {
        if (mins >= slot.startMin && mins < slot.startMin + 60) {
          return `${slot.start}-${slot.end}`;
        }
      }
      return null;
    }
    for (const lesson of data.lessons) {
      const slotKey = findSlotKey(lesson.startTime);
      if (slotKey && map[lesson.date]?.[lesson.room]?.[slotKey]) {
        map[lesson.date][lesson.room][slotKey].lessons.push(lesson);
      }
    }
    for (const event of data.events) {
      if (!event.startTime || !event.endTime) continue;
      const slotKey = findSlotKey(event.startTime);
      if (!slotKey) continue;
      const rooms = event.room ? [event.room] : [...ROOM_IDS];
      for (const room of rooms) {
        if (map[event.date]?.[room]?.[slotKey]) {
          map[event.date][room][slotKey].events.push(event);
        }
      }
    }
    return map;
  }, [data, timeSlots, weekDays]);

  // All-day events
  const allDayEvents = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of data.events) {
      if (!event.startTime) {
        if (!map[event.date]) map[event.date] = [];
        map[event.date].push(event);
      }
    }
    return map;
  }, [data]);

  const todayStr = formatDateStr(new Date());

  return (
    <div className="flex flex-col h-full">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white border-b gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded text-lg">&larr;</button>
          <button onClick={goToday} className="text-sm px-2 py-1 rounded border hover:bg-gray-50">
            {t('today')}
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 rounded text-lg">&rarr;</button>
          <span className="text-xs sm:text-sm font-medium ml-1">
            {formatDateStr(weekStart).replaceAll('-', '/')} ~ {formatDateStr(weekEnd).replaceAll('-', '/')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={`/calendar/weekly?date=${formatDateStr(currentDate)}`}
            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">
            {t('weekly')}
          </Link>
          <Link href={`/calendar/monthly?date=${formatDateStr(currentDate)}`}
            className="text-xs px-2 py-1 rounded hover:bg-gray-50 text-gray-600">
            {t('monthly')}
          </Link>
          <Link href="/classes/new" className="hidden sm:inline text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
            + {t('addClass')}
          </Link>
          <Link href="/events/new" className="hidden sm:inline text-xs px-2 py-1 rounded border border-blue-600 text-blue-600 hover:bg-blue-50">
            + {t('addEvent')}
          </Link>
        </div>
      </div>

      {/* Mobile: add buttons row */}
      <div className="sm:hidden flex gap-2 px-3 py-2 bg-white border-b">
        <Link href="/classes/new" className="flex-1 text-center text-xs py-1.5 rounded bg-blue-600 text-white">
          + {t('addClass')}
        </Link>
        <Link href="/events/new" className="flex-1 text-center text-xs py-1.5 rounded border border-blue-600 text-blue-600">
          + {t('addEvent')}
        </Link>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
      )}

      {/* MOBILE: Single-day view with day tabs */}
      {isMobile ? (
        <div className="flex-1 overflow-auto">
          {/* Day tabs */}
          <div className="flex border-b bg-white sticky top-0 z-10">
            {weekDays.map((day, i) => {
              const dateStr = formatDateStr(day);
              const isToday = dateStr === todayStr;
              const isSelected = i === selectedDayIdx;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDayIdx(i)}
                  className={`flex-1 py-2 text-center text-xs border-b-2 transition-colors ${
                    isSelected
                      ? 'border-blue-600 text-blue-700 font-bold'
                      : isToday
                        ? 'border-blue-200 text-blue-500'
                        : 'border-transparent text-gray-500'
                  }`}
                >
                  <div>{t(DAY_LABELS_SHORT[i])}</div>
                  <div className="text-[10px]">{formatDisplayDate(day)}</div>
                </button>
              );
            })}
          </div>

          {/* Single day content with two room columns */}
          <div className="p-2">
            {(() => {
              const dateStr = formatDateStr(weekDays[selectedDayIdx]);
              const dayAllDay = allDayEvents[dateStr] || [];

              return (
                <>
                  {dayAllDay.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {dayAllDay.map((event) => (
                        <Link key={event.id} href={`/events/${event.id}`}>
                          <EventChip event={event} />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Room headers */}
                  <div className="grid grid-cols-[60px_1fr_1fr] gap-px mb-1">
                    <div />
                    <div className="text-center text-xs text-gray-400 font-medium">RV</div>
                    <div className="text-center text-xs text-gray-400 font-medium">Pal</div>
                  </div>

                  {timeSlots.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-400 text-sm">No items</div>
                  )}

                  {timeSlots.map((block) => (
                    <div key={`${block.start}-${block.end}`}
                      className="grid grid-cols-[60px_1fr_1fr] gap-px border-b border-gray-100 py-1">
                      <div className="text-[10px] text-gray-500 pr-1 text-right">
                        {block.start}<br />{block.end}
                      </div>
                      {ROOM_IDS.map((room) => {
                        const cell = grid[dateStr]?.[room]?.[`${block.start}-${block.end}`];
                        return (
                          <div key={room} className="min-h-[50px] px-0.5">
                            {cell?.lessons.map((lesson) => (
                              <Link key={lesson.id} href={`/classes/${lesson.classId}`}>
                                <LessonCard lesson={lesson} />
                              </Link>
                            ))}
                            {cell?.events.map((event) => (
                              <Link key={event.id} href={`/events/${event.id}`}>
                                <EventChip event={event} />
                              </Link>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        /* DESKTOP: Full 7-day grid */
        <div className="flex-1 overflow-auto">
          <div className="min-w-[900px]">
            {/* Day headers */}
            <div className="grid border-b bg-gray-50 sticky top-0 z-10"
              style={{ gridTemplateColumns: '80px repeat(14, 1fr)' }}>
              <div className="border-r p-2" />
              {weekDays.map((day, i) => {
                const dateStr = formatDateStr(day);
                const isToday = dateStr === todayStr;
                return (
                  <div key={i}
                    className={`col-span-2 text-center py-2 border-r text-sm ${
                      isToday ? 'bg-blue-50 font-bold text-blue-700' : ''
                    }`}>
                    <div>{t(DAY_LABELS_SHORT[i])}</div>
                    <div className="text-xs text-gray-400">{formatDisplayDate(day)}</div>
                  </div>
                );
              })}
            </div>

            {/* Room sub-headers */}
            <div className="grid border-b bg-gray-50 sticky top-[52px] z-10"
              style={{ gridTemplateColumns: '80px repeat(14, 1fr)' }}>
              <div className="border-r p-1" />
              {weekDays.map((_, i) => (
                <div key={i} className="contents">
                  <div className="text-center text-[10px] text-gray-400 border-r py-1 truncate px-0.5">RV</div>
                  <div className="text-center text-[10px] text-gray-400 border-r py-1 truncate px-0.5">Pal</div>
                </div>
              ))}
            </div>

            {/* All-day events row */}
            {Object.keys(allDayEvents).length > 0 && (
              <div className="grid border-b"
                style={{ gridTemplateColumns: '80px repeat(14, 1fr)' }}>
                <div className="border-r p-1 text-[10px] text-gray-400 text-right pr-2">{t('allDay')}</div>
                {weekDays.map((day, i) => {
                  const dateStr = formatDateStr(day);
                  const dayEvents = allDayEvents[dateStr] || [];
                  return (
                    <div key={i} className="col-span-2 border-r p-1 min-h-[24px]">
                      {dayEvents.map((event) => (
                        <Link key={event.id} href={`/events/${event.id}`}>
                          <EventChip event={event} />
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Time block rows */}
            {timeSlots.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-400 text-sm">
                No lessons or events this week
              </div>
            )}
            {timeSlots.map((block) => (
              <div key={`${block.start}-${block.end}`} className="grid border-b"
                style={{ gridTemplateColumns: '80px repeat(14, 1fr)' }}>
                <div className="border-r p-1 text-[10px] text-gray-500 text-right pr-2 whitespace-nowrap">
                  {block.start}<br />{block.end}
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dateStr = formatDateStr(day);
                  return ROOM_IDS.map((room, roomIdx) => {
                    const cell = grid[dateStr]?.[room]?.[`${block.start}-${block.end}`];
                    return (
                      <div key={`${dayIdx}-${roomIdx}`}
                        className={`border-r p-0.5 min-h-[60px] ${
                          dateStr === todayStr ? 'bg-blue-50/30' : ''
                        }`}>
                        {cell?.lessons.map((lesson) => (
                          <Link key={lesson.id} href={`/classes/${lesson.classId}`}>
                            <LessonCard lesson={lesson} />
                          </Link>
                        ))}
                        {cell?.events.map((event) => (
                          <Link key={event.id} href={`/events/${event.id}`}>
                            <EventChip event={event} />
                          </Link>
                        ))}
                      </div>
                    );
                  });
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: CalendarLesson }) {
  const statusColor = lesson.classStatus === 'confirmed'
    ? 'border-l-green-500'
    : lesson.classStatus === 'cancelled'
      ? 'border-l-red-400'
      : 'border-l-yellow-400';

  return (
    <div
      className={`text-[10px] leading-tight rounded p-1 mb-0.5 border-l-2 ${statusColor} ${
        lesson.isCancelled ? 'opacity-40 line-through' : ''
      }`}
      style={{ backgroundColor: (lesson.classColor || '#4A90D9') + '20' }}
    >
      <div className="font-medium truncate" style={{ color: lesson.classColor || '#4A90D9' }}>
        {lesson.className}
      </div>
      <div className="text-gray-500">
        {lesson.lessonNumber}/{lesson.totalLessons}
      </div>
      <div className="text-gray-400 truncate">
        {lesson.teachers.map((t) => t.displayName.split(' ')[0]).join('&')}
      </div>
    </div>
  );
}

function EventChip({ event }: { event: CalendarEvent }) {
  const typeColors: Record<string, string> = {
    party: 'bg-purple-100 text-purple-700',
    gig: 'bg-blue-100 text-blue-700',
    absence: 'bg-red-100 text-red-700',
    note: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className={`text-[10px] leading-tight rounded p-1 mb-0.5 ${typeColors[event.type] || 'bg-gray-100'}`}>
      <div className="font-medium truncate">{event.title}</div>
      {event.teacherName && (
        <div className="truncate opacity-70">{event.teacherName}</div>
      )}
    </div>
  );
}
