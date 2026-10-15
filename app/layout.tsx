import type { Metadata, Viewport } from 'next'
import { Hind_Siliguri } from 'next/font/google'
import './globals.css'

const font = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ক্লাস রেকডিং | ইক্বরা ইসলামিক মাদরাসা',
  description: 'ব্যাচ রেকডিং ্ক্লাস ও ছবি',
  icons: {
    icon: '/favicon.ico'
  },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className={`${font.className} min-h-dvh bg-neutral-950 text-neutral-100 antialiased`}>
        {children}
      </body>
    </html>
  )
}