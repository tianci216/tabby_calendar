import { db } from '@/db';
import { events, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { t, type Locale } from '@/lib/i18n';
import { EventForm } from '@/components/forms/EventForm';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const event = db.select().from(events).where(eq(events.id, parseInt(id))).get();
  if (!event) notFound();

  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value || 'en') as Locale;

  const teachers = db.select({
    id: users.id,
    displayName: users.displayName,
  }).from(users).all();

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">{t(locale, 'edit')} - {event.title}</h1>
      <EventForm
        teachers={teachers}
        initialData={event}
      />
    </div>
  );
}
