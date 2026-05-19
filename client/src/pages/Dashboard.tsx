import {
  FolderKanban,
  CheckSquare,
  Users,
  AlertCircle,
  Bot,
  Sparkles,
  ArrowRight,
  Clock,
  Circle,
  CheckCircle2,
  TrendingUp,
  Calendar,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatCard {
  label:    string;
  value:    string;
  delta?:   string;
  positive?: boolean;
  icon:     React.ReactNode;
  accent:   string;
}

interface MockTask {
  id:       string;
  title:    string;
  due:      string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  done:     boolean;
  project:  string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const STATS: StatCard[] = [
  {
    label:    'Active Projects',
    value:    '6',
    delta:    '+2 this month',
    positive: true,
    icon:     <FolderKanban size={18} />,
    accent:   'text-sky-500 bg-sky-50 dark:bg-sky-500/10',
  },
  {
    label:    'Tasks Due This Week',
    value:    '14',
    delta:    '3 overdue',
    positive: false,
    icon:     <AlertCircle size={18} />,
    accent:   'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
  },
  {
    label:    'Completed This Sprint',
    value:    '31',
    delta:    '+18% velocity',
    positive: true,
    icon:     <CheckSquare size={18} />,
    accent:   'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    label:    'Team Members',
    value:    '9',
    delta:    '7 available',
    positive: true,
    icon:     <Users size={18} />,
    accent:   'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
  },
];

const TASKS: MockTask[] = [
  {
    id:       '1',
    title:    'Implement JWT refresh token rotation',
    due:      'Today',
    priority: 'critical',
    done:     false,
    project:  'Auth Module',
  },
  {
    id:       '2',
    title:    'Set up Atlas Vector Search index',
    due:      'Tomorrow',
    priority: 'high',
    done:     false,
    project:  'RAG Pipeline',
  },
  {
    id:       '3',
    title:    'Write Zod schemas for task endpoints',
    due:      'Jun 3',
    priority: 'medium',
    done:     true,
    project:  'Tasks API',
  },
  {
    id:       '4',
    title:    'Design Kanban drag-and-drop interactions',
    due:      'Jun 4',
    priority: 'high',
    done:     false,
    project:  'Board UI',
  },
  {
    id:       '5',
    title:    'Integrate Groq LLM with structured output',
    due:      'Jun 5',
    priority: 'critical',
    done:     false,
    project:  'AI Module',
  },
  {
    id:       '6',
    title:    'Write standup agent unit tests',
    due:      'Jun 6',
    priority: 'low',
    done:     true,
    project:  'AI Module',
  },
];

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', dot: 'bg-red-500',    text: 'text-red-500'    },
  high:     { label: 'High',     dot: 'bg-amber-500',  text: 'text-amber-500'  },
  medium:   { label: 'Medium',   dot: 'bg-sky-500',    text: 'text-sky-500'    },
  low:      { label: 'Low',      dot: 'bg-slate-400',  text: 'text-slate-400'  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCardItem = ({ card }: { card: StatCard }) => (
  <div className="
    group relative flex flex-col gap-3
    p-5 rounded-2xl
    bg-white dark:bg-slate-900
    border border-slate-100 dark:border-slate-800
    hover:border-slate-200 dark:hover:border-slate-700
    hover:shadow-sm
    transition-all duration-200
  ">
    {/* Icon */}
    <div className={`
      flex items-center justify-center
      w-9 h-9 rounded-xl shrink-0
      ${card.accent}
    `}>
      {card.icon}
    </div>

    {/* Value */}
    <div>
      <p className="
        text-[28px] font-semibold leading-none
        text-slate-900 dark:text-slate-50
        tabular-nums
      ">
        {card.value}
      </p>
      <p className="
        mt-1 text-[13px] font-medium
        text-slate-500 dark:text-slate-400
      ">
        {card.label}
      </p>
    </div>

    {/* Delta */}
    {card.delta && (
      <p className={`
        flex items-center gap-1
        text-[12px] font-medium
        ${card.positive
          ? 'text-emerald-600 dark:text-emerald-500'
          : 'text-red-500 dark:text-red-400'
        }
      `}>
        <TrendingUp size={12} className={card.positive ? '' : 'rotate-180'} />
        {card.delta}
      </p>
    )}
  </div>
);

const TaskRow = ({ task }: { task: MockTask }) => {
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <li className={`
      group flex items-start gap-3
      px-4 py-3 rounded-xl
      hover:bg-slate-50 dark:hover:bg-slate-800/50
      transition-all duration-150
      ${task.done ? 'opacity-50' : ''}
    `}>
      {/* Checkbox */}
      <button
        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
        className="mt-0.5 shrink-0 transition-transform duration-150 hover:scale-110"
      >
        {task.done
          ? <CheckCircle2 size={17} className="text-emerald-500" />
          : <Circle size={17} className="text-slate-300 dark:text-slate-600 group-hover:text-sky-400 transition-colors" />
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`
          text-[13.5px] font-medium leading-snug
          text-slate-800 dark:text-slate-200
          ${task.done ? 'line-through text-slate-400 dark:text-slate-600' : ''}
        `}>
          {task.title}
        </p>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Project tag */}
          <span className="
            text-[11px] font-medium px-1.5 py-0.5 rounded-md
            bg-slate-100 dark:bg-slate-800
            text-slate-500 dark:text-slate-400
          ">
            {task.project}
          </span>

          {/* Priority dot */}
          <span className={`flex items-center gap-1 text-[11px] font-medium ${priority.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>
        </div>
      </div>

      {/* Due date */}
      <div className={`
        flex items-center gap-1 shrink-0
        text-[11.5px] font-medium
        ${task.due === 'Today'
          ? 'text-red-500 dark:text-red-400'
          : task.due === 'Tomorrow'
          ? 'text-amber-500 dark:text-amber-400'
          : 'text-slate-400 dark:text-slate-500'
        }
      `}>
        <Clock size={11} />
        {task.due}
      </div>
    </li>
  );
};

// ── AI Scrum Master Card ──────────────────────────────────────────────────────

const AIScrumCard = () => (
  <div className="
    relative flex flex-col
    rounded-2xl overflow-hidden
    bg-white dark:bg-slate-900
    border border-slate-100 dark:border-slate-800
  ">
    {/* Header gradient bar */}
    <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-400" />

    <div className="p-5">
      {/* Title row */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="
          flex items-center justify-center
          w-8 h-8 rounded-xl
          bg-sky-500
        ">
          <Bot size={15} className="text-white" />
        </div>
        <div>
          <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
            AI Scrum Master
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
            <Sparkles size={10} className="text-sky-400" />
            Sprint 4 · Daily Standup
          </p>
        </div>

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-500 dark:text-emerald-400">
            Live
          </span>
        </div>
      </div>

      {/* Summary sections */}
      <div className="space-y-3">
        <SummaryBlock
          emoji="✅"
          label="Completed"
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
          items={[
            'Abu Bakar merged the auth middleware and JWT refresh flow.',
            'Zod validation schemas deployed for all task endpoints.',
            'Standup agent integrated with Groq LLM successfully.',
          ]}
        />

        <SummaryBlock
          emoji="🔄"
          label="In Progress"
          color="text-sky-600 dark:text-sky-400"
          bg="bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20"
          items={[
            'Kanban board drag-and-drop implementation underway.',
            'Atlas Vector Search index configuration in review.',
          ]}
        />

        <SummaryBlock
          emoji="🚧"
          label="Blockers"
          color="text-red-500 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20"
          items={[
            'Groq model quota limits hitting during load tests. Consider request batching.',
          ]}
        />
      </div>

      {/* Footer */}
      <div className="
        mt-4 pt-4
        border-t border-slate-100 dark:border-slate-800
        flex items-center justify-between
      ">
        <p className="text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
          <Calendar size={10} />
          Generated today at 09:00 AM
        </p>
        <button className="
          flex items-center gap-1
          text-[12px] font-medium
          text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300
          transition-colors duration-150
        ">
          Full report
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  </div>
);

interface SummaryBlockProps {
  emoji: string;
  label: string;
  color: string;
  bg:    string;
  items: string[];
}

const SummaryBlock = ({ emoji, label, color, bg, items }: SummaryBlockProps) => (
  <div className={`rounded-xl p-3 border ${bg}`}>
    <p className={`text-[11.5px] font-semibold uppercase tracking-wide mb-2 ${color}`}>
      {emoji} {label}
    </p>
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="text-[12.5px] leading-snug text-slate-600 dark:text-slate-400 flex gap-2"
        >
          <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0 opacity-50" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

// ── Sprint Progress Bar ───────────────────────────────────────────────────────

const SprintProgress = () => {
  const done  = 31;
  const total = 48;
  const pct   = Math.round((done / total) * 100);

  return (
    <div className="
      p-5 rounded-2xl
      bg-white dark:bg-slate-900
      border border-slate-100 dark:border-slate-800
    ">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
          Sprint 4 Progress
        </h3>
        <span className="
          text-[12px] font-semibold tabular-nums
          text-sky-600 dark:text-sky-400
        ">
          {pct}%
        </span>
      </div>

      {/* Track */}
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-[11.5px] text-slate-400 dark:text-slate-600">
          {done} of {total} points done
        </span>
        <span className="text-[11.5px] text-slate-400 dark:text-slate-600">
          6 days remaining
        </span>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const pending = TASKS.filter((t) => !t.done);
  const done    = TASKS.filter((t) => t.done);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Welcome ────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-slate-900 dark:text-slate-50">
            Good morning 👋
          </h2>
          <p className="mt-0.5 text-[14px] text-slate-500 dark:text-slate-500">
            Here's what's happening in your workspace today.
          </p>
        </div>
        <button className="
          hidden sm:flex items-center gap-2
          px-4 py-2 rounded-xl
          bg-sky-500 hover:bg-sky-600
          text-white text-[13px] font-medium
          shadow-sm shadow-sky-500/30
          transition-all duration-150
          hover:scale-[1.02] active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
        ">
          <Bot size={14} />
          Generate Standup
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((card) => (
          <StatCardItem key={card.label} card={card} />
        ))}
      </div>

      {/* ── Sprint progress (full width) ───────────────────── */}
      <SprintProgress />

      {/* ── Main grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: My Tasks */}
        <div className="
          flex flex-col
          rounded-2xl overflow-hidden
          bg-white dark:bg-slate-900
          border border-slate-100 dark:border-slate-800
        ">
          {/* Card header */}
          <div className="
            flex items-center justify-between
            px-5 py-4
            border-b border-slate-100 dark:border-slate-800
          ">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-sky-500" />
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                My Tasks
              </h3>
              <span className="
                text-[11px] font-semibold tabular-nums
                px-1.5 py-0.5 rounded-full
                bg-sky-100 dark:bg-sky-500/15
                text-sky-600 dark:text-sky-400
              ">
                {pending.length}
              </span>
            </div>
            <button className="
              flex items-center gap-1
              text-[12px] font-medium
              text-slate-400 hover:text-sky-500 dark:hover:text-sky-400
              transition-colors duration-150
            ">
              View all <ArrowRight size={12} />
            </button>
          </div>

          {/* Task list */}
          <ul className="flex-1 py-2 px-1 space-y-0.5">
            {pending.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>

          {/* Completed section */}
          {done.length > 0 && (
            <>
              <div className="
                px-5 py-2
                border-t border-slate-100 dark:border-slate-800
              ">
                <p className="
                  text-[11px] font-semibold tracking-wide uppercase
                  text-slate-400 dark:text-slate-600
                ">
                  Completed
                </p>
              </div>
              <ul className="pb-2 px-1 space-y-0.5">
                {done.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Right: AI Scrum Master */}
        <AIScrumCard />
      </div>
    </div>
  );
};

export default Dashboard;