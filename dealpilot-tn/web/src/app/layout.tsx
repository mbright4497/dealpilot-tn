import './globals.css';
import { createBrowserClient } from '../lib/supabase';

export const metadata = { title: 'DealPilot TN' };

export default function RootLayout({ children }: { children: React.ReactNode }){
  const supabase = createBrowserClient();
  return (<html><head/></html>);
}
