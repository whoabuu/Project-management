import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Paperclip,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Zap,
  User,
  Clock,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Layers,
  AlertCircle,
  FolderKanban,
  Loader2,
} from 'lucide-react';
import { aiService, type DraftTask } from '../services/aiService';

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'ai';
type MessageType = 'text' | 'task_widget' | 'thinking';

interface TaskWidgetData {
  epicTitle:  string;
  epicId:     string;
  tasks:      DraftTask[];
  totalHours: number;
  confidence: number; // average confidenceScore across tasks, 0–1
}

interface Message {
  id:         string;
  role:       MessageRole;
  type:       MessageType;
  content:    string;
  timestamp:  string;
  widget?:    TaskWidgetData;
}

// ── Mock seed conversation (kept as a starter — now in the real DraftTask shape) ─

const MOCK_DRAFT_TASKS: DraftTask[] = [
  {
    title: 'Design and implement User registration endpoint with bcrypt hashing',
    type: 'task', priority: 'critical', estimatedHours: 4, storyPoints: 5,
    tags: ['Auth', 'Backend'], suggestedAssigneeId: '64f1a2b3c4d5e6f7a8b9c0d1',
    assignmentRationale: 'Abu Bakar has the most Node.js + Auth experience on the team.',
    confidenceScore: 0.95,
  },
  {
    title: 'Build JWT access + refresh token signing service',
    type: 'task', priority: 'critical', estimatedHours: 3, storyPoints: 5,
    tags: ['Auth', 'Security'], suggestedAssigneeId: '64f1a2b3c4d5e6f7a8b9c0d1',
    confidenceScore: 0.93,
  },
  {
    title: 'Implement requireAuth middleware with role-based guards',
    type: 'task', priority: 'high', estimatedHours: 3, storyPoints: 3,
    tags: ['Auth', 'Middleware'], suggestedAssigneeId: '64f1a2b3c4d5e6f7a8b9c0e2',
    confidenceScore: 0.91,
  },
  {
    title: 'Create /me endpoint and profile update flow',
    type: 'story', priority: 'medium', estimatedHours: 2, storyPoints: 2,
    tags: ['Auth', 'API'], suggestedAssigneeId: '64f1a2b3c4d5e6f7a8b9c0f3',
    confidenceScore: 0.96,
  },
  {
    title: 'Write Zod validation schemas for all auth routes',
    type: 'subtask', priority: 'medium', estimatedHours: 1, storyPoints: 1,
    tags: ['Auth', 'Validation'], suggestedAssigneeId: '64f1a2b3c4d5e6f7a8b9c0e2',
    confidenceScore: 0.97,
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1', role: 'ai', type: 'text',
    timestamp: '09:00 AM',
    content: `Good morning! I'm your AI Scrum Master for **Sprint 4**.\n\nI've reviewed the backlog and the team's current capacity. Here's a quick snapshot:\n\n• **Abu Bakar** — 28h available, strong in Node.js & Auth\n• **Sara R.** — 32h available, strong in React & LangChain\n• **Mikael K.** — 24h available, strong in UI/UX & Tailwind\n\nWhat would you like to work on today? Try \`/decompose <epicId>\` to break down an Epic, or just ask me anything.`,
  },
  {
    id: 'm2', role: 'user', type: 'text',
    timestamp: '09:02 AM',
    content: `/decompose 64f0a1b2c3d4e5f6a7b8c9d0`,
  },
  {
    id: 'm4', role: 'ai', type: 'text',
    timestamp: '09:02 AM',
    content: `I've decomposed the **User Authentication System** epic into **5 tasks** with a total estimate of **13 hours**.\n\nConfidence score: **94%** — the requirements are clear and well-scoped.`,
  },
  {
    id: 'm5', role: 'ai', type: 'task_widget',
    timestamp: '09:02 AM',
    content: '',
    widget: {
      epicTitle:  'User Authentication System',
      epicId:     '64f0a1b2c3d4e5f6a7b8c9d0',
      tasks:      MOCK_DRAFT_TASKS,
      totalHours: 13,
      confidence: 0.94,
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_STYLES = {
  critical: { dot: 'bg-red-500',   text: 'text-red-500'   },
  high:     { dot: 'bg-amber-500', text: 'text-amber-500' },
  medium:   { dot: 'bg-sky-500',   text: 'text-sky-500'   },
  low:      { dot: 'bg-slate-400', text: 'text-slate-400' },
};

const TYPE_LABELS = {
  story:   { label: 'Story',   color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10'          },
  task:    { label: 'Task',    color: 'text-slate-500 bg-slate-100 dark:bg-slate-800'      },
  subtask: { label: 'Subtask', color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' },
};

const renderContent = (text: string) => {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <span key={i} className="block">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={j} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[12px] font-mono text-sky-600 dark:text-sky-400">
                {part.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </span>
    );
  });
};

const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Extracts the Epic Title from the agent's decompositionPrompt, since the
 *  backend's ScrumMasterOutput doesn't return it as a separate field. */
const extractEpicTitle = (prompt: string): string | null => {
  const match = prompt.match(/\*\*Epic Title:\*\*\s*(.+)/);
  return match?.[1]?.trim() ?? null;
};

/** No user directory lookup is wired yet — render a short fallback badge
 *  derived from the assignee's ObjectId until /users lookups are added. */
const getAssigneeInitials = (id?: string): string => {
  if (!id) return '—';
  return id.slice(-2).toUpperCase();
};

// ── Task Widget ───────────────────────────────────────────────────────────────

type ConfirmState = 'idle' | 'saving' | 'saved' | 'error';

const TaskWidget = ({ widget }: { widget: TaskWidgetData }) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const confidencePct = Math.round(widget.confidence * 100);
  const uniqueAssignees = new Set(
    widget.tasks.map((t) => t.suggestedAssigneeId).filter(Boolean)
  ).size;

  const handleConfirm = async () => {
    if (confirmState === 'saving' || confirmState === 'saved') return;
    setConfirmState('saving');

    try {
      await aiService.confirmTasks(widget.epicId, widget.tasks);
      setConfirmState('saved');
    } catch (err) {
      console.error('[TaskWidget] confirmTasks failed:', err);
      setConfirmState('error');
    }
  };

  return (
    <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-500 to-cyan-500">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/20">
            <Zap size={14} className="text-white" fill="currentColor" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Epic Decomposition</p>
            <p className="text-[11px] text-white/70">
              {widget.epicId.slice(-8)} · {widget.epicTitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-white/70">Confidence</p>
          <p className="text-[13px] font-bold text-white">{confidencePct}%</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        {[
          { label: 'Tasks',      value: widget.tasks.length,      icon: <Layers size={12} /> },
          { label: 'Est. Hours', value: `${widget.totalHours}h`,  icon: <Clock size={12} /> },
          { label: 'Assignees',  value: uniqueAssignees,          icon: <FolderKanban size={12} /> },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5 py-2.5 px-3">
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-600">
              {stat.icon}
              <span className="text-[10px] font-medium uppercase tracking-wide">{stat.label}</span>
            </div>
            <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Task list */}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {widget.tasks.map((task, idx) => {
          const p = PRIORITY_STYLES[task.priority];
          const t = TYPE_LABELS[task.type];
          return (
            <li
              key={`${task.title}-${idx}`}
              title={task.assignmentRationale}
              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-100"
            >
              <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-md mt-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                  {task.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${t.color}`}>{t.label}</span>
                  <span className={`flex items-center gap-1 text-[10.5px] font-medium ${p.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                    {task.priority}
                  </span>
                  {typeof task.estimatedHours === 'number' && (
                    <span className="flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-600">
                      <Clock size={9} />{task.estimatedHours}h
                    </span>
                  )}
                  {typeof task.storyPoints === 'number' && (
                    <span className="flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-600">
                      <Layers size={9} />{task.storyPoints}pt
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0 bg-sky-500 text-white text-[10px] font-bold">
                {getAssigneeInitials(task.suggestedAssigneeId)}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-[11.5px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
          {confirmState === 'error' ? (
            <span className="text-red-500 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={11} /> Failed to save — try again
            </span>
          ) : (
            <>
              <AlertCircle size={11} />
              Review before saving to backlog
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={confirmState === 'saving' || confirmState === 'saved'}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            Edit
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={confirmState === 'saving' || confirmState === 'saved'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
              confirmState === 'saved'
                ? 'bg-emerald-500 text-white cursor-default'
                : confirmState === 'error'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-sky-500 hover:bg-sky-600 text-white hover:scale-[1.02] active:scale-[0.98]'
            } disabled:hover:scale-100`}
          >
            {confirmState === 'saved' && <><CheckCircle2 size={13} /> Saved to Backlog</>}
            {confirmState === 'saving' && <><Loader2 size={13} className="animate-spin" /> Saving…</>}
            {confirmState === 'idle' && <><ChevronRight size={13} /> Confirm & Save</>}
            {confirmState === 'error' && <><RotateCcw size={13} /> Retry</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Thinking Indicator ────────────────────────────────────────────────────────

const ThinkingBubble = ({ content }: { content: string }) => (
  <div className="flex items-start gap-3">
    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500 shrink-0 mt-0.5">
      <Bot size={15} className="text-white" />
    </div>
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }} />
        ))}
      </div>
      <span className="text-[12.5px] italic text-slate-500 dark:text-slate-400">{content}</span>
    </div>
  </div>
);

// ── Chat Message ──────────────────────────────────────────────────────────────

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';

  if (message.type === 'thinking') {
    return <ThinkingBubble content={message.content} />;
  }

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2.5">
        <div className="flex flex-col items-end gap-1.5 max-w-[72%]">
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-sky-500 text-white shadow-sm shadow-sky-500/20">
            <p className="text-[13.5px] leading-relaxed font-mono">{message.content}</p>
          </div>
          <span className="text-[10.5px] text-slate-400 dark:text-slate-600 flex items-center gap-1 px-1">
            <Clock size={9} />{message.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mb-5 bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[11px] font-bold">
          <User size={14} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500 shrink-0 mt-0.5 shadow-sm shadow-sky-500/30">
        <Bot size={15} className="text-white" />
      </div>

      <div className="flex flex-col gap-1.5 max-w-[82%]">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">AI Scrum Master</span>
          <span className="flex items-center gap-1 text-[10.5px] text-sky-500 dark:text-sky-400 font-medium">
            <Sparkles size={9} />Nexus AI
          </span>
          <span className="text-[10.5px] text-slate-400 dark:text-slate-600 flex items-center gap-0.5 ml-auto">
            <Clock size={9} />{message.timestamp}
          </span>
        </div>

        {message.content && (
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-1">
              {renderContent(message.content)}
            </div>
          </div>
        )}

        {message.widget && <TaskWidget widget={message.widget} />}

        {!message.widget && message.content && (
          <div className="flex items-center gap-1 px-1">
            {[
              { icon: <Copy size={11} />,       label: 'Copy'  },
              { icon: <ThumbsUp size={11} />,   label: 'Good'  },
              { icon: <ThumbsDown size={11} />, label: 'Bad'   },
              { icon: <RotateCcw size={11} />,  label: 'Retry' },
            ].map((action) => (
              <button
                key={action.label}
                aria-label={action.label}
                className="flex items-center justify-center w-6 h-6 rounded-lg text-slate-300 dark:text-slate-700 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const AiScrumMaster = () => {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput]       = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const appendAiText = (content: string): void => {
    const msg: Message = {
      id:        `m${Date.now() + Math.random()}`,
      role:      'ai',
      type:      'text',
      content,
      timestamp: nowLabel(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id:        `m${Date.now()}`,
      role:      'user',
      type:      'text',
      content:   trimmed,
      timestamp: nowLabel(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    // ── Slash command: /decompose <epicId> ────────────────────────────────
    if (trimmed.startsWith('/decompose ')) {
      const epicId = trimmed.slice('/decompose '.length).trim();

      if (!epicId) {
        appendAiText('Please provide an Epic ID — e.g. `/decompose 64f1a2b3c4d5e6f7a8b9c0d1`');
        setIsTyping(false);
        return;
      }

      try {
        const result = await aiService.decomposeEpic(epicId);
        const epicTitle = extractEpicTitle(result.decompositionPrompt) ?? 'Untitled Epic';
        const avgConfidence = result.tasks.length
          ? result.tasks.reduce((sum, t) => sum + t.confidenceScore, 0) / result.tasks.length
          : 0;

        const widgetMsg: Message = {
          id:        `m${Date.now() + 1}`,
          role:      'ai',
          type:      'task_widget',
          content:   '',
          timestamp: nowLabel(),
          widget: {
            epicTitle,
            epicId:     result.epicId,
            tasks:      result.tasks,
            totalHours: result.totalEstimatedHours,
            confidence: avgConfidence,
          },
        };

        setMessages((prev) => [...prev, widgetMsg]);

        if (result.agentWarnings.length > 0) {
          appendAiText(`⚠️ ${result.agentWarnings.join(' ')}`);
        }
      } catch (err) {
        console.error('[AiScrumMaster] decomposeEpic failed:', err);
        appendAiText(
          "I couldn't decompose that epic. Double-check the Epic ID and make sure it's marked as type `epic`."
        );
      } finally {
        setIsTyping(false);
      }

      return;
    }

    // ── Regular chat message ──────────────────────────────────────────────
    try {
      const reply = await aiService.sendMessage(trimmed);
      appendAiText(reply);
    } catch (err) {
      console.error('[AiScrumMaster] sendMessage failed:', err);
      appendAiText(
        "I'm having trouble connecting to my neural net right now. Please check your connection and try again."
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-112px)] -m-6">

      {/* ── Chat header ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500 shadow-sm shadow-sky-500/30">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-50">AI Scrum Master</h2>
            <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400 dark:text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online · Powered by Groq + Llama 3.3
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {[
            { icon: <FolderKanban size={11} />, label: 'Sprint 4' },
            { icon: <Layers size={11} />,       label: '6 Epics'  },
          ].map((chip) => (
            <span key={chip.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11.5px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {chip.icon}{chip.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Message area ─────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-600 px-2 whitespace-nowrap">
            Today · Sprint 4
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isTyping && <ThinkingBubble content="Thinking…" />}
      </div>

      {/* ── Suggested prompts ─────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 py-2 shrink-0 overflow-x-auto bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/60">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-600 shrink-0">Try:</span>
        {[
          'Generate today\'s standup',
          'Who has capacity this sprint?',
          '/decompose 64f0a1b2c3d4e5f6a7b8c9d0',
          'Show overdue tasks',
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => setInput(prompt)}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11.5px] font-medium text-slate-600 dark:text-slate-400 hover:border-sky-300 dark:hover:border-sky-600 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all duration-150 whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* ── Input area ────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-end gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus-within:border-sky-400 dark:focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-400/20 transition-all duration-150">
          <button aria-label="Attach file" className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mb-0.5 text-slate-400 dark:text-slate-600 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150">
            <Paperclip size={16} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, or try /decompose <epicId> … (⏎ to send, ⇧⏎ for newline)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13.5px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none leading-relaxed max-h-40 py-1"
          />

          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mb-0.5 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white disabled:text-slate-400 dark:disabled:text-slate-600 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm shadow-sky-500/30 disabled:shadow-none"
          >
            <Send size={14} />
          </button>
        </div>

        <p className="text-center text-[10.5px] text-slate-300 dark:text-slate-800 mt-2">
          AI responses may be inaccurate. Always review generated tasks before saving.
        </p>
      </div>
    </div>
  );
};

export default AiScrumMaster;