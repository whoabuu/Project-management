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
  type DraggableAttributes,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  Loader2,
  X,
} from 'lucide-react';
import { taskService, type ApiTask, type ApiTaskStatus } from '../services/taskService';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';


// ── Active project placeholder ────────────────────────────────────────────────
// A real project switcher arrives in a later phase. For now the board is
// scoped to a single hardcoded project so the wiring can be demonstrated.
const ACTIVE_PROJECT_ID = import.meta.env.VITE_DEMO_PROJECT_ID || '';

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low';
type TaskType = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
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
  assignee:  Assignee | null;
  due:       string;
  points:    number;
  column:    ColumnId;
}

interface Column {
  id:       ColumnId;
  label:    string;
  accent:   string;
  dot:      string;
  headerBg: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const COLUMNS: Column[] = [
  { id: 'todo',        label: 'To Do',       accent: 'border-slate-300 dark:border-slate-600', dot: 'bg-slate-400',  headerBg: 'bg-slate-100 dark:bg-slate-800/60' },
  { id: 'in_progress', label: 'In Progress', accent: 'border-sky-400 dark:border-sky-500',      dot: 'bg-sky-500',    headerBg: 'bg-sky-50 dark:bg-sky-500/10'       },
  { id: 'review',      label: 'In Review',   accent: 'border-violet-400 dark:border-violet-500', dot: 'bg-violet-500', headerBg: 'bg-violet-50 dark:bg-violet-500/10' },
  { id: 'done',        label: 'Done',        accent: 'border-emerald-400 dark:border-emerald-500', dot: 'bg-emerald-500', headerBg: 'bg-emerald-50 dark:bg-emerald-500/10' },
];

const PRIORITY_CONFIG: Record<Priority, { dot: string; label: string; text: string }> = {
  critical: { dot: 'bg-red-500',   label: 'Critical', text: 'text-red-500'   },
  high:     { dot: 'bg-amber-500', label: 'High',     text: 'text-amber-500' },
  medium:   { dot: 'bg-sky-500',   label: 'Medium',   text: 'text-sky-500'   },
  low:      { dot: 'bg-slate-400', label: 'Low',      text: 'text-slate-400' },
};

const TYPE_CONFIG: Record<TaskType, { icon: React.ReactNode; color: string }> = {
  epic:    { icon: <Zap size={11} />,      color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10'   },
  story:   { icon: <BookOpen size={11} />, color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10'            },
  task:    { icon: <Circle size={11} />,   color: 'text-slate-500 bg-slate-100 dark:bg-slate-700'        },
  bug:     { icon: <Bug size={11} />,      color: 'text-red-500 bg-red-50 dark:bg-red-500/10'            },
  subtask: { icon: <Layers size={11} />,   color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'      },
};

const EPIC_COLOR_PALETTE = [
  'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
  'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
];

const AVATAR_COLOR_PALETTE = [
  'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-indigo-500',
];

// ── Mappers ───────────────────────────────────────────────────────────────────

/** Simple deterministic hash → palette index, so the same id/tag always gets the same colour. */
const hashToIndex = (input: string, paletteLength: number): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % paletteLength;
};

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const formatDueDate = (iso: string | null | undefined): string => {
  if (!iso) return 'No due date';

  const date  = new Date(iso);
  const today = new Date();
  const diffDays = Math.round(
    (date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86_400_000
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const VALID_COLUMNS: ColumnId[] = ['todo', 'in_progress', 'review', 'done'];

/** Maps a raw backend ApiTask into the lean shape the board UI renders. */
const mapApiTaskToTask = (apiTask: ApiTask): Task | null => {
  // Tasks still in 'backlog' don't have a column on this 4-column board view.
  if (!VALID_COLUMNS.includes(apiTask.status as ColumnId)) return null;

  const epicLabel = apiTask.tags[0] ?? 'General';
  const epicColor = EPIC_COLOR_PALETTE[hashToIndex(epicLabel, EPIC_COLOR_PALETTE.length)];

  let assignee: Assignee | null = null;
  if (apiTask.assigneeId && typeof apiTask.assigneeId === 'object') {
    const a = apiTask.assigneeId;
    assignee = {
      initials: getInitials(a.name),
      color:    AVATAR_COLOR_PALETTE[hashToIndex(a._id, AVATAR_COLOR_PALETTE.length)],
    };
  }

  return {
    id:        apiTask._id,
    title:     apiTask.title,
    epic:      epicLabel,
    epicColor,
    priority:  apiTask.priority,
    type:      apiTask.type,
    assignee,
    due:       formatDueDate(apiTask.dueDate),
    points:    apiTask.storyPoints ?? 0,
    column:    apiTask.status as ColumnId,
  };
};

// ── TaskCard ──────────────────────────────────────────────────────────────────

const TaskCard = ({
  task,
  dragHandleProps,
  isOverlay = false,
}: {
  task:             Task;
  dragHandleProps?: {
     attributes: DraggableAttributes;
    listeners:  SyntheticListenerMap | undefined;
  };
  isOverlay?: boolean;
}) => {
  const priority = PRIORITY_CONFIG[task.priority];
  const type     = TYPE_CONFIG[task.type];
  const isDone   = task.column === 'done';

  return (
    <div
      {...(dragHandleProps?.attributes ?? {})}
      {...(dragHandleProps?.listeners ?? {})}
      className={`
        group relative flex flex-col gap-3
        p-4 rounded-xl
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
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold ${type.color}`}>
            {type.icon}
            {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
          </span>
          <span className={`flex items-center gap-1 text-[10.5px] font-medium ${priority.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priority.dot}`} />
            {priority.label}
          </span>
        </div>

        <button className="
          opacity-0 group-hover:opacity-100
          flex items-center justify-center w-6 h-6 rounded-lg
          hover:bg-slate-100 dark:hover:bg-slate-800
          text-slate-400 dark:text-slate-500
          transition-all duration-150
        ">
          <MoreHorizontal size={14} />
        </button>
      </div>

      <p className={`
        text-[13.5px] font-medium leading-snug
        text-slate-800 dark:text-slate-200
        ${isDone ? 'line-through text-slate-400 dark:text-slate-600' : ''}
      `}>
        {task.title}
      </p>

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
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
            <Layers size={9} />
            {task.points}
          </span>
        </div>

        <span className={`
          flex items-center gap-1 text-[11px] font-medium
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

// ── Sortable wrapper for TaskCard ─────────────────────────────────────────────

const SortableTaskCard = ({ task }: { task: Task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:   isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard task={task} dragHandleProps={{ attributes, listeners }} />
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
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);

  return (
    <div className="flex flex-col w-[300px] shrink-0">
      <div className={`
        flex items-center justify-between px-3 py-2.5 rounded-xl mb-3
        ${column.headerBg} border-t-2 ${column.accent}
      `}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.dot}`} />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            {column.label}
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-600">
            {totalPoints} pts
          </span>
          <button className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors duration-150">
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
            <div className="
              flex flex-col items-center justify-center gap-2 h-24 rounded-xl
              border-2 border-dashed border-slate-200 dark:border-slate-800
              text-slate-300 dark:text-slate-700 text-[12px] font-medium
            ">
              <Circle size={20} />
              <span>Drop here</span>
            </div>
          ) : (
            tasks.map((task) => <SortableTaskCard key={task.id} task={task} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
};

// ── Skeleton Loader ───────────────────────────────────────────────────────────

const ColumnSkeleton = () => (
  <div className="flex flex-col w-[300px] shrink-0 gap-3">
    <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
        style={{ animationDelay: `${i * 80}ms` }}
      />
    ))}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const Projects = () => {
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState<Priority | 'all'>('all');
  const [activeTask, setActiveTask]   = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // ── Fetch tasks on mount ────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const apiTasks = await taskService.getTasks(ACTIVE_PROJECT_ID);
      const mapped = apiTasks
        .map(mapApiTaskToTask)
        .filter((t): t is Task => t !== null);
      setTasks(mapped);
    } catch (err) {
      console.error('[Projects] Failed to fetch tasks:', err);
      setLoadError('Could not load tasks. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    // Determine the destination column: `over` is either a column container
    // (dropped on an empty column) or another task (dropped near a card).
    const overTask = tasks.find((t) => t.id === over.id);
    const destColumnId = (overTask ? overTask.column : over.id) as ColumnId;
    const sourceColumnId = draggedTask.column;

    if (!VALID_COLUMNS.includes(destColumnId) || sourceColumnId === destColumnId) {
      return; // No cross-column move — nothing to persist
    }

    // ── Optimistic update ──────────────────────────────────────────────────
    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTask.id ? { ...t, column: destColumnId } : t))
    );
    setActionError(null);

    try {
      await taskService.updateTaskStatus(draggedTask.id, destColumnId);
    } catch (err) {
      console.error('[Projects] Failed to update task status:', err);
      // ── Revert on failure ────────────────────────────────────────────────
      setTasks(previousTasks);
      setActionError(`Couldn't move "${draggedTask.title}" — change reverted.`);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredTasks = tasks.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.epic.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'all' || task.priority === activeFilter;
    return matchSearch && matchFilter;
  });

  const getColumnTasks = (colId: ColumnId) =>
    filteredTasks.filter((t) => t.column === colId);

  const totalTasks = tasks.length;
  const doneTasks  = tasks.filter((t) => t.column === 'done').length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
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

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" />
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

          <button className="
            flex items-center gap-1.5 h-9 px-3 rounded-xl
            bg-white dark:bg-slate-900
            border border-slate-200 dark:border-slate-700
            text-[13px] font-medium text-slate-600 dark:text-slate-400
            hover:border-slate-300 dark:hover:border-slate-600
            transition-colors duration-150
          ">
            <Filter size={13} />
            {activeFilter === 'all' ? 'Filter' : activeFilter}
            <ChevronDown size={12} />
          </button>

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

          <button className="
            flex items-center gap-1.5 h-9 px-4 rounded-xl
            bg-sky-500 hover:bg-sky-600 text-white text-[13px] font-medium
            shadow-sm shadow-sky-500/30
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-150
          ">
            <Plus size={15} />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* ── Action error toast ─────────────────────────────── */}
      {actionError && (
        <div className="
          shrink-0 flex items-center justify-between gap-3
          px-4 py-2.5 rounded-xl
          bg-red-50 dark:bg-red-500/10
          border border-red-200 dark:border-red-500/30
          text-red-600 dark:text-red-400
        ">
          <span className="flex items-center gap-2 text-[13px] font-medium">
            <AlertCircle size={14} />
            {actionError}
          </span>
          <button onClick={() => setActionError(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────── */}
      {!isLoading && totalTasks > 0 && (
        <div className="shrink-0 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-500 shrink-0">
            {progressPct}% done
          </span>
        </div>
      )}

      {/* ── Load error state ──────────────────────────────── */}
      {loadError && !isLoading && (
        <div className="
          flex flex-col items-center justify-center gap-3 py-16
          text-slate-400 dark:text-slate-600
        ">
          <AlertCircle size={28} className="text-red-400" />
          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">
            {loadError}
          </p>
          <button
            onClick={() => void fetchTasks()}
            className="text-[13px] font-medium text-sky-500 hover:text-sky-600 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Board ────────────────────────────────────────── */}
      {!loadError && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={(e) => void handleDragEnd(e)}
        >
          <div className="
            flex gap-4 overflow-x-auto pb-4 min-h-0 flex-1
            scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700
          ">
            {isLoading
              ? COLUMNS.map((col) => <ColumnSkeleton key={col.id} />)
              : COLUMNS.map((col) => (
                  <KanbanColumn key={col.id} column={col} tasks={getColumnTasks(col.id)} />
                ))
            }

            {!isLoading && (
              <div className="flex items-start pt-1 shrink-0">
                <button className="
                  flex items-center gap-2 w-[200px] px-4 py-3 rounded-xl
                  border-2 border-dashed border-slate-200 dark:border-slate-800
                  text-[13px] font-medium text-slate-400 dark:text-slate-600
                  hover:border-sky-300 dark:hover:border-sky-700
                  hover:text-sky-500 dark:hover:text-sky-500
                  transition-all duration-150
                ">
                  <Plus size={15} />
                  Add column
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
          <Loader2 size={28} className="text-slate-300 dark:text-slate-700" />
          <p className="text-[14px] font-medium text-slate-400 dark:text-slate-600">
            No tasks yet — create your first task to get started.
          </p>
        </div>
      )}

      {!isLoading && totalTasks > 0 && filteredTasks.length === 0 && (
        <div className="
          flex flex-col items-center justify-center gap-3 py-16
        ">
          <AlertCircle size={28} className="text-slate-300 dark:text-slate-700" />
          <p className="text-[14px] font-medium text-slate-400 dark:text-slate-600">
            No tasks match your search
          </p>
        </div>
      )}
    </div>
  );
};

export default Projects;