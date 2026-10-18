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
  description: 'ব্যাচ রেকডিং ক্লাস ও ছবি',
  icons: {
    icon: '/favicon.ico'
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'ইক্বরা ইসলামিক মাদরাসা — ক্লাস রেকডিং',
    description: 'সহীহ শুদ্ধভাবে কুরআন শিক্ষা কোর্স — শুধুমাত্র নারীদের জন্য',
    images: ['https://iim-recording-class.web.app/assets/logo/logo.png'],
  },
  twitter: {
    card: 'summary',
    title: 'ইক্বরা ইসলামিক মাদরাসা — ক্লাস রেকডিং',
    images: ['https://iim-recording-class.web.app/assets/logo/logo.png'],
  },
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