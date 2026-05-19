import { Outlet, useLocation } from 'react-router-dom';
import { Bell, Search, ChevronRight } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';

// ── Breadcrumb config ─────────────────────────────────────────────────────────

const ROUTE_META: Record<string, { label: string; description: string }> = {
  '/dashboard': { label: 'Dashboard',       description: 'Overview of your workspace'     },
  '/projects':  { label: 'Projects',        description: 'Manage your active projects'    },
  '/tasks':     { label: 'My Tasks',        description: 'Track your assigned work'       },
  '/team':      { label: 'Team',            description: 'Browse and invite team members' },
  '/ai':        { label: 'AI Scrum Master', description: 'Decompose epics with AI'        },
};

const getRouteMeta = (pathname: string) => {
  const key = Object.keys(ROUTE_META).find((k) => pathname.startsWith(k));
  return key ? ROUTE_META[key] : { label: 'Nexus', description: '' };
};

// ── User avatar initials (placeholder until auth is wired) ────────────────────
const UserAvatar = () => (
  <button
    aria-label="User menu"
    className="
      flex items-center gap-2.5
      pl-1 pr-3 py-1 rounded-xl
      hover:bg-slate-100 dark:hover:bg-slate-800
      transition-all duration-150 group
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
    "
  >
    <span className="
      flex items-center justify-center
      w-7 h-7 rounded-lg shrink-0
      bg-sky-500 text-white
      text-[12px] font-semibold
    ">
      N
    </span>
    <span className="
      text-[13px] font-medium
      text-slate-700 dark:text-slate-300
      group-hover:text-slate-900 dark:group-hover:text-slate-100
      hidden sm:block
    ">
      Account
    </span>
    <ChevronRight
      size={13}
      className="text-slate-400 dark:text-slate-600 hidden sm:block"
    />
  </button>
);

// ── Main layout ───────────────────────────────────────────────────────────────

export const AppLayout = () => {
  const location = useLocation();
  const meta     = getRouteMeta(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <Sidebar />

      {/* ── Right panel ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Topbar ───────────────────────────────────────── */}
        <header className="
          flex items-center justify-between
          h-16 px-5 shrink-0
          bg-white dark:bg-slate-950
          border-b border-slate-100 dark:border-slate-800/60
        ">
          {/* Left: page title + description */}
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="
              text-[15px] font-semibold leading-tight
              text-slate-900 dark:text-slate-50
              truncate
            ">
              {meta.label}
            </h1>
            {meta.description && (
              <p className="
                text-[12px] leading-tight mt-0.5
                text-slate-400 dark:text-slate-600
                hidden sm:block truncate
              ">
                {meta.description}
              </p>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0 ml-4">

            {/* Search */}
            <button
              aria-label="Search"
              className="
                hidden sm:flex items-center gap-2
                h-9 px-3 rounded-xl
                bg-slate-100 dark:bg-slate-800/60
                hover:bg-sky-50 dark:hover:bg-sky-500/10
                border border-slate-200 dark:border-slate-700
                hover:border-sky-200 dark:hover:border-sky-500/30
                text-slate-400 dark:text-slate-500
                hover:text-sky-500 dark:hover:text-sky-400
                text-[13px] font-medium
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              "
            >
              <Search size={14} />
              <span className="text-slate-400 dark:text-slate-500">Search</span>
              <kbd className="
                ml-1 px-1.5 py-0.5 rounded-md
                text-[10px] font-mono
                bg-slate-200 dark:bg-slate-700
                text-slate-400 dark:text-slate-500
                border border-slate-300 dark:border-slate-600
              ">
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <button
              aria-label="Notifications"
              className="
                relative flex items-center justify-center
                w-9 h-9 rounded-xl
                bg-slate-100 dark:bg-slate-800/60
                hover:bg-sky-50 dark:hover:bg-sky-500/10
                border border-slate-200 dark:border-slate-700
                hover:border-sky-200 dark:hover:border-sky-500/30
                text-slate-400 dark:text-slate-500
                hover:text-sky-500 dark:hover:text-sky-400
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              "
            >
              <Bell size={15} />
              {/* Unread dot */}
              <span className="
                absolute top-2 right-2
                w-1.5 h-1.5 rounded-full
                bg-sky-500
                ring-2 ring-white dark:ring-slate-950
              " />
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* User */}
            <UserAvatar />
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────── */}
        <main className="
          flex-1 overflow-y-auto
          p-6
          bg-slate-50 dark:bg-slate-950
        ">
          {/* Subtle top-of-content divider accent */}
          <div className="
            h-px w-full mb-6
            bg-gradient-to-r from-transparent via-sky-200 dark:via-sky-500/20 to-transparent
          " />

          <Outlet />
        </main>
      </div>
    </div>
  );
};