'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/useLocale';
import { formatDateStr, getWeekStart, getWeekEnd, addDays } from '@/lib/calendar-utils';

interface SummaryLesson {
  id: number;
  className: string;
  classStatus: string;
  lessonNumber: number;
  totalLessons: number;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
}

export function TeacherSummary() {
  const t = useT();
  const [thisWeekLessons, setThisWeekLessons] = useState<SummaryLesson[]>([]);
  const [nextWeekLessons, setNextWeekLessons] = useState<SummaryLesson[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const now = new Date();
    const thisStart = getWeekStart(now);
    const thisEnd = getWeekEnd(now);
    const nextStart = addDays(thisStart, 7);
    const nextEnd = addDays(thisEnd, 7);

    fetch(`/api/calendar?start=${formatDateStr(thisStart)}&end=${formatDateStr(thisEnd)}`)
      .then((r) => r.json())
      .then((d) => setThisWeekLessons(d.lessons || []));

    fetch(`/api/calendar?start=${formatDateStr(nextStart)}&end=${formatDateStr(nextEnd)}`)
      .then((r) => r.json())
      .then((d) => setNextWeekLessons(d.lessons || []));
  }, []);

  return (
    <div className="bg-white border rounded-lg p-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
      >
        {t('upcomingLessons')}
        <span className="text-xs text-gray-400">{collapsed ? '+' : '-'}</span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">
              {t('thisWeek')} ({thisWeekLessons.length})
            </div>
            {thisWeekLessons.length === 0 ? (
              <div className="text-xs text-gray-400">{t('noLessons')}</div>
            ) : (
              <div className="space-y-1">
                {thisWeekLessons.map((l) => (
                  <div key={l.id} className="text-xs flex items-center justify-between">
                    <span className="truncate">
                      {l.className} ({l.lessonNumber}/{l.totalLessons})
                    </span>
                    <span className="text-gray-400 shrink-0 ml-2">
                      {l.date.slice(5)} {l.startTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">
              {t('nextWeek')} ({nextWeekLessons.length})
            </div>
            {nextWeekLessons.length === 0 ? (
              <div className="text-xs text-gray-400">{t('noLessons')}</div>
            ) : (
              <div className="space-y-1">
                {nextWeekLessons.map((l) => (
                  <div key={l.id} className="text-xs flex items-center justify-between">
                    <span className="truncate">
                      {l.className} ({l.lessonNumber}/{l.totalLessons})
                    </span>
                    <span className="text-gray-400 shrink-0 ml-2">
                      {l.date.slice(5)} {l.startTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
