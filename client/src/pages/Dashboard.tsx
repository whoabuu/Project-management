import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
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
  RefreshCw,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { apiGet } from '../lib/api';

// ── Active project ────────────────────────────────────────────────────────────

const ACTIVE_PROJECT_ID =
  (import.meta.env['VITE_DEMO_PROJECT_ID'] as string) || '';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatCard {
  label:     string;
  value:     string;
  delta?:    string;
  positive?: boolean;
  icon:      React.ReactNode;
  accent:    string;
}

interface MockTask {
  id:       string;
  title:    string;
  due:      string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  done:     boolean;
  project:  string;
}

interface StandupResponse {
  markdown:    string;
  generatedAt: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const STATS: StatCard[] = [
  { label: 'Active Projects',      value: '6',  delta: '+2 this month', positive: true,  icon: <FolderKanban size={18} />, accent: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10'         },
  { label: 'Tasks Due This Week',  value: '14', delta: '3 overdue',     positive: false, icon: <AlertCircle size={18} />,  accent: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'   },
  { label: 'Completed This Sprint',value: '31', delta: '+18% velocity', positive: true,  icon: <CheckSquare size={18} />,  accent: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'Team Members',         value: '9',  delta: '7 available',   positive: true,  icon: <Users size={18} />,        accent: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' },
];

const TASKS: MockTask[] = [
  { id: '1', title: 'Implement JWT refresh token rotation',      due: 'Today',    priority: 'critical', done: false, project: 'Auth Module'   },
  { id: '2', title: 'Set up Atlas Vector Search index',          due: 'Tomorrow', priority: 'high',     done: false, project: 'RAG Pipeline'  },
  { id: '3', title: 'Write Zod schemas for task endpoints',      due: 'Jun 3',    priority: 'medium',   done: true,  project: 'Tasks API'     },
  { id: '4', title: 'Design Kanban drag-and-drop interactions',  due: 'Jun 4',    priority: 'high',     done: false, project: 'Board UI'      },
  { id: '5', title: 'Integrate Groq LLM with structured output', due: 'Jun 5',    priority: 'critical', done: false, project: 'AI Module'     },
  { id: '6', title: 'Write standup agent unit tests',            due: 'Jun 6',    priority: 'low',      done: true,  project: 'AI Module'     },
];

const PRIORITY_CONFIG = {
  critical: { dot: 'bg-red-500',   text: 'text-red-500'   },
  high:     { dot: 'bg-amber-500', text: 'text-amber-500' },
  medium:   { dot: 'bg-sky-500',   text: 'text-sky-500'   },
  low:      { dot: 'bg-slate-400', text: 'text-slate-400' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCardItem = ({ card }: { card: StatCard }) => (
  <div className="
    group flex flex-col gap-3 p-5 rounded-2xl
    bg-white dark:bg-slate-900
    border border-slate-100 dark:border-slate-800
    hover:border-slate-200 dark:hover:border-slate-700
    hover:shadow-sm transition-all duration-200
  ">
    <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${card.accent}`}>
      {card.icon}
    </div>
    <div>
      <p className="text-[28px] font-semibold leading-none text-slate-900 dark:text-slate-50 tabular-nums">
        {card.value}
      </p>
      <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
        {card.label}
      </p>
    </div>
    {card.delta && (
      <p className={`flex items-center gap-1 text-[12px] font-medium ${card.positive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`}>
        <TrendingUp size={12} className={card.positive ? '' : 'rotate-180'} />
        {card.delta}
      </p>
    )}
  </div>
);

const TaskRow = ({ task }: { task: MockTask }) => {
  const priority = PRIORITY_CONFIG[task.priority];
  return (
    <li className={`group flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-150 ${task.done ? 'opacity-50' : ''}`}>
      <button className="mt-0.5 shrink-0 transition-transform duration-150 hover:scale-110">
        {task.done
          ? <CheckCircle2 size={17} className="text-emerald-500" />
          : <Circle size={17} className="text-slate-300 dark:text-slate-600 group-hover:text-sky-400 transition-colors" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[13.5px] font-medium leading-snug text-slate-800 dark:text-slate-200 ${task.done ? 'line-through text-slate-400 dark:text-slate-600' : ''}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {task.project}
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-medium ${priority.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
            {task.priority}
          </span>
        </div>
      </div>
      <div className={`flex items-center gap-1 shrink-0 text-[11.5px] font-medium ${task.due === 'Today' ? 'text-red-500 dark:text-red-400' : task.due === 'Tomorrow' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
        <Clock size={11} />{task.due}
      </div>
    </li>
  );
};

const SprintProgress = () => {
  const done = 31; const total = 48;
  const pct  = Math.round((done / total) * 100);
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">Sprint 4 Progress</h3>
        <span className="text-[12px] font-semibold tabular-nums text-sky-600 dark:text-sky-400">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[11.5px] text-slate-400 dark:text-slate-600">{done} of {total} points done</span>
        <span className="text-[11.5px] text-slate-400 dark:text-slate-600">6 days remaining</span>
      </div>
    </div>
  );
};

// ── Standup Loading Skeleton ──────────────────────────────────────────────────

const StandupSkeleton = () => (
  <div className="space-y-4 py-2">
    {/* Animated status message */}
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
          />
        ))}
      </div>
      <p className="text-[12.5px] italic text-slate-500 dark:text-slate-400 animate-pulse">
        AI Scrum Master is analysing the board…
      </p>
    </div>

    {/* Skeleton lines */}
    <div className="space-y-3">
      {/* Section header skeleton */}
      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md w-40" />
      <div className="space-y-2 pl-3">
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-full" style={{ animationDelay: '100ms' }} />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-5/6" style={{ animationDelay: '200ms' }} />
      </div>

      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md w-36" style={{ animationDelay: '150ms' }} />
      <div className="space-y-2 pl-3">
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-full" style={{ animationDelay: '250ms' }} />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-4/6" style={{ animationDelay: '350ms' }} />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-5/6" style={{ animationDelay: '400ms' }} />
      </div>

      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md w-32" style={{ animationDelay: '200ms' }} />
      <div className="space-y-2 pl-3">
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-3/4" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// ── Markdown Renderer ─────────────────────────────────────────────────────────

const StandupMarkdown = ({ markdown }: { markdown: string }) => (
  <ReactMarkdown
    components={{
      // H2 → section headers (✅ COMPLETED etc.)
      h2: ({ children }) => (
        <h2 className="
          flex items-center gap-2
          text-[13px] font-bold uppercase tracking-wide
          text-slate-800 dark:text-slate-200
          mt-4 mb-2 first:mt-0
        ">
          {children}
        </h2>
      ),
      // Unordered lists
      ul: ({ children }) => (
        <ul className="space-y-1.5 mb-3">{children}</ul>
      ),
      li: ({ children }) => (
        <li className="flex items-start gap-2 text-[12.5px] leading-snug text-slate-600 dark:text-slate-400">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
          <span>{children}</span>
        </li>
      ),
      // Bold text in bullets
      strong: ({ children }) => (
        <strong className="font-semibold text-slate-800 dark:text-slate-200">{children}</strong>
      ),
      // Paragraph fallback
      p: ({ children }) => (
        <p className="text-[12.5px] text-slate-500 dark:text-slate-500 leading-relaxed">{children}</p>
      ),
    }}
  >
    {markdown}
  </ReactMarkdown>
);

// ── AI Scrum Master Card ──────────────────────────────────────────────────────

interface AIScrumCardProps {
  standupMarkdown: string | null;
  isGenerating:    boolean;
  generatedAt:     Date | null;
  error:           string | null;
  onGenerate:      () => void;
}

const AIScrumCard = ({
  standupMarkdown,
  isGenerating,
  generatedAt,
  error,
  onGenerate,
}: AIScrumCardProps) => (
  <div className="relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
    {/* Top accent */}
    <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-400" />

    <div className="p-5 flex flex-col gap-4 flex-1">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500 shadow-sm shadow-sky-500/30">
            <Bot size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
              AI Scrum Master
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
              <Sparkles size={9} className="text-sky-400" />
              Sprint 4 · Daily Standup
            </p>
          </div>
        </div>

        {/* Status + generate button */}
        <div className="flex items-center gap-2">
          {generatedAt && !isGenerating && (
            <span className="text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
              <Clock size={9} />
              {generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button
            onClick={onGenerate}
            disabled={isGenerating || !ACTIVE_PROJECT_ID}
            title={!ACTIVE_PROJECT_ID ? 'Set VITE_DEMO_PROJECT_ID in .env to enable' : 'Generate standup'}
            aria-label="Generate standup"
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              text-[12px] font-medium
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              disabled:cursor-not-allowed
              ${isGenerating
                ? 'bg-sky-100 dark:bg-sky-500/10 text-sky-500 dark:text-sky-400'
                : standupMarkdown
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-500 dark:hover:text-sky-400'
                : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:bg-sky-300 dark:disabled:bg-sky-900'
              }
            `}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Generating…
              </>
            ) : standupMarkdown ? (
              <>
                <RotateCcw size={12} />
                Regenerate
              </>
            ) : (
              <>
                <Zap size={12} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live indicator */}
      {!isGenerating && standupMarkdown && (
        <div className="flex items-center gap-1.5 -mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-500 dark:text-emerald-400">Live</span>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-[180px]">
        {/* Error state */}
        {error && !isGenerating && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
            <AlertCircle size={14} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={onGenerate}
                className="text-[12px] text-red-500 hover:text-red-600 dark:text-red-400 mt-1 underline underline-offset-2 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isGenerating && <StandupSkeleton />}

        {/* Empty / prompt state */}
        {!isGenerating && !standupMarkdown && !error && (
          <div className="flex flex-col items-center justify-center gap-3 h-full py-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/10">
              <Bot size={22} className="text-sky-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Ready to generate your standup
              </p>
              <p className="text-[12px] text-slate-400 dark:text-slate-600">
                Click "Generate" to analyse the board and create a report.
              </p>
            </div>
            {!ACTIVE_PROJECT_ID && (
              <p className="text-[11.5px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 flex items-center gap-1.5">
                <AlertCircle size={11} />
                Set VITE_DEMO_PROJECT_ID in .env to enable
              </p>
            )}
          </div>
        )}

        {/* Rendered markdown */}
        {!isGenerating && standupMarkdown && !error && (
          <div className="overflow-y-auto max-h-72 pr-1">
            <StandupMarkdown markdown={standupMarkdown} />
          </div>
        )}
      </div>

      {/* Footer */}
      {standupMarkdown && !isGenerating && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
            <Calendar size={10} />
            {generatedAt
              ? generatedAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
              : 'Today'
            }
          </p>
          <button className="flex items-center gap-1 text-[12px] font-medium text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 transition-colors">
            Full report <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [standupMarkdown, setStandupMarkdown] = useState<string | null>(null);
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [standupError,    setStandupError]    = useState<string | null>(null);
  const [generatedAt,     setGeneratedAt]     = useState<Date | null>(null);

  const pending  = TASKS.filter((t) => !t.done);
  const done     = TASKS.filter((t) => t.done);

  // ── Generate standup ────────────────────────────────────────────────────────
  const generateStandup = useCallback(async () => {
    if (!ACTIVE_PROJECT_ID) {
      setStandupError('No project ID configured. Set VITE_DEMO_PROJECT_ID in your .env file.');
      return;
    }

    setIsGenerating(true);
    setStandupError(null);

    try {
      const result = await apiGet<StandupResponse>(
        `/projects/${ACTIVE_PROJECT_ID}/standup`
      );

      setStandupMarkdown(result.data.markdown);
      setGeneratedAt(new Date(result.data.generatedAt));
    } catch (err) {
      console.error('[Dashboard] generateStandup failed:', err);
      setStandupError(
        'The AI Scrum Master couldn\'t generate a report right now. ' +
        'Check your connection and try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Welcome ──────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-slate-900 dark:text-slate-50">
            Good morning 👋
          </h2>
          <p className="mt-0.5 text-[14px] text-slate-500 dark:text-slate-500">
            Here's what's happening in your workspace today.
          </p>
        </div>
        <button
          onClick={() => void generateStandup()}
          disabled={isGenerating || !ACTIVE_PROJECT_ID}
          className="
            hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl
            bg-sky-500 hover:bg-sky-600
            disabled:bg-sky-400 disabled:cursor-not-allowed
            text-white text-[13px] font-medium
            shadow-sm shadow-sky-500/30
            hover:scale-[1.02] active:scale-[0.98] disabled:scale-100
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
          "
        >
          {isGenerating
            ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
            : <><Bot size={14} /> Generate Standup</>
          }
        </button>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((card) => <StatCardItem key={card.label} card={card} />)}
      </div>

      {/* ── Sprint progress ───────────────────────────────────── */}
      <SprintProgress />

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: My Tasks */}
        <div className="flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-sky-500" />
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">My Tasks</h3>
              <span className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
                {pending.length}
              </span>
            </div>
            <button className="flex items-center gap-1 text-[12px] font-medium text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>

          <ul className="flex-1 py-2 px-1 space-y-0.5">
            {pending.map((task) => <TaskRow key={task.id} task={task} />)}
          </ul>

          {done.length > 0 && (
            <>
              <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-600">
                  Completed
                </p>
              </div>
              <ul className="pb-2 px-1 space-y-0.5">
                {done.map((task) => <TaskRow key={task.id} task={task} />)}
              </ul>
            </>
          )}
        </div>

        {/* Right: AI Scrum Master */}
        <AIScrumCard
          standupMarkdown={standupMarkdown}
          isGenerating={isGenerating}
          generatedAt={generatedAt}
          error={standupError}
          onGenerate={() => void generateStandup()}
        />
      </div>
    </div>
  );
};

export default Dashboard;