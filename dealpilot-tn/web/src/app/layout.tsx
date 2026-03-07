import React from 'react';
import './globals.css';
import { EvaProvider } from '@/components/eva/EvaProvider'
import EvaFab from '@/components/eva/EvaFab'
import EvaDrawer from '@/components/eva/EvaDrawer'
import dynamic from 'next/dynamic'

const EmailDraftModal = dynamic(() => import('@/components/eva/EmailDraftModal'), { ssr: false })

export const metadata = { title: 'ClosingPilot TN' };

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <head>
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#f97316" />
</head>
      <body>
        <EvaProvider>
          {children}
          <EvaFab />
          <EvaDrawer />
          <EmailDraftModal />
        </EvaProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('error', function(e){
            try{ fetch('/api/client-error', {method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify({message: String(e.message), filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error && e.error.stack})}) }catch(_){ }
          });
          window.addEventListener('unhandledrejection', function(e){
            try{ fetch('/api/client-error', {method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify({message: String(e.reason && e.reason.message || e.reason), stack: e.reason && e.reason.stack})}) }catch(_){ }
          });
        `}} />
      </body>
    </html>
  );
}
