import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface NavItem {
  label:   string;
  to:      string;
  icon:    React.ReactNode;
  badge?:  string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      to: '/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Projects',       to: '/projects',  icon: <FolderKanban size={17} />    },
  { label: 'My Tasks',       to: '/tasks',     icon: <CheckSquare size={17} />     },
  { label: 'Team',           to: '/team',      icon: <Users size={17} />           },
  { label: 'AI Scrum Master',to: '/ai',        icon: <Bot size={17} />, badge: 'AI'},
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location    = useLocation();

  return (
    <aside
      className={`
        relative flex flex-col h-screen shrink-0
        bg-white dark:bg-slate-950
        border-r border-slate-100 dark:border-slate-800/60
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[230px]'}
      `}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center h-16 px-4 border-b border-slate-100 dark:border-slate-800/60 overflow-hidden">
        <a href="/dashboard" className="flex items-center gap-3 min-w-0">
          {/* Icon mark — always visible */}
          <img
            src="/nexus-icon-32.svg"
            alt="Nexus"
            width={32}
            height={32}
            className="shrink-0"
          />
          {/* Full lockup — hides when collapsed */}
          <span className={`
            flex flex-col leading-none min-w-0
            transition-all duration-200 overflow-hidden
            ${collapsed ? 'w-0 opacity-0' : 'opacity-100'}
          `}>
            <span className="
              text-[17px] font-semibold tracking-wide
              text-slate-900 dark:text-slate-50
              whitespace-nowrap
            ">
              nexus
            </span>
            <span className="
              text-[8px] font-medium tracking-[0.18em] uppercase
              text-slate-400 dark:text-slate-600
              whitespace-nowrap mt-0.5
            ">
              agile workspace
            </span>
          </span>
        </a>
      </div>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">

        {!collapsed && (
          <p className="
            px-3 mb-1.5
            text-[10px] font-semibold tracking-[0.14em] uppercase
            text-slate-400 dark:text-slate-600
          ">
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
                    group relative flex items-center gap-3
                    px-3 py-2.5 rounded-xl
                    text-[13.5px] font-medium
                    transition-all duration-150 ease-out
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-sky-400
                    ${isActive
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                      : `
                        text-slate-500 dark:text-slate-400
                        hover:bg-slate-50 dark:hover:bg-slate-800/60
                        hover:text-slate-900 dark:hover:text-slate-100
                      `
                    }
                  `}
                >
                  {/* Icon */}
                  <span className={`
                    shrink-0
                    ${isActive
                      ? 'text-white'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400'
                    }
                    transition-colors duration-150
                  `}>
                    {item.icon}
                  </span>

                  {/* Label */}
                  <span className={`
                    flex-1 whitespace-nowrap overflow-hidden
                    transition-all duration-200
                    ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}
                  `}>
                    {item.label}
                  </span>

                  {/* Badge */}
                  {item.badge && !collapsed && (
                    <span className={`
                      px-1.5 py-0.5 rounded-md
                      text-[10px] font-bold tracking-wide
                      ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}

                  {/* Collapsed tooltip */}
                  {collapsed && (
                    <span className="
                      pointer-events-none absolute left-full ml-3
                      px-2.5 py-1.5 z-50
                      text-[12px] font-medium whitespace-nowrap
                      bg-slate-900 dark:bg-slate-700 text-white
                      rounded-lg shadow-xl
                      opacity-0 group-hover:opacity-100
                      translate-x-2 group-hover:translate-x-0
                      transition-all duration-150
                    ">
                      {item.label}
                      {item.badge && (
                        <span className="ml-1.5 text-sky-400">{item.badge}</span>
                      )}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Collapse toggle ───────────────────────────────── */}
      <div className="px-2 py-3 border-t border-slate-100 dark:border-slate-800/60">
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="
            flex items-center justify-center gap-2.5
            w-full px-3 py-2.5 rounded-xl
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
            : (
              <>
                <PanelLeftClose size={16} />
                <span className={`
                  whitespace-nowrap transition-all duration-200
                  ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}
                `}>
                  Collapse
                </span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  );
};