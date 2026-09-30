import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pairwise AI — Intelligent Dating Compatibility',
  description:
    'AI-powered dating compatibility platform using public social media analysis and simulated agent conversations. Demo prototype for internship coding challenge.',
  keywords: ['dating', 'AI', 'compatibility', 'matching', 'social media analysis'],
  robots: 'noindex, nofollow', // Keep private during demo phase
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
