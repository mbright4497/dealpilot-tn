import './globals.css'

export const metadata = { title: 'ClosingPilot TN' }

export default function RootLayout({ children }:{ children: React.ReactNode }){
  return (
    <html lang="en">
      <body className="bg-[#061021] text-gray-100">{children}</body>
    </html>
  )
}
