import React from 'react';
import Link from 'next/link';
import {
  School,
  LayoutDashboard,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Users,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface PortalLayoutProps {
  children: React.ReactNode;
  roleTitle: string;
  roleBadge: string;
  navItems: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

export default function PortalLayout({
  children,
  roleTitle,
  roleBadge,
  navItems,
}: PortalLayoutProps) {
  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-none">SIA SMKN 2</div>
            <span className="text-[10px] text-blue-400 font-medium">{roleBadge}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white">
                U
              </div>
              <div>
                <p className="text-xs font-medium text-white">User Aktif</p>
                <p className="text-[10px] text-slate-400">{roleTitle}</p>
              </div>
            </div>
            <Link
              href="/auth/login"
              title="Keluar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              SIA
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-900">{roleTitle}</span>
          </div>
          <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            Semester Ganjil 2026/2027
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8 flex-1">{children}</div>
      </div>
    </div>
  );
}
