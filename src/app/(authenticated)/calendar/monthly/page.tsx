import { Suspense } from 'react';
import { MonthlyGrid } from '@/components/calendar/MonthlyGrid';

export default function MonthlyCalendarPage() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-400">Loading...</div>}>
      <MonthlyGrid />
    </Suspense>
  );
}
