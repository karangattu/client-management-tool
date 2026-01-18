import { redirect } from 'next/navigation';

export default function Home() {
  // Always redirect to login - no public landing page
  redirect('/login');
}
