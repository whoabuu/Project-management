import { useState } from 'react';
import {
  Circle,
  CheckCircle2,
  Calendar,
  Clock,
  Plus,
  SlidersHorizontal,
  Zap,
  Bug,
  BookOpen,
  Layers,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low';
type TaskType = 'epic' | 'story' | 'task' | 'bug';
type FilterTab = 'all' | 'pending' | 'completed';
type SortKey  = 'due' | 'priority' | 'project';

interface Task {
  id:        string;
  title:     string;
  project:   string;
  epic:      string;
  type:      TaskType;
  priority:  Priority;
  due:       string;          // ISO date string or label
  dueLabel:  string;          // Display label
  overdue:   boolean;
  done:      boolean;
  points:    number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, {
  dot:   string;
  text:  string;
  label: string;
  rank:  number;
}> = {
  critical: { dot: 'bg-red-500',   text: 'text-red-500',   label: 'Critical', rank: 0 },
  high:     { dot: 'bg-amber-500', text: 'text-amber-500', label: 'High',     rank: 1 },
  medium:   { dot: 'bg-sky-500',   text: 'text-sky-500',   label: 'Medium',   rank: 2 },
  low:      { dot: 'bg-slate-400', text: 'text-slate-400', label: 'Low',      rank: 3 },
};

const TYPE_CONFIG: Record<TaskType, { icon: React.ReactNode; color: string }> = {
  epic:  { icon: <Zap size={10} />,      color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' },
  story: { icon: <BookOpen size={10} />, color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10'         },
  task:  { icon: <Layers size={10} />,   color: 'text-slate-500 bg-slate-100 dark:bg-slate-800'     },
  bug:   { icon: <Bug size={10} />,      color: 'text-red-500 bg-red-50 dark:bg-red-500/10'         },
};

const PROJECT_COLORS: Record<string, string> = {
  'Auth Module':   'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
  'AI Module':     'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'Board UI':      'bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
  'Backend Core':  'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Dashboard':     'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'RAG Pipeline':  'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
};

// ── Mock Data ─────────────────────────────────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title:    'Implement Kanban drag-and-drop with dnd-kit library',
    project:  'Board UI',
    epic:     'Sprint Board',
    type:     'story',
    priority: 'critical',
    due:      '2026-05-20',
    dueLabel: 'May 20',
    overdue:  true,
    done:     false,
    points:   13,
  },
  {
    id: '2',
    title:    'Set up Atlas Vector Search index for RAG semantic queries',
    project:  'RAG Pipeline',
    epic:     'AI Infra',
    type:     'task',
    priority: 'critical',
    due:      '2026-05-21',
    dueLabel: 'Today',
    overdue:  false,
    done:     false,
    points:   8,
  },
  {
    id: '3',
    title:    'Integrate Groq LLM structured output with Zod schema binding',
    project:  'AI Module',
    epic:     'Scrum Master Agent',
    type:     'task',
    priority: 'high',
    due:      '2026-05-22',
    dueLabel: 'Tomorrow',
    overdue:  false,
    done:     false,
    points:   8,
  },
  {
    id: '4',
    title:    'Build Epic decomposition review & confirm UI step',
    project:  'AI Module',
    epic:     'Scrum Master Agent',
    type:     'story',
    priority: 'high',
    due:      '2026-05-23',
    dueLabel: 'May 23',
    overdue:  false,
    done:     false,
    points:   5,
  },
  {
    id: '5',
    title:    'Fix sidebar collapse animation jank on Safari 17',
    project:  'Board UI',
    epic:     'UI Shell',
    type:     'bug',
    priority: 'medium',
    due:      '2026-05-25',
    dueLabel: 'May 25',
    overdue:  false,
    done:     false,
    points:   2,
  },
  {
    id: '6',
    title:    'Add pagination to the user search endpoint',
    project:  'Backend Core',
    epic:     'Users API',
    type:     'task',
    priority: 'medium',
    due:      '2026-05-26',
    dueLabel: 'May 26',
    overdue:  false,
    done:     false,
    points:   3,
  },
  {
    id: '7',
    title:    'Design team member invite modal with role selector',
    project:  'Dashboard',
    epic:     'Team UX',
    type:     'story',
    priority: 'low',
    due:      '2026-05-28',
    dueLabel: 'May 28',
    overdue:  false,
    done:     false,
    points:   3,
  },
  {
    id: '8',
    title:    'Write bcrypt hashing and JWT signing auth service',
    project:  'Auth Module',
    epic:     'Authentication',
    type:     'task',
    priority: 'critical',
    due:      '2026-05-18',
    dueLabel: 'May 18',
    overdue:  false,
    done:     true,
    points:   5,
  },
  {
    id: '9',
    title:    'Implement Zod request validation middleware for all routes',
    project:  'Backend Core',
    epic:     'API Foundation',
    type:     'task',
    priority: 'high',
    due:      '2026-05-17',
    dueLabel: 'May 17',
    overdue:  false,
    done:     true,
    points:   3,
  },
  {
    id: '10',
    title:    'Set up Vite + React + Tailwind v4 project scaffold',
    project:  'Dashboard',
    epic:     'Frontend Setup',
    type:     'task',
    priority: 'high',
    due:      '2026-05-15',
    dueLabel: 'May 15',
    overdue:  false,
    done:     true,
    points:   2,
  },
];

// ── Task Row ──────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task:     Task;
  onToggle: (id: string) => void;
}

const TaskRow = ({ task, onToggle }: TaskRowProps) => {
  const priority = PRIORITY_CONFIG[task.priority];
  const type     = TYPE_CONFIG[task.type];
  const projColor = PROJECT_COLORS[task.project] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

  const dueColor = task.overdue && !task.done
    ? 'text-red-500 dark:text-red-400'
    : task.dueLabel === 'Today' && !task.done
    ? 'text-amber-500 dark:text-amber-400'
    : task.dueLabel === 'Tomorrow' && !task.done
    ? 'text-amber-400 dark:text-amber-500'
    : 'text-slate-400 dark:text-slate-600';

  return (
    <li className={`
      group flex items-start gap-4
      px-5 py-4 rounded-xl
      hover:bg-slate-50 dark:hover:bg-slate-800/40
      transition-all duration-150
      border border-transparent
      hover:border-slate-200 dark:hover:border-slate-700/60
      ${task.done ? 'opacity-55' : ''}
    `}>

      {/* ── Checkbox ── */}
      <button
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? 'Mark as pending' : 'Mark as complete'}
        className="mt-0.5 shrink-0 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-full"
      >
        {task.done
          ? <CheckCircle2 size={19} className="text-emerald-500" />
          : (
            <Circle
              size={19}
              className="
                text-slate-300 dark:text-slate-700
                group-hover:text-sky-400 dark:group-hover:text-sky-500
                transition-colors duration-150
              "
            />
          )
        }
      </button>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">

        {/* Title */}
        <p className={`
          text-[14px] font-medium leading-snug
          text-slate-800 dark:text-slate-200
          transition-colors duration-150
          ${task.done ? 'line-through text-slate-400 dark:text-slate-600' : ''}
        `}>
          {task.title}
        </p>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Type badge */}
          <span className={`
            flex items-center gap-1 px-1.5 py-0.5 rounded-md
            text-[10.5px] font-semibold ${type.color}
          `}>
            {type.icon}
            {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
          </span>

          {/* Project badge */}
          <span className={`
            px-2 py-0.5 rounded-md
            text-[10.5px] font-medium
            ${projColor}
          `}>
            {task.project}
          </span>

          {/* Epic */}
          <span className="text-[10.5px] text-slate-400 dark:text-slate-600">
            · {task.epic}
          </span>

          {/* Story points */}
          <span className="
            flex items-center gap-1 ml-auto
            px-1.5 py-0.5 rounded-md
            bg-slate-100 dark:bg-slate-800
            text-[10px] font-semibold
            text-slate-400 dark:text-slate-600
          ">
            <Layers size={9} />
            {task.points}pt
          </span>
        </div>
      </div>

      {/* ── Right meta ── */}
      <div className="flex flex-col items-end gap-2 shrink-0">

        {/* Priority */}
        <span className={`flex items-center gap-1.5 text-[11.5px] font-medium ${priority.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priority.dot}`} />
          <span className="hidden sm:inline">{priority.label}</span>
        </span>

        {/* Due date */}
        <span className={`flex items-center gap-1 text-[11.5px] font-medium ${dueColor}`}>
          {task.overdue && !task.done
            ? <AlertTriangle size={11} />
            : <Calendar size={11} />
          }
          {task.dueLabel}
        </span>
      </div>
    </li>
  );
};

// ── Section Header ────────────────────────────────────────────────────────────

const SectionHeader = ({
  label,
  count,
  dimmed = false,
}: {
  label:   string;
  count:   number;
  dimmed?: boolean;
}) => (
  <div className="flex items-center gap-3 px-1 py-2">
    <p className={`
      text-[11px] font-semibold tracking-widest uppercase
      ${dimmed
        ? 'text-slate-400 dark:text-slate-600'
        : 'text-slate-500 dark:text-slate-500'
      }
    `}>
      {label}
    </p>
    <span className={`
      text-[10px] font-bold px-1.5 py-0.5 rounded-full
      ${dimmed
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
        : 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400'
      }
    `}>
      {count}
    </span>
    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const Tasks = () => {
  const [tasks, setTasks]           = useState<Task[]>(INITIAL_TASKS);
  const [activeTab, setActiveTab]   = useState<FilterTab>('all');
  const [sortKey, setSortKey]       = useState<SortKey>('priority');
  const [showSort, setShowSort]     = useState(false);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'pending',   label: 'Pending'   },
    { key: 'completed', label: 'Completed' },
  ];

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'priority', label: 'Priority' },
    { key: 'due',      label: 'Due Date' },
    { key: 'project',  label: 'Project'  },
  ];

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // Filter
  const filtered = tasks.filter((t) => {
    if (activeTab === 'pending')   return !t.done;
    if (activeTab === 'completed') return t.done;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'priority') {
      return PRIORITY_CONFIG[a.priority].rank - PRIORITY_CONFIG[b.priority].rank;
    }
    if (sortKey === 'due') {
      return new Date(a.due).getTime() - new Date(b.due).getTime();
    }
    if (sortKey === 'project') {
      return a.project.localeCompare(b.project);
    }
    return 0;
  });

  const pending   = sorted.filter((t) => !t.done);
  const completed = sorted.filter((t) => t.done);
  const overdue   = tasks.filter((t) => t.overdue && !t.done).length;

  // Stats
  const totalPending   = tasks.filter((t) => !t.done).length;
  const totalCompleted = tasks.filter((t) => t.done).length;
  const completionPct  = Math.round((totalCompleted / tasks.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold text-slate-900 dark:text-slate-50">
            My Tasks
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-400 dark:text-slate-600">
            {totalPending} pending · {totalCompleted} completed
            {overdue > 0 && (
              <span className="ml-2 text-red-500 dark:text-red-400 font-medium">
                · {overdue} overdue
              </span>
            )}
          </p>
        </div>

        <button className="
          flex items-center gap-1.5
          h-9 px-4 rounded-xl
          bg-sky-500 hover:bg-sky-600
          text-white text-[13px] font-medium
          shadow-sm shadow-sky-500/30
          hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
        ">
          <Plus size={15} />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      {/* ── Progress bar ─────────────────────────────────── */}
      <div className="
        p-4 rounded-2xl
        bg-white dark:bg-slate-900
        border border-slate-100 dark:border-slate-800
      ">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
            Sprint Progress
          </span>
          <span className="text-[12.5px] font-bold text-sky-500 dark:text-sky-400 tabular-nums">
            {completionPct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-700"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-slate-400 dark:text-slate-600">
            {totalCompleted} of {tasks.length} tasks done
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
            <Clock size={10} />
            Sprint 4 · 6 days left
          </span>
        </div>
      </div>

      {/* ── Filter tabs + Sort ────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">

        {/* Tabs */}
        <div className="
          flex items-center gap-1
          p-1 rounded-xl
          bg-slate-100 dark:bg-slate-800/60
          border border-slate-200 dark:border-slate-700
        ">
          {TABS.map((tab) => {
            const count =
              tab.key === 'all'       ? tasks.length :
              tab.key === 'pending'   ? totalPending  :
              totalCompleted;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-1.5
                  px-3 py-1.5 rounded-lg
                  text-[12.5px] font-medium
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                  ${activeTab === tab.key
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }
                `}
              >
                {tab.label}
                <span className={`
                  text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums
                  ${activeTab === tab.key
                    ? 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-500'
                  }
                `}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSort((s) => !s)}
            className="
              flex items-center gap-1.5
              h-9 px-3 rounded-xl
              bg-white dark:bg-slate-900
              border border-slate-200 dark:border-slate-700
              text-[12.5px] font-medium
              text-slate-500 dark:text-slate-400
              hover:border-slate-300 dark:hover:border-slate-600
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
            "
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Sort: {SORT_OPTIONS.find(s => s.key === sortKey)?.label}</span>
            <ChevronDown size={12} className={`transition-transform duration-150 ${showSort ? 'rotate-180' : ''}`} />
          </button>

          {showSort && (
            <div className="
              absolute right-0 top-full mt-1.5 z-20
              w-40 py-1 rounded-xl
              bg-white dark:bg-slate-900
              border border-slate-200 dark:border-slate-700
              shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60
            ">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setSortKey(opt.key); setShowSort(false); }}
                  className={`
                    w-full flex items-center justify-between
                    px-3 py-2 text-[12.5px] font-medium
                    transition-colors duration-100
                    ${sortKey === opt.key
                      ? 'text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  {opt.label}
                  {sortKey === opt.key && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Task list ─────────────────────────────────────── */}
      <div className="
        rounded-2xl overflow-hidden
        bg-white dark:bg-slate-900
        border border-slate-100 dark:border-slate-800
      ">

        {/* Pending section */}
        {(activeTab === 'all' || activeTab === 'pending') && (
          <div className="px-4 pt-4">
            {activeTab === 'all' && (
              <SectionHeader label="Pending" count={pending.length} />
            )}
            {pending.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-300 dark:text-slate-700">
                <CheckCircle2 size={28} />
                <p className="text-[13px] font-medium">All caught up!</p>
              </div>
            ) : (
              <ul className="space-y-0.5 pb-2">
                {pending.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={toggleTask} />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Divider between sections */}
        {activeTab === 'all' && pending.length > 0 && completed.length > 0 && (
          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4" />
        )}

        {/* Completed section */}
        {(activeTab === 'all' || activeTab === 'completed') && completed.length > 0 && (
          <div className="px-4 pb-4">
            {activeTab === 'all' && (
              <SectionHeader label="Completed" count={completed.length} dimmed />
            )}
            <ul className="space-y-0.5">
              {completed.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </ul>
          </div>
        )}

        {/* Empty state for completed tab */}
        {activeTab === 'completed' && completed.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 px-4 text-slate-300 dark:text-slate-700">
            <Clock size={28} />
            <p className="text-[13px] font-medium text-center">
              No completed tasks yet — keep going!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;