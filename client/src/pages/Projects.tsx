import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
//import type { SortableReturn } from '../types/dnd.types';
import CreateTaskModal from '../components/board/NewTaskModal';
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  AlertCircle,
  Circle,
  Zap,
  Bug,
  BookOpen,
  Layers,
  X,
} from 'lucide-react';
import {
  taskService,
  type ApiTask,
  type ApiTaskType,
  type ApiTaskPriority,
} from '../services/taskService';

// ── Active project ────────────────────────────────────────────────────────────

const ACTIVE_PROJECT_ID =
  import.meta.env['VITE_DEMO_PROJECT_ID'] as string || '';

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = ApiTaskPriority;
type ColumnId = 'todo' | 'in_progress' | 'review' | 'done';

interface Assignee {
  initials: string;
  color:    string;
}

interface Task {
  id:          string;
  title:       string;
  description: string;
  epic:        string;
  epicColor:   string;
  priority:    Priority;
  type:        ApiTaskType;
  assignee:    Assignee | null;
  due:         string;
  points:      number;
  column:      ColumnId;
}

interface Column {
  id:       ColumnId;
  label:    string;
  accent:   string;
  dot:      string;
  headerBg: string;
}

// ── Create task form state ────────────────────────────────────────────────────

// interface CreateForm {
//   title:       string;
//   description: string;
//   status:      ColumnId;
//   priority:    Priority;
//   type:        ApiTaskType;
//   storyPoints: string; // kept as string for controlled input, parsed on submit
// }

// const EMPTY_FORM: CreateForm = {
//   title:       '',
//   description: '',
//   status:      'todo',
//   priority:    'medium',
//   type:        'task',
//   storyPoints: '',
// };

// ── Config ────────────────────────────────────────────────────────────────────

const COLUMNS: Column[] = [
  { id: 'todo',        label: 'To Do',       accent: 'border-slate-300 dark:border-slate-600',       dot: 'bg-slate-400',   headerBg: 'bg-slate-100 dark:bg-slate-800/60'       },
  { id: 'in_progress', label: 'In Progress', accent: 'border-sky-400 dark:border-sky-500',           dot: 'bg-sky-500',     headerBg: 'bg-sky-50 dark:bg-sky-500/10'            },
  { id: 'review',      label: 'In Review',   accent: 'border-violet-400 dark:border-violet-500',     dot: 'bg-violet-500',  headerBg: 'bg-violet-50 dark:bg-violet-500/10'      },
  { id: 'done',        label: 'Done',        accent: 'border-emerald-400 dark:border-emerald-500',   dot: 'bg-emerald-500', headerBg: 'bg-emerald-50 dark:bg-emerald-500/10'    },
];

const PRIORITY_CONFIG: Record<Priority, { dot: string; label: string; text: string }> = {
  critical: { dot: 'bg-red-500',   label: 'Critical', text: 'text-red-500'   },
  high:     { dot: 'bg-amber-500', label: 'High',     text: 'text-amber-500' },
  medium:   { dot: 'bg-sky-500',   label: 'Medium',   text: 'text-sky-500'   },
  low:      { dot: 'bg-slate-400', label: 'Low',      text: 'text-slate-400' },
};

const TYPE_CONFIG: Record<ApiTaskType, { icon: React.ReactNode; color: string; label: string }> = {
  epic:    { icon: <Zap size={11} />,      color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10', label: 'Epic'    },
  story:   { icon: <BookOpen size={11} />, color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10',          label: 'Story'   },
  task:    { icon: <Circle size={11} />,   color: 'text-slate-500 bg-slate-100 dark:bg-slate-700',      label: 'Task'    },
  bug:     { icon: <Bug size={11} />,      color: 'text-red-500 bg-red-50 dark:bg-red-500/10',          label: 'Bug'     },
  subtask: { icon: <Layers size={11} />,   color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',   label: 'Subtask' },
};

const EPIC_COLORS = [
  'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
  'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
];

const AVATAR_COLORS = [
  'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-violet-500', 'bg-rose-500', 'bg-indigo-500',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const hashIndex = (str: string, len: number): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h) % len;
};

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const formatDue = (iso?: string | null): string => {
  if (!iso) return 'No due date';
  const d = new Date(iso);
  const t = new Date();
  const diff = Math.round(
    (d.setHours(0,0,0,0) - t.setHours(0,0,0,0)) / 86_400_000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const VALID_COLUMNS: ColumnId[] = ['todo', 'in_progress', 'review', 'done'];

const mapApi = (t: ApiTask): Task | null => {
  if (!VALID_COLUMNS.includes(t.status as ColumnId)) return null;
  const epicLabel = t.tags[0] ?? 'General';
  return {
    id:          t._id,
    title:       t.title,
    description: t.description ?? '',
    epic:        epicLabel,
    epicColor:   EPIC_COLORS[hashIndex(epicLabel, EPIC_COLORS.length)]!,
    priority:    t.priority,
    type:        t.type,
    assignee:    t.assigneeId && typeof t.assigneeId === 'object'
      ? { initials: getInitials(t.assigneeId.name), color: AVATAR_COLORS[hashIndex(t.assigneeId._id, AVATAR_COLORS.length)]! }
      : null,
    due:    formatDue(t.dueDate),
    points: t.storyPoints ?? 0,
    column: t.status as ColumnId,
  };
};

// ── Shared input classes ──────────────────────────────────────────────────────

// const INPUT_BASE = `
//   w-full px-3 py-2.5 rounded-xl text-[13.5px]
//   bg-white dark:bg-slate-900
//   text-slate-800 dark:text-slate-200
//   border border-slate-200 dark:border-slate-700
//   placeholder:text-slate-400 dark:placeholder:text-slate-600
//   focus:outline-none focus:ring-2 focus:ring-sky-400/30
//   focus:border-sky-400 dark:focus:border-sky-500
//   transition-all duration-150
// `;

// ── Create Task Modal ─────────────────────────────────────────────────────────

// interface CreateTaskModalProps {
//   projectId:  string;
//   onClose:    () => void;
//   onCreate:   (task: Task) => void;
// }



// ── TaskCard ──────────────────────────────────────────────────────────────────

const TaskCard = ({
  task,
  dragHandleProps,
  isOverlay = false,
}: {
  task:             Task;
  dragHandleProps?: {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners:  ReturnType<typeof useSortable>['listeners'];
  };
  isOverlay?: boolean;
}) => {
  const priority = PRIORITY_CONFIG[task.priority];
  const type     = TYPE_CONFIG[task.type];
  const isDone   = task.column === 'done';

  return (
    <div
      {...(dragHandleProps?.attributes ?? {})}
      {...(dragHandleProps?.listeners  ?? {})}
      className={`
        group relative flex flex-col gap-3 p-4 rounded-xl
        bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-700/80
        ${isOverlay
          ? 'shadow-xl shadow-slate-300/50 dark:shadow-slate-950/80 rotate-1 cursor-grabbing'
          : 'hover:border-sky-300 dark:hover:border-sky-500/50 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/80 dark:hover:shadow-slate-900/80 cursor-grab active:cursor-grabbing'
        }
        transition-all duration-200 ease-out
        ${isDone ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold ${type.color}`}>
            {type.icon}{type.label}
          </span>
          <span className={`flex items-center gap-1 text-[10.5px] font-medium ${priority.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priority.dot}`} />
            {priority.label}
          </span>
        </div>
        <button className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-all duration-150">
          <MoreHorizontal size={14} />
        </button>
      </div>

      <p className={`text-[13.5px] font-medium leading-snug text-slate-800 dark:text-slate-200 ${isDone ? 'line-through text-slate-400 dark:text-slate-600' : ''}`}>
        {task.title}
      </p>

      {task.description && (
        <p className="text-[12px] text-slate-400 dark:text-slate-600 leading-snug line-clamp-2">
          {task.description}
        </p>
      )}

      <span className={`self-start px-2 py-0.5 rounded-md text-[11px] font-medium ${task.epicColor}`}>
        {task.epic}
      </span>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 text-[10px] font-bold text-white ${task.assignee.color}`}>
              {task.assignee.initials}
            </div>
          ) : (
            <div className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0 border border-dashed border-slate-300 dark:border-slate-700" />
          )}
          {task.points > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
              <Layers size={9} />{task.points}
            </span>
          )}
        </div>
        <span className={`flex items-center gap-1 text-[11px] font-medium ${
          task.due === 'Today'     ? 'text-red-500 dark:text-red-400'   :
          task.due === 'Tomorrow'  ? 'text-amber-500 dark:text-amber-400' :
          'text-slate-400 dark:text-slate-500'
        }`}>
          <Calendar size={10} />{task.due}
        </span>
      </div>
    </div>
  );
};

// ── SortableTaskCard ──────────────────────────────────────────────────────────

const SortableTaskCard = ({ task }: { task: Task }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}>
      <TaskCard task={task} dragHandleProps={{ attributes, listeners }} />
    </div>
  );
};

// ── KanbanColumn ──────────────────────────────────────────────────────────────

const KanbanColumn = ({
  column,
  tasks,
  onAddTask,
}: {
  column:     Column;
  tasks:      Task[];
  onAddTask:  (colId: ColumnId) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const totalPoints = tasks.reduce((s, t) => s + t.points, 0);

  return (
    <div className="flex flex-col w-[300px] shrink-0">
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 ${column.headerBg} border-t-2 ${column.accent}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.dot}`} />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{column.label}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {totalPoints > 0 && (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-600">{totalPoints} pts</span>
          )}
          <button
            onClick={() => onAddTask(column.id)}
            aria-label={`Add task to ${column.label}`}
            className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors duration-150"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`
          flex flex-col gap-3 flex-1 min-h-[80px] rounded-xl p-1 -m-1
          transition-colors duration-150
          ${isOver ? 'bg-sky-50/60 dark:bg-sky-500/5 ring-2 ring-sky-300/50 dark:ring-sky-500/30' : ''}
        `}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div
              onClick={() => onAddTask(column.id)}
              className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 text-[12px] font-medium cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 hover:text-sky-400 transition-all duration-150"
            >
              <Plus size={18} />
              <span>Add task</span>
            </div>
          ) : (
            tasks.map((t) => <SortableTaskCard key={t.id} task={t} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
};

// ── Column Skeleton ───────────────────────────────────────────────────────────

const ColumnSkeleton = () => (
  <div className="flex flex-col w-[300px] shrink-0 gap-3">
    <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
    ))}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const Projects = () => {
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [loadError,     setLoadError]     = useState<string | null>(null);
  const [actionError,   setActionError]   = useState<string | null>(null);
  const [activeTask,    setActiveTask]    = useState<Task | null>(null);

  // Modal
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [_defaultColumn, setDefaultColumn] = useState<ColumnId>('todo');

  // Filters
  const [search,        setSearch]        = useState('');
  const [activeFilter,  setActiveFilter]  = useState<Priority | 'all'>('all');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const api    = await taskService.getTasks(ACTIVE_PROJECT_ID);
      const mapped = api.map(mapApi).filter((t): t is Task => t !== null);
      setTasks(mapped);
    } catch {
      setLoadError('Could not load tasks. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTasks(); }, [fetchTasks]);

  // ── Open modal helpers ──────────────────────────────────────────────────────
  const openModal = (colId: ColumnId = 'todo') => {
    setDefaultColumn(colId);
    setIsModalOpen(true);
  };

  // ── Task created callback ───────────────────────────────────────────────────
  const handleTaskCreated = useCallback((task?: any) => {
    if (task) {
      setTasks((prev) => [task, ...prev]);
    }
    setIsModalOpen(false); // Close the modal smoothly
  }, []);

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;

    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    const overTask   = tasks.find((t) => t.id === over.id);
    const destCol    = (overTask ? overTask.column : over.id) as ColumnId;

    if (!VALID_COLUMNS.includes(destCol) || dragged.column === destCol) return;

    const snapshot = tasks;
    setTasks((prev) => prev.map((t) => t.id === dragged.id ? { ...t, column: destCol } : t));
    setActionError(null);

    try {
      await taskService.updateTaskStatus(dragged.id, destCol);
    } catch {
      setTasks(snapshot);
      setActionError(`Couldn't move "${dragged.title}" — change reverted.`);
    }
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.epic.toLowerCase().includes(q);
    const matchPriority = activeFilter === 'all' || t.priority === activeFilter;
    return matchSearch && matchPriority;
  });

  const getColTasks = (id: ColumnId) => filteredTasks.filter((t) => t.column === id);

  const totalTasks = tasks.length;
  const doneTasks  = tasks.filter((t) => t.column === 'done').length;
  const pct        = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <>
      <div className="flex flex-col h-full gap-5 min-h-0">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-[20px] font-semibold text-slate-900 dark:text-slate-50">
              Sprint 4 Board
            </h2>
            <p className="text-[13px] text-slate-400 dark:text-slate-600 mt-0.5">
              {isLoading ? 'Loading tasks…' : `${doneTasks} of ${totalTasks} tasks completed`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 pointer-events-none" />
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
                  focus:w-56 transition-all duration-200
                "
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Priority quick filters */}
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`
                    h-7 px-2.5 rounded-lg text-[11.5px] font-medium
                    transition-all duration-150 capitalize
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                    ${activeFilter === f
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
            <button
              onClick={() => openModal('todo')}
              className="
                flex items-center gap-1.5 h-9 px-4 rounded-xl
                bg-sky-500 hover:bg-sky-600 text-white text-[13px] font-medium
                shadow-sm shadow-sky-500/30
                hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              "
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New Task</span>
            </button>
          </div>
        </div>

        {/* ── Active filter chip ──────────────────────────────── */}
        {(search || activeFilter !== 'all') && (
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-slate-400 dark:text-slate-600 font-medium">Filtering:</span>
            {search && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[11.5px] font-medium border border-sky-200 dark:border-sky-500/30">
                "{search}"
                <button onClick={() => setSearch('')} aria-label="Remove search filter">
                  <X size={11} />
                </button>
              </span>
            )}
            {activeFilter !== 'all' && (
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium border ${PRIORITY_CONFIG[activeFilter].text} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700`}>
                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[activeFilter].dot}`} />
                {PRIORITY_CONFIG[activeFilter].label}
                <button onClick={() => setActiveFilter('all')} aria-label="Remove priority filter">
                  <X size={11} />
                </button>
              </span>
            )}
            <span className="text-[11.5px] text-slate-400 dark:text-slate-600">
              ({filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''})
            </span>
          </div>
        )}

        {/* ── Action error toast ──────────────────────────────── */}
        {actionError && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400">
            <span className="flex items-center gap-2 text-[13px] font-medium">
              <AlertCircle size={14} />{actionError}
            </span>
            <button onClick={() => setActionError(null)} aria-label="Dismiss"><X size={14} /></button>
          </div>
        )}

        {/* ── Progress bar ──────────────────────────────────── */}
        {!isLoading && totalTasks > 0 && (
          <div className="shrink-0 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-500 shrink-0 tabular-nums">
              {pct}% done
            </span>
          </div>
        )}

        {/* ── Load error ────────────────────────────────────── */}
        {loadError && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{loadError}</p>
            <button onClick={() => void fetchTasks()} className="text-[13px] font-medium text-sky-500 hover:text-sky-600 transition-colors">
              Try again
            </button>
          </div>
        )}

        {/* ── Board ─────────────────────────────────────────── */}
        {!loadError && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={(e) => void handleDragEnd(e)}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-0 flex-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              {isLoading
                ? COLUMNS.map((c) => <ColumnSkeleton key={c.id} />)
                : COLUMNS.map((c) => (
                    <KanbanColumn
                      key={c.id}
                      column={c}
                      tasks={getColTasks(c.id)}
                      onAddTask={openModal}
                    />
                  ))
              }

              {!isLoading && (
                <div className="flex items-start pt-1 shrink-0">
                  <button className="flex items-center gap-2 w-[200px] px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-[13px] font-medium text-slate-400 dark:text-slate-600 hover:border-sky-300 dark:hover:border-sky-700 hover:text-sky-500 transition-all duration-150">
                    <Plus size={15} />Add column
                  </button>
                </div>
              )}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* ── Empty states ──────────────────────────────────── */}
        {!isLoading && !loadError && totalTasks === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Layers size={24} className="text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-[14px] font-medium text-slate-500 dark:text-slate-500">
              No tasks yet — create your first task to get started.
            </p>
            <button
              onClick={() => openModal('todo')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-[13px] font-medium transition-colors"
            >
              <Plus size={14} />New Task
            </button>
          </div>
        )}

        {!isLoading && totalTasks > 0 && filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Search size={28} className="text-slate-300 dark:text-slate-700" />
            <p className="text-[14px] font-medium text-slate-400 dark:text-slate-600">
              No tasks match your filters
            </p>
            <button
              onClick={() => { setSearch(''); setActiveFilter('all'); }}
              className="text-[13px] font-medium text-sky-500 hover:text-sky-600 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Create Task Modal ──────────────────────────────── */}
      {isModalOpen && (
        <CreateTaskModal
          projectId={ACTIVE_PROJECT_ID}
          onClose={() => setIsModalOpen(false)}
          onCreate={handleTaskCreated}
        />
      )}
    </>
  );
};

export default Projects;