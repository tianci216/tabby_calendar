'use client';

import { useState, useEffect, useMemo } from 'react';
import { useT } from '@/lib/useLocale';
import { formatDateStr, formatDisplayDate, getWeekStart, getWeekEnd, addDays } from '@/lib/calendar-utils';

interface Teacher {
  id: number;
  displayName: string;
  role: string;
}

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
  teachers: Teacher[];
}

export function TeacherSummary() {
  const t = useT();
  const [thisWeekLessons, setThisWeekLessons] = useState<SummaryLesson[]>([]);
  const [nextWeekLessons, setNextWeekLessons] = useState<SummaryLesson[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<number | null>(null); // null = All

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

  // Collect unique instructors from all lessons
  const instructors = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of [...thisWeekLessons, ...nextWeekLessons]) {
      for (const teacher of l.teachers) {
        map.set(teacher.id, teacher.displayName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [thisWeekLessons, nextWeekLessons]);

  // Filter lessons by selected instructor
  function filterLessons(lessons: SummaryLesson[]) {
    if (selectedInstructor === null) return lessons;
    return lessons.filter((l) => l.teachers.some((teacher) => teacher.id === selectedInstructor));
  }

  const filteredThis = filterLessons(thisWeekLessons);
  const filteredNext = filterLessons(nextWeekLessons);

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
          {/* Instructor filter tabs */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedInstructor(null)}
              className={`text-xs px-2 py-0.5 rounded-full ${
                selectedInstructor === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('allInstructors')}
            </button>
            {instructors.map((inst) => (
              <button
                key={inst.id}
                onClick={() => setSelectedInstructor(inst.id)}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedInstructor === inst.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {inst.name}
              </button>
            ))}
          </div>

          <LessonSection label={`${t('thisWeek')} (${filteredThis.length})`} lessons={filteredThis} noLabel={t('noLessons')} />
          <LessonSection label={`${t('nextWeek')} (${filteredNext.length})`} lessons={filteredNext} noLabel={t('noLessons')} />
        </div>
      )}
    </div>
  );
}

function LessonSection({ label, lessons, noLabel }: { label: string; lessons: SummaryLesson[]; noLabel: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      {lessons.length === 0 ? (
        <div className="text-xs text-gray-400">{noLabel}</div>
      ) : (
        <div className="space-y-1">
          {lessons.map((l) => (
            <div key={l.id} className="text-xs flex items-center justify-between">
              <span className="truncate">
                {l.className} ({l.lessonNumber}/{l.totalLessons})
              </span>
              <span className="text-gray-400 shrink-0 ml-2">
                {formatDisplayDate(l.date)} {l.startTime}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
