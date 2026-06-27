import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: '鬼速PDCA',
  description: '第二領域の非緊急・重要タスク管理ツール',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} h-full`}>
      <body className="h-full antialiased bg-slate-50 text-slate-900">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
