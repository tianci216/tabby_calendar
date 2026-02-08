export interface SchedulePattern {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // 'HH:MM'
  endTime: string;   // 'HH:MM'
}

export interface GenerateLessonsInput {
  classId: number;
  room: 'rendez_vous' | 'palomar';
  totalLessons: number;
  firstDate: string; // 'YYYY-MM-DD'
  patterns: SchedulePattern[];
}

interface LessonRow {
  classId: number;
  lessonNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  room: 'rendez_vous' | 'palomar';
  isCancelled: boolean;
  notes: null;
  createdAt: string;
  updatedAt: string;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function generateLessons(input: GenerateLessonsInput): LessonRow[] {
  const lessons: LessonRow[] = [];
  const now = new Date().toISOString();
  const firstDate = parseDate(input.firstDate);

  // Sort patterns by dayOfWeek so we process them in order within a week
  const sortedPatterns = [...input.patterns].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  // Find the first occurrence for each pattern starting from firstDate
  const upcomingDates: { pattern: SchedulePattern; date: Date }[] = [];

  for (const pattern of sortedPatterns) {
    const currentDay = firstDate.getDay();
    let daysUntil = pattern.dayOfWeek - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    const nextDate = addDays(firstDate, daysUntil);
    upcomingDates.push({ pattern, date: nextDate });
  }

  // Sort by date to interleave correctly
  upcomingDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  let lessonNumber = 1;
  let patternIndex = 0;

  while (lessonNumber <= input.totalLessons) {
    const { pattern, date } = upcomingDates[patternIndex];

    lessons.push({
      classId: input.classId,
      lessonNumber,
      date: formatDate(date),
      startTime: pattern.startTime,
      endTime: pattern.endTime,
      room: input.room,
      isCancelled: false,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });

    // Advance this pattern to the next week
    upcomingDates[patternIndex] = {
      pattern,
      date: addDays(date, 7),
    };

    lessonNumber++;

    // Move to next pattern in round-robin, wrapping around
    patternIndex = (patternIndex + 1) % upcomingDates.length;

    // Re-sort to keep chronological order
    // For 1-2 patterns this is fine
    upcomingDates.sort((a, b) => a.date.getTime() - b.date.getTime());
    patternIndex = 0; // always pick the earliest upcoming date
  }

  return lessons;
}
