import { redirect } from 'next/navigation';

// El dashboard viejo quedó integrado en la app (/ y /proyeccion).
export default function Dashboard() {
  redirect('/');
}
