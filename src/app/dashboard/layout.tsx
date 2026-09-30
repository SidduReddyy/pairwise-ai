'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  MessageSquareHeart,
  Trophy,
  History,
  Plus,
  Heart,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/people', label: 'People & Profiles', icon: Users },
  { href: '/dashboard/people/add', label: 'Add Person', icon: Plus },
  { href: '/dashboard/sessions', label: 'Dating Sessions', icon: MessageSquareHeart },
  { href: '/dashboard/rankings', label: 'Match Rankings', icon: Trophy },
  { href: '/dashboard/history', label: 'Run History', icon: History },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-[#faf7f2]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-[#e8e0d4] bg-white">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[#e8e0d4]">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 coral-gradient rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <div className="text-display font-normal text-[#1a1612] text-lg leading-none">
                Pairwise
              </div>
              <div className="text-xs text-[#8a7d6e] flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3" />
                AI Powered
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? 'nav-item-active' : 'nav-item'}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Demo Mode Badge */}
        <div className="px-4 py-4 border-t border-[#e8e0d4]">
          <div className="bg-[#e8e4ff] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#5040a0]" />
              <span className="text-xs font-semibold text-[#5040a0]">DEMO MODE</span>
            </div>
            <p className="text-[10px] text-[#6050c0] leading-snug">
              25 synthetic profiles available. Profiles are clearly labeled as fictional.
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
