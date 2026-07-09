import { useState, useRef, useEffect } from 'react';
import {
  Plus, X, AlertCircle, ChevronDown, Loader2,
} from 'lucide-react';
import {
  taskService,
  type ApiTaskType,
  type ApiTaskStatus,
  type CreateTaskPayload,
} from '../../services/taskService';

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low';
type ColumnId = 'todo' | 'in_progress' | 'review' | 'done';

interface Task {
  id:          string;
  title:       string;
  description: string;
  epic:        string;
  epicColor:   string;
  priority:    Priority;
  type:        ApiTaskType;
  assignee:    null;
  due:         string;
  points:      number;
  column:      ColumnId;
}

interface CreateForm {
  title:       string;
  description: string;
  status:      ColumnId;
  priority:    Priority;
  type:        ApiTaskType;
  storyPoints: string;
}

const EMPTY_FORM: CreateForm = {
  title:       '',
  description: '',
  status:      'todo',
  priority:    'medium',
  type:        'task',
  storyPoints: '',
};

const COLUMN_LABELS: Record<ColumnId, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  review:      'In Review',
  done:        'Done',
};

const PRIORITY_DOT: Record<Priority, string> = {
  critical: 'bg-red-500',
  high:     'bg-amber-500',
  medium:   'bg-sky-500',
  low:      'bg-slate-400',
};

const PRIORITY_TEXT: Record<Priority, string> = {
  critical: 'text-red-500',
  high:     'text-amber-500',
  medium:   'text-sky-500',
  low:      'text-slate-400',
};

const INPUT_BASE = `
  w-full px-3 py-2.5 rounded-xl text-[13.5px]
  bg-white dark:bg-slate-900
  text-slate-800 dark:text-slate-200
  border border-slate-200 dark:border-slate-700
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus:outline-none focus:ring-2 focus:ring-sky-400/30
  focus:border-sky-400 dark:focus:border-sky-500
  transition-all duration-150
`;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CreateTaskModalProps {
  projectId:       string;
  defaultColumnId?: ColumnId;
  onClose:         () => void;
  /** Called with a minimal task shape on success, or with no args to trigger a re-fetch. */
  onCreate:        (task?: Task) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const CreateTaskModal = ({
  projectId,
  defaultColumnId = 'todo',
  onClose,
  onCreate,
}: CreateTaskModalProps) => {
  const [form,      setForm]      = useState<CreateForm>({ ...EMPTY_FORM, status: defaultColumnId });
  const [errors,    setErrors]    = useState<Partial<Record<keyof CreateForm, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError,  setApiError]  = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof CreateForm, string>> = {};
    if (!form.title.trim())              next.title = 'Title is required.';
    if (form.title.trim().length > 250)  next.title = 'Title cannot exceed 250 characters.';
    if (form.storyPoints && isNaN(Number(form.storyPoints))) next.storyPoints = 'Must be a number.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!projectId) {
      setApiError('No active project — set VITE_DEMO_PROJECT_ID in your .env');
      return;
    }

    setIsLoading(true);
    setApiError(null);

    const payload: CreateTaskPayload = {
      projectId,
      title:       form.title.trim(),
      description: form.description.trim() || undefined,
      type:        form.type,
      status:      form.status,
      priority:    form.priority,
      storyPoints: form.storyPoints ? Number(form.storyPoints) : undefined,
      tags:        [],
    };

    try {
      const created = await taskService.createTask(payload);
      const mapped: Task = {
        id:          created._id,
        title:       created.title,
        description: created.description ?? '',
        epic:        created.tags[0] ?? 'General',
        epicColor:   'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
        priority:    created.priority as Priority,
        type:        created.type,
        assignee:    null,
        due:         created.dueDate ?? '',
        points:      created.storyPoints ?? 0,
        column:      created.status as ColumnId,
      };
      onCreate(mapped);
      onClose();
    } catch (err) {
      console.error('[CreateTaskModal] createTask failed:', err);
      setApiError('Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 id="modal-title" className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
            Create New Task
          </h2>
          <button onClick={onClose} aria-label="Close" className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {apiError && (
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-[13px] font-medium">
                <AlertCircle size={14} className="shrink-0" />{apiError}
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Title <span className="text-red-500">*</span>
              </label>
              <input ref={titleRef} type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Implement JWT refresh token rotation" className={`${INPUT_BASE} ${errors.title ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`} />
              {errors.title && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle size={11} />{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Add context, acceptance criteria, or technical notes…" rows={3} className={`${INPUT_BASE} resize-none leading-relaxed`} />
            </div>

            {/* Type + Column */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Type</label>
                <div className="relative">
                  <select value={form.type} onChange={(e) => set('type', e.target.value as ApiTaskType)} className={`${INPUT_BASE} appearance-none pr-8 cursor-pointer`}>
                    <option value="task">Task</option>
                    <option value="story">Story</option>
                    <option value="bug">Bug</option>
                    <option value="epic">Epic</option>
                    <option value="subtask">Subtask</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Column</label>
                <div className="relative">
                  <select value={form.status} onChange={(e) => set('status', e.target.value as ColumnId)} className={`${INPUT_BASE} appearance-none pr-8 cursor-pointer`}>
                    {(Object.entries(COLUMN_LABELS) as [ColumnId, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Priority + Points */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Priority</label>
                <div className="relative">
                  <select value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)} className={`${INPUT_BASE} appearance-none pr-8 cursor-pointer`}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Story Points</label>
                <div className="relative">
                  <select value={form.storyPoints} onChange={(e) => set('storyPoints', e.target.value)} className={`${INPUT_BASE} appearance-none pr-8 cursor-pointer`}>
                    <option value="">— None —</option>
                    {[1, 2, 3, 5, 8, 13, 21].map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Preview chip */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[form.priority]}`} />
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                <span className={`font-semibold ${PRIORITY_TEXT[form.priority]}`}>{form.priority.charAt(0).toUpperCase() + form.priority.slice(1)}</span>
                {' '}priority · {' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{COLUMN_LABELS[form.status]}</span>
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-xl text-[13.5px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13.5px] font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:bg-sky-400 disabled:cursor-not-allowed shadow-sm shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900">
              {isLoading
                ? <><Loader2 size={14} className="animate-spin" />Creating…</>
                : <><Plus size={14} />Create Task</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;