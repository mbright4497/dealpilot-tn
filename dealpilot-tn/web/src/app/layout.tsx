import './globals.css'
import Sidebar from './components/Sidebar'

export const metadata = { title: 'ClosingPilot TN' }

export default function RootLayout({ children }:{ children: React.ReactNode }){
  return (
    <html lang="en">
      <body className="bg-[#061021] text-gray-100">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  )
}
