import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  return (
    <>
      <Navbar user={user} />
      <main>{children}</main>
    </>
  );
}
