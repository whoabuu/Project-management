import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  AlertCircle,
  ChevronDown,
  Circle,
  Zap,
  Bug,
  BookOpen,
  Layers,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low';
type TaskType = 'epic' | 'story' | 'task' | 'bug';
type ColumnId = 'todo' | 'in_progress' | 'review' | 'done';

interface Assignee {
  initials: string;
  color:    string;
}

interface Task {
  id:        string;
  title:     string;
  epic:      string;
  epicColor: string;
  priority:  Priority;
  type:      TaskType;
  assignee:  Assignee;
  due:       string;
  points:    number;
  column:    ColumnId;
}

interface Column {
  id:      ColumnId;
  label:   string;
  accent:  string;
  dot:     string;
  headerBg: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const COLUMNS: Column[] = [
  {
    id:       'todo',
    label:    'To Do',
    accent:   'border-slate-300 dark:border-slate-600',
    dot:      'bg-slate-400',
    headerBg: 'bg-slate-100 dark:bg-slate-800/60',
  },
  {
    id:       'in_progress',
    label:    'In Progress',
    accent:   'border-sky-400 dark:border-sky-500',
    dot:      'bg-sky-500',
    headerBg: 'bg-sky-50 dark:bg-sky-500/10',
  },
  {
    id:       'review',
    label:    'In Review',
    accent:   'border-violet-400 dark:border-violet-500',
    dot:      'bg-violet-500',
    headerBg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    id:       'done',
    label:    'Done',
    accent:   'border-emerald-400 dark:border-emerald-500',
    dot:      'bg-emerald-500',
    headerBg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
];

const PRIORITY_CONFIG: Record<Priority, { dot: string; label: string; text: string }> = {
  critical: { dot: 'bg-red-500',    label: 'Critical', text: 'text-red-500'    },
  high:     { dot: 'bg-amber-500',  label: 'High',     text: 'text-amber-500'  },
  medium:   { dot: 'bg-sky-500',    label: 'Medium',   text: 'text-sky-500'    },
  low:      { dot: 'bg-slate-400',  label: 'Low',      text: 'text-slate-400'  },
};

const TYPE_CONFIG: Record<TaskType, { icon: React.ReactNode; color: string }> = {
  epic:  { icon: <Zap size={11} />,      color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10'  },
  story: { icon: <BookOpen size={11} />, color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10'          },
  task:  { icon: <Circle size={11} />,   color: 'text-slate-500 bg-slate-100 dark:bg-slate-700'       },
  bug:   { icon: <Bug size={11} />,      color: 'text-red-500 bg-red-50 dark:bg-red-500/10'           },
};

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_TASKS: Task[] = [
  // ── To Do ─────────────────────────────────────────────
  {
    id: 't1', column: 'todo',
    title: 'Set up Atlas Vector Search index for RAG pipeline',
    epic: 'AI Module', epicColor: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
    priority: 'critical', type: 'task',
    assignee: { initials: 'AB', color: 'bg-sky-500' },
    due: 'Jun 3', points: 5,
  },
  {
    id: 't2', column: 'todo',
    title: 'Design capacity agent scoring algorithm',
    epic: 'AI Module', epicColor: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
    priority: 'high', type: 'story',
    assignee: { initials: 'SR', color: 'bg-emerald-500' },
    due: 'Jun 4', points: 8,
  },
  {
    id: 't3', column: 'todo',
    title: 'Build project member invite flow UI',
    epic: 'Team UX', epicColor: 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
    priority: 'medium', type: 'story',
    assignee: { initials: 'MK', color: 'bg-amber-500' },
    due: 'Jun 6', points: 3,
  },
  {
    id: 't4', column: 'todo',
    title: 'Implement token refresh silent renewal',
    epic: 'Auth', epicColor: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
    priority: 'high', type: 'task',
    assignee: { initials: 'AB', color: 'bg-sky-500' },
    due: 'Jun 5', points: 5,
  },
  {
    id: 't5', column: 'todo',
    title: 'Fix sidebar collapse animation on Safari',
    epic: 'UI Shell', epicColor: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    priority: 'low', type: 'bug',
    assignee: { initials: 'ZK', color: 'bg-violet-500' },
    due: 'Jun 8', points: 1,
  },

  // ── In Progress ───────────────────────────────────────
  {
    id: 't6', column: 'in_progress',
    title: 'Implement Kanban drag-and-drop with dnd-kit',
    epic: 'Board UI', epicColor: 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
    priority: 'critical', type: 'story',
    assignee: { initials: 'AB', color: 'bg-sky-500' },
    due: 'Jun 2', points: 13,
  },
  {
    id: 't7', column: 'in_progress',
    title: 'Integrate Groq LLM with structured output schema',
    epic: 'AI Module', epicColor: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
    priority: 'critical', type: 'task',
    assignee: { initials: 'SR', color: 'bg-emerald-500' },
    due: 'Today', points: 8,
  },
  {
    id: 't8', column: 'in_progress',
    title: 'Epic decomposition UI — review & confirm step',
    epic: 'AI Module', epicColor: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
    priority: 'high', type: 'story',
    assignee: { initials: 'MK', color: 'bg-amber-500' },
    due: 'Tomorrow', points: 5,
  },
  {
    id: 't9', column: 'in_progress',
    title: 'Dashboard stats connected to live API',
    epic: 'Dashboard', epicColor: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    priority: 'medium', type: 'task',
    assignee: { initials: 'ZK', color: 'bg-violet-500' },
    due: 'Jun 3', points: 3,
  },

  // ── In Review ────────────────────────────────────────
  {
    id: 't10', column: 'review',
    title: 'JWT auth middleware with role-based guards',
    epic: 'Auth', epicColor: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
    priority: 'critical', type: 'task',
    assignee: { initials: 'AB', color: 'bg-sky-500' },
    due: 'Jun 1', points: 8,
  },
  {
    id: 't11', column: 'review',
    title: 'Standup agent Markdown output formatting',
    epic: 'AI Module', epicColor: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
    priority: 'high', type: 'story',
    assignee: { initials: 'SR', color: 'bg-emerald-500' },
    due: 'Jun 2', points: 5,
  },
  {
    id: 't12', column: 'review',
    title: 'Project model schema — member roles & AI context',
    epic: 'Backend', epicColor: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    priority: 'medium', type: 'task',
    assignee: { initials: 'MK', color: 'bg-amber-500' },
    due: 'Jun 1', points: 3,
  },

  // ── Done ─────────────────────────────────────────────
  {
    id: 't13', column: 'done',
    title: 'Express server bootstrap with Helmet & CORS',
    epic: 'Backend', epicColor: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    priority: 'high', type: 'task',
    assignee: { initials: 'AB', color: 'bg-sky-500' },
    due: 'May 28', points: 5,
  },
  {
    id: 't14', column: 'done',
    title: 'Zod env validation with startup crash guard',
    epic: 'Backend', epicColor: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    priority: 'medium', type: 'task',
    assignee: { initials: 'ZK', color: 'bg-violet-500' },
    due: 'May 27', points: 2,
  },
  {
    id: 't15', column: 'done',
    title: 'User, Project & Task Mongoose schemas',
    epic: 'Backend', epicColor: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    priority: 'critical', type: 'epic',
    assignee: { initials: 'AB', color: 'bg-sky-500' },
    due: 'May 25', points: 13,
  },
  {
    id: 't16', column: 'done',
    title: 'Sidebar, AppLayout & ThemeToggle components',
    epic: 'UI Shell', epicColor: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    priority: 'high', type: 'story',
    assignee: { initials: 'MK', color: 'bg-amber-500' },
    due: 'May 30', points: 5,
  },
  {
    id: 't17', column: 'done',
    title: 'Auth module — register, login, /me endpoints',
    epic: 'Auth', epicColor: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
    priority: 'critical', type: 'story',
    assignee: { initials: 'SR', color: 'bg-emerald-500' },
    due: 'May 29', points: 8,
  },
];

// ── TaskCard ──────────────────────────────────────────────────────────────────

const TaskCard = ({ task }: { task: Task }) => {
  const priority = PRIORITY_CONFIG[task.priority];
  const type     = TYPE_CONFIG[task.type];
  const isDone   = task.column === 'done';

  return (
    <div className={`
      group relative flex flex-col gap-3
      p-4 rounded-xl
      bg-white dark:bg-slate-900
      border border-slate-200 dark:border-slate-700/80
      hover:border-sky-300 dark:hover:border-sky-500/50
      hover:-translate-y-0.5
      hover:shadow-md hover:shadow-slate-200/80 dark:hover:shadow-slate-900/80
      transition-all duration-200 ease-out
      cursor-grab active:cursor-grabbing
      ${isDone ? 'opacity-60' : ''}
    `}>

      {/* ── Top row: type badge + priority + menu ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Type badge */}
          <span className={`
            flex items-center gap-1
            px-1.5 py-0.5 rounded-md
            text-[10.5px] font-semibold
            ${type.color}
          `}>
            {type.icon}
            {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
          </span>

          {/* Priority dot */}
          <span className={`
            flex items-center gap-1
            text-[10.5px] font-medium
            ${priority.text}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priority.dot}`} />
            {priority.label}
          </span>
        </div>

        {/* Menu */}
        <button className="
          opacity-0 group-hover:opacity-100
          flex items-center justify-center
          w-6 h-6 rounded-lg
          hover:bg-slate-100 dark:hover:bg-slate-800
          text-slate-400 dark:text-slate-500
          transition-all duration-150
          focus-visible:opacity-100 focus-visible:outline-none
        ">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* ── Title ── */}
      <p className={`
        text-[13.5px] font-medium leading-snug
        text-slate-800 dark:text-slate-200
        ${isDone ? 'line-through text-slate-400 dark:text-slate-600' : ''}
      `}>
        {task.title}
      </p>

      {/* ── Epic badge ── */}
      <span className={`
        self-start px-2 py-0.5 rounded-md
        text-[11px] font-medium
        ${task.epicColor}
      `}>
        {task.epic}
      </span>

      {/* ── Bottom row: assignee + points + due ── */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">

        <div className="flex items-center gap-2">
          {/* Assignee avatar */}
          <div className={`
            flex items-center justify-center
            w-6 h-6 rounded-lg shrink-0
            text-[10px] font-bold text-white
            ${task.assignee.color}
          `}>
            {task.assignee.initials}
          </div>

          {/* Story points */}
          <span className="
            flex items-center gap-1
            px-1.5 py-0.5 rounded-md
            bg-slate-100 dark:bg-slate-800
            text-[10.5px] font-semibold
            text-slate-500 dark:text-slate-400
          ">
            <Layers size={9} />
            {task.points}
          </span>
        </div>

        {/* Due date */}
        <span className={`
          flex items-center gap-1
          text-[11px] font-medium
          ${task.due === 'Today'
            ? 'text-red-500 dark:text-red-400'
            : task.due === 'Tomorrow'
            ? 'text-amber-500 dark:text-amber-400'
            : 'text-slate-400 dark:text-slate-500'
          }
        `}>
          <Calendar size={10} />
          {task.due}
        </span>
      </div>
    </div>
  );
};

// ── KanbanColumn ──────────────────────────────────────────────────────────────

const KanbanColumn = ({
  column,
  tasks,
}: {
  column: Column;
  tasks:  Task[];
}) => {
  const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);

  return (
    <div className="flex flex-col w-[300px] shrink-0">

      {/* Column header */}
      <div className={`
        flex items-center justify-between
        px-3 py-2.5 rounded-xl mb-3
        ${column.headerBg}
        border-t-2 ${column.accent}
      `}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.dot}`} />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            {column.label}
          </span>
          <span className="
            px-1.5 py-0.5 rounded-full
            bg-white dark:bg-slate-900
            text-[11px] font-bold
            text-slate-600 dark:text-slate-300
            border border-slate-200 dark:border-slate-700
          ">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-600">
            {totalPoints} pts
          </span>
          <button className="
            flex items-center justify-center
            w-6 h-6 rounded-lg
            hover:bg-white dark:hover:bg-slate-800
            text-slate-400 dark:text-slate-500
            transition-colors duration-150
          ">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1">
        {tasks.length === 0 ? (
          <div className="
            flex flex-col items-center justify-center gap-2
            h-24 rounded-xl
            border-2 border-dashed border-slate-200 dark:border-slate-800
            text-slate-300 dark:text-slate-700
            text-[12px] font-medium
          ">
            <Circle size={20} />
            <span>No tasks</span>
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Projects = () => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Priority | 'all'>('all');

  const filteredTasks = MOCK_TASKS.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.epic.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === 'all' || task.priority === activeFilter;
    return matchSearch && matchFilter;
  });

  const getColumnTasks = (colId: ColumnId) =>
    filteredTasks.filter((t) => t.column === colId);

  const totalTasks = MOCK_TASKS.length;
  const doneTasks  = MOCK_TASKS.filter((t) => t.column === 'done').length;

  return (
    <div className="flex flex-col h-full gap-5 min-h-0">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-[20px] font-semibold text-slate-900 dark:text-slate-50">
            Sprint 4 Board
          </h2>
          <p className="text-[13px] text-slate-400 dark:text-slate-600 mt-0.5">
            {doneTasks} of {totalTasks} tasks completed
          </p>
        </div>

        <div className="flex items-center gap-2">

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"
            />
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                pl-9 pr-4 h-9 w-48 rounded-xl
                bg-white dark:bg-slate-900
                border border-slate-200 dark:border-slate-700
                text-[13px] text-slate-700 dark:text-slate-300
                placeholder:text-slate-400 dark:placeholder:text-slate-600
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent
                transition-all duration-150
              "
            />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <button className="
              flex items-center gap-1.5
              h-9 px-3 rounded-xl
              bg-white dark:bg-slate-900
              border border-slate-200 dark:border-slate-700
              text-[13px] font-medium
              text-slate-600 dark:text-slate-400
              hover:border-slate-300 dark:hover:border-slate-600
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-sky-400
            ">
              <Filter size={13} />
              {activeFilter === 'all' ? 'Filter' : activeFilter}
              <ChevronDown size={12} />
            </button>
          </div>

          {/* Priority quick filters */}
          <div className="hidden lg:flex items-center gap-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`
                  h-7 px-2.5 rounded-lg text-[11.5px] font-medium
                  transition-all duration-150 capitalize
                  ${activeFilter === f
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300 dark:hover:border-sky-600 hover:text-sky-500 dark:hover:text-sky-400'
                  }
                `}
              >
                {f === 'all' ? 'All' : (
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[f].dot}`} />
                    {f}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* New Task */}
          <button className="
            flex items-center gap-1.5
            h-9 px-4 rounded-xl
            bg-sky-500 hover:bg-sky-600
            text-white text-[13px] font-medium
            shadow-sm shadow-sky-500/30
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2
          ">
            <Plus size={15} />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-700"
            style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
          />
        </div>
        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-500 shrink-0">
          {Math.round((doneTasks / totalTasks) * 100)}% done
        </span>
      </div>

      {/* ── Board ────────────────────────────────────────── */}
      <div className="
        flex gap-4
        overflow-x-auto pb-4
        min-h-0 flex-1
        scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700
      ">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={getColumnTasks(col.id)}
          />
        ))}

        {/* Add column ghost */}
        <div className="
          flex items-start pt-1 shrink-0
        ">
          <button className="
            flex items-center gap-2
            w-[200px] px-4 py-3 rounded-xl
            border-2 border-dashed border-slate-200 dark:border-slate-800
            text-[13px] font-medium
            text-slate-400 dark:text-slate-600
            hover:border-sky-300 dark:hover:border-sky-700
            hover:text-sky-500 dark:hover:text-sky-500
            transition-all duration-150
          ">
            <Plus size={15} />
            Add column
          </button>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────── */}
      {filteredTasks.length === 0 && (
        <div className="
          absolute inset-0 flex flex-col items-center justify-center gap-3
          pointer-events-none
        ">
          <AlertCircle size={32} className="text-slate-300 dark:text-slate-700" />
          <p className="text-[14px] font-medium text-slate-400 dark:text-slate-600">
            No tasks match your search
          </p>
        </div>
      )}
    </div>
  );
};

export default Projects;