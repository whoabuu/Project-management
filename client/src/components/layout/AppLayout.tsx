import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bot,
  Zap,
  //Settings,
  SlidersHorizontal,
  LogOut,
  X,
  Check,
  UserCircle2,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  label:   string;
  to:      string;
  icon:    React.ReactNode;
  badge?:  string;
}

interface Notification {
  id:        string;
  title:     string;
  body:      string;
  timestamp: string;
  read:      boolean;
  icon:      React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts initials from a full name.
 * "Abu Bakar Tamboli" → "AT" (first + last word initial)
 * "Sara"              → "S"
 * undefined           → "U"
 */
const getInitials = (name?: string): string => {
  if (!name?.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? 'U').toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const last  = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase();
};

const ROLE_LABELS: Record<string, string> = {
  admin:           'Admin',
  project_manager: 'Project Manager',
  developer:       'Developer',
  viewer:          'Viewer',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin:           'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400',
  project_manager: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
  developer:       'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
  viewer:          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
};

// ── Config ────────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       to: '/dashboard', icon: <LayoutDashboard size={17} />                    },
  { label: 'Projects',        to: '/projects',  icon: <FolderKanban size={17} />                       },
  { label: 'My Tasks',        to: '/tasks',     icon: <CheckSquare size={17} />                        },
  { label: 'Team',            to: '/team',      icon: <Users size={17} />                              },
  { label: 'AI Scrum Master', to: '/ai',        icon: <Bot size={17} />, badge: 'AI'                   },
];

const ROUTE_META: Record<string, { label: string; description: string }> = {
  '/dashboard': { label: 'Dashboard',       description: 'Overview of your workspace'     },
  '/projects':  { label: 'Projects',        description: 'Manage your active projects'    },
  '/tasks':     { label: 'My Tasks',        description: 'Track your assigned work'       },
  '/team':      { label: 'Team',            description: 'Browse and invite team members' },
  '/ai':        { label: 'AI Scrum Master', description: 'Decompose epics with AI'        },
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id:        'n1',
    title:     'AI Scrum Master',
    body:      'Generated 3 new tasks for the Auth Epic in Sprint 4',
    timestamp: '10m ago',
    read:      false,
    icon:      <Bot size={14} className="text-sky-500" />,
  },
  {
    id:        'n2',
    title:     'Sprint 4 Started',
    body:      'Leo Martins kicked off Sprint 4 with 48 story points',
    timestamp: '1h ago',
    read:      false,
    icon:      <Zap size={14} className="text-violet-500" />,
  },
  {
    id:        'n3',
    title:     'Task Assigned',
    body:      'Sara R. assigned "Integrate Groq LLM" to you',
    timestamp: '3h ago',
    read:      true,
    icon:      <CheckSquare size={14} className="text-emerald-500" />,
  },
];

const getRouteMeta = (pathname: string) => {
  const key = Object.keys(ROUTE_META).find((k) => pathname.startsWith(k));
  return key ? ROUTE_META[key] : { label: 'Nexus', description: '' };
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

const Sidebar = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => {
  const location = useLocation();
  useTheme();

  return (
    <aside className={`
      relative flex flex-col h-screen shrink-0
      bg-white dark:bg-slate-950
      border-r border-slate-100 dark:border-slate-800/60
      transition-all duration-300 ease-in-out
      ${collapsed ? 'w-[68px]' : 'w-[230px]'}
    `}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-100 dark:border-slate-800/60 overflow-hidden">
        <a href="/dashboard" className="flex items-center gap-3 min-w-0">
          <img
            src="/nexus-icon-32.svg"
            alt="Nexus"
            width={32}
            height={32}
            className="shrink-0"
          />
          <span className={`
            flex flex-col leading-none min-w-0 transition-all duration-200 overflow-hidden
            ${collapsed ? 'w-0 opacity-0' : 'opacity-100'}
          `}>
            <span className="text-[17px] font-semibold tracking-wide text-slate-900 dark:text-slate-50 whitespace-nowrap">
              nexus
            </span>
            <span className="text-[8px] font-medium tracking-[0.18em] uppercase text-slate-400 dark:text-slate-600 whitespace-nowrap mt-0.5">
              agile workspace
            </span>
          </span>
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
        {!collapsed && (
          <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-400 dark:text-slate-600">
            Menu
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={`
                    group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                    text-[13.5px] font-medium transition-all duration-150 ease-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                    ${isActive
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }
                  `}
                >
                  <span className={`
                    shrink-0 transition-colors duration-150
                    ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400'}
                  `}>
                    {item.icon}
                  </span>

                  <span className={`flex-1 whitespace-nowrap overflow-hidden transition-all duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    {item.label}
                  </span>

                  {item.badge && !collapsed && (
                    <span className={`
                      px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide
                      ${isActive ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400'}
                    `}>
                      {item.badge}
                    </span>
                  )}

                  {collapsed && (
                    <span className="
                      pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 z-50
                      text-[12px] font-medium whitespace-nowrap
                      bg-slate-900 dark:bg-slate-700 text-white
                      rounded-lg shadow-xl
                      opacity-0 group-hover:opacity-100
                      translate-x-2 group-hover:translate-x-0
                      transition-all duration-150
                    ">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-slate-100 dark:border-slate-800/60">
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="
            flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl
            text-[13px] font-medium
            text-slate-400 dark:text-slate-600
            hover:bg-slate-50 dark:hover:bg-slate-800/60
            hover:text-slate-700 dark:hover:text-slate-300
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
          "
        >
          {collapsed
            ? <PanelLeftOpen size={16} />
            : <><PanelLeftClose size={16} /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
};

// ── Notification Popover ──────────────────────────────────────────────────────

const NotificationPopover = ({
  notifications,
  onMarkAllRead,
  onClose,
}: {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onClose:       () => void;
}) => {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="
      absolute right-0 top-full mt-2 z-50
      w-[340px] rounded-2xl
      bg-white dark:bg-slate-900
      border border-slate-200 dark:border-slate-700
      shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60
      overflow-hidden
    ">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">
            Notifications
          </h3>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-bold tabular-nums">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              onClick={onMarkAllRead}
              className="
                flex items-center gap-1 px-2 py-1 rounded-lg
                text-[11.5px] font-medium text-sky-500 dark:text-sky-400
                hover:bg-sky-50 dark:hover:bg-sky-500/10
                transition-colors duration-150
              "
            >
              <Check size={11} /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="
              flex items-center justify-center w-6 h-6 rounded-lg
              text-slate-400 dark:text-slate-600
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-colors duration-150
            "
            aria-label="Close notifications"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <ul className="max-h-[320px] overflow-y-auto">
        {notifications.map((notif) => (
          <li key={notif.id} className={`
            flex items-start gap-3 px-4 py-3
            border-b border-slate-50 dark:border-slate-800/60 last:border-0
            hover:bg-slate-50 dark:hover:bg-slate-800/40
            transition-colors duration-100 cursor-pointer
            ${!notif.read ? 'bg-sky-50/40 dark:bg-sky-500/5' : ''}
          `}>
            <div className="
              flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mt-0.5
              bg-slate-100 dark:bg-slate-800
            ">
              {notif.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {notif.title}
                </p>
                <span className="text-[10.5px] text-slate-400 dark:text-slate-600 shrink-0">
                  {notif.timestamp}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                {notif.body}
              </p>
            </div>
            {!notif.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
            )}
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <button className="
          w-full text-center text-[12px] font-medium
          text-sky-500 dark:text-sky-400
          hover:text-sky-600 dark:hover:text-sky-300
          transition-colors duration-150
        ">
          View all notifications
        </button>
      </div>
    </div>
  );
};

// ── Account Dropdown ──────────────────────────────────────────────────────────

const AccountDropdown = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleBadge  = ROLE_BADGE_STYLES[user?.role ?? 'viewer'];
  const roleLabel  = ROLE_LABELS[user?.role ?? 'viewer'] ?? 'Viewer';
  const initials   = getInitials(user?.name);

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <div className="
      absolute right-0 top-full mt-2 z-50
      w-[260px] rounded-2xl
      bg-white dark:bg-slate-900
      border border-slate-200 dark:border-slate-700
      shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60
      overflow-hidden
    ">
      {/* User info header */}
      <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="
            flex items-center justify-center w-10 h-10 rounded-xl shrink-0
            bg-gradient-to-br from-sky-400 to-indigo-500
            text-white font-bold text-[14px]
          ">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50 truncate">
              {user?.name ?? 'User'}
            </p>
            <p className="text-[11.5px] text-slate-400 dark:text-slate-600 truncate mt-0.5">
              {user?.email ?? ''}
            </p>
          </div>
        </div>
        <span className={`
          inline-flex mt-3 px-2 py-0.5 rounded-lg
          text-[10.5px] font-semibold
          ${roleBadge}
        `}>
          {roleLabel}
        </span>
      </div>

      {/* Menu items */}
      <div className="py-1.5 px-1.5">
        <button
          onClick={() => { navigate('/profile'); onClose(); }}
          className="
            flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
            text-[13px] font-medium text-slate-700 dark:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-800
            transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
          "
        >
          <UserCircle2 size={15} className="text-slate-400 dark:text-slate-600 shrink-0" />
          Profile Settings
        </button>

        <button
          onClick={() => { navigate('/preferences'); onClose(); }}
          className="
            flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
            text-[13px] font-medium text-slate-700 dark:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-800
            transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
          "
        >
          <SlidersHorizontal size={15} className="text-slate-400 dark:text-slate-600 shrink-0" />
          Workspace Preferences
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />

      {/* Logout */}
      <div className="py-1.5 px-1.5">
        <button
          onClick={() => void handleLogout()}
          className="
            flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
            text-[13px] font-medium text-red-500 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-500/10
            transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
          "
        >
          <LogOut size={15} className="shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

// ── Topbar ────────────────────────────────────────────────────────────────────

const Topbar = () => {
  const { user }       = useAuth();
  const location       = useLocation();
  const meta           = getRouteMeta(location.pathname);
  const initials       = getInitials(user?.name);

  const [searchQuery,    setSearchQuery]    = useState('');
  const [isNotifOpen,    setIsNotifOpen]    = useState(false);
  const [isAccountOpen,  setIsAccountOpen]  = useState(false);
  const [notifications,  setNotifications]  = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const notifRef   = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Click-away handler ────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    if (isNotifOpen || isAccountOpen) {
      document.addEventListener('mousedown', handleClickAway);
    }
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [isNotifOpen, isAccountOpen]);

  // ── ⌘K / Ctrl+K shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('topbar-search')?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return (
    <header className="
      flex items-center justify-between
      h-16 px-5 shrink-0
      bg-white dark:bg-slate-950
      border-b border-slate-100 dark:border-slate-800/60
    ">
      {/* Left: page title */}
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-50 truncate">
          {meta.label}
        </h1>
        {meta.description && (
          <p className="text-[12px] leading-tight mt-0.5 text-slate-400 dark:text-slate-600 hidden sm:block truncate">
            {meta.description}
          </p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0 ml-4">

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 pointer-events-none" />
          <input
            id="topbar-search"
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              pl-9 pr-10 h-9 w-44 rounded-xl
              bg-slate-100 dark:bg-slate-800/60
              hover:bg-sky-50 dark:hover:bg-sky-500/10
              border border-slate-200 dark:border-slate-700
              hover:border-sky-200 dark:hover:border-sky-500/30
              focus:border-sky-400 dark:focus:border-sky-500
              focus:bg-white dark:focus:bg-slate-900
              focus:w-56
              text-[13px] text-slate-700 dark:text-slate-300
              placeholder:text-slate-400 dark:placeholder:text-slate-600
              focus:outline-none focus:ring-2 focus:ring-sky-400/20
              transition-all duration-200
            "
          />
          <kbd className="
            absolute right-2.5 top-1/2 -translate-y-1/2
            px-1.5 py-0.5 rounded-md
            text-[10px] font-mono
            bg-slate-200 dark:bg-slate-700
            text-slate-400 dark:text-slate-500
            border border-slate-300 dark:border-slate-600
            pointer-events-none
          ">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setIsNotifOpen((o) => !o); setIsAccountOpen(false); }}
            aria-label="Notifications"
            aria-expanded={isNotifOpen}
            className="
              relative flex items-center justify-center w-9 h-9 rounded-xl
              bg-slate-100 dark:bg-slate-800/60
              hover:bg-sky-50 dark:hover:bg-sky-500/10
              border border-slate-200 dark:border-slate-700
              hover:border-sky-200 dark:hover:border-sky-500/30
              text-slate-500 dark:text-slate-400
              hover:text-sky-500 dark:hover:text-sky-400
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
            "
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="
                absolute top-1.5 right-1.5 flex items-center justify-center
                w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold
                ring-2 ring-white dark:ring-slate-950
              ">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <NotificationPopover
              notifications={notifications}
              onMarkAllRead={handleMarkAllRead}
              onClose={() => setIsNotifOpen(false)}
            />
          )}
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Account */}
        <div ref={accountRef} className="relative">
          <button
            onClick={() => { setIsAccountOpen((o) => !o); setIsNotifOpen(false); }}
            aria-label="Account menu"
            aria-expanded={isAccountOpen}
            className="
              flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-all duration-150 group
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
            "
          >
            {/* Avatar */}
            <span className="
              flex items-center justify-center
              w-7 h-7 rounded-lg shrink-0
              bg-gradient-to-br from-sky-400 to-indigo-500
              text-white text-[11px] font-bold
              group-hover:scale-105 transition-transform duration-150
            ">
              {initials}
            </span>
            {/* Name — hidden on small screens */}
            <span className="
              text-[13px] font-medium
              text-slate-700 dark:text-slate-300
              group-hover:text-slate-900 dark:group-hover:text-slate-100
              hidden sm:block max-w-[90px] truncate
              transition-colors duration-150
            ">
              {user?.name ?? 'Account'}
            </span>
            <ChevronRight
              size={12}
              className={`
                text-slate-400 dark:text-slate-600 hidden sm:block
                transition-transform duration-150
                ${isAccountOpen ? 'rotate-90' : ''}
              `}
            />
          </button>

          {isAccountOpen && (
            <AccountDropdown onClose={() => setIsAccountOpen(false)} />
          )}
        </div>
      </div>
    </header>
  );
};

// ── App Layout ────────────────────────────────────────────────────────────────

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="h-px w-full mb-6 bg-gradient-to-r from-transparent via-sky-200 dark:via-sky-500/20 to-transparent" />
          <Outlet />
        </main>
      </div>
    </div>
  );
};