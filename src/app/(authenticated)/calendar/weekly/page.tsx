import { Suspense } from 'react';
import { WeeklyGrid } from '@/components/calendar/WeeklyGrid';
import { TeacherSummary } from '@/components/calendar/TeacherSummary';

export default function WeeklyCalendarPage() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)]">
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="p-4 text-gray-400">Loading...</div>}>
          <WeeklyGrid />
        </Suspense>
      </div>
      <div className="w-full lg:w-64 p-3 border-t lg:border-t-0 lg:border-l overflow-auto">
        <TeacherSummary />
      </div>
    </div>
  );
}
