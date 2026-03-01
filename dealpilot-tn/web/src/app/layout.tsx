import React from 'react';
import './globals.css';

export const metadata = { title: 'DealPilot TN' };

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <head />
      <body>
        {children}
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
