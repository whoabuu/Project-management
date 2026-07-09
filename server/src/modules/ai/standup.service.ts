import { ChatGroq } from '@langchain/groq';
import { Types } from 'mongoose';
import { TaskModel } from '../../models/Task.model';
import { ProjectModel } from '../../models/Project.model';
import { AppError } from '../../middleware/error.middleware';
import { env } from '../../config/env';
import { logger } from '../../shared/utils/logger';

// ── LLM Instance ──────────────────────────────────────────────────────────────

const llm = new ChatGroq({
  apiKey:      env.GROQ_API_KEY,
  model:       env.GROQ_MODEL,
  maxTokens:   env.GROQ_MAX_TOKENS,
  temperature: 0.3,
});

// ── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are an expert Agile AI Scrum Master embedded in a project management tool called Nexus.
Given a JSON payload of project tasks grouped by status, generate a concise, high-signal daily standup report.

Format your output with EXACTLY these three bold markdown headers in this order:
## ✅ COMPLETED
## 🔄 IN PROGRESS
## 🚧 BLOCKERS

Rules:
- Under each header, use a short bullet list (- item).
- Each bullet must be one line only — task title + assignee name in parentheses if available.
- For BLOCKERS: infer from overdue tasks (dueDate in the past), tasks with status "in_progress" for more than 3 days, or tasks with priority "critical" not yet done.
- If a section has no items, write "- Nothing to report."
- Do NOT add any preamble, greeting, summary paragraph, or closing remarks.
- Do NOT wrap output in code fences.
- Output ONLY the raw Markdown — nothing before the first ## and nothing after the last bullet.
`.trim();

// ── Task shape sent to the LLM ────────────────────────────────────────────────

interface LLMTask {
  title:       string;
  status:      string;
  priority:    string;
  assignee:    string;
  dueDate:     string | null;
  updatedAt:   string;
  isOverdue:   boolean;
  daysSinceMoved: number;
}

interface TaskPayload {
  projectName: string;
  generatedAt: string;
  completed:   LLMTask[];
  inProgress:  LLMTask[];
  todo:        LLMTask[];
}

// ── Main Service Function ─────────────────────────────────────────────────────

export const generateStandupReport = async (
  projectId: string,
  userId:    Types.ObjectId
): Promise<{ markdown: string; generatedAt: Date }> => {

  logger.info(`[Standup] Generating report for project: ${projectId}`);

  // ── 1. Verify project access ────────────────────────────────────────────────
  const project = await ProjectModel.findOne({
    _id: new Types.ObjectId(projectId),
    $or: [
      { ownerId: userId },
      { 'members.userId': userId },
    ],
  }).lean();

  if (!project) {
    throw new AppError('Project not found or you do not have access to it.', 404);
  }

  // ── 2. Fetch and group tasks ────────────────────────────────────────────────
  const now = new Date();

  const allTasks = await TaskModel.find({
    projectId: new Types.ObjectId(projectId),
    type:      { $ne: 'epic' }, // Epics are too coarse for a standup
  })
    .populate('assigneeId', 'name')
    .sort({ updatedAt: -1 })
    .limit(80) // Keep token usage bounded
    .lean();

  const toTaskShape = (task: typeof allTasks[number]): LLMTask => {
    const assigneeName =
      task.assigneeId && typeof task.assigneeId === 'object' && 'name' in task.assigneeId
        ? (task.assigneeId as { name: string }).name
        : 'Unassigned';

    const updatedAt  = new Date(task.updatedAt);
    const daysSince  = Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000);
    const dueDate    = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0]! : null;
    const isOverdue  = !!task.dueDate && new Date(task.dueDate) < now && task.status !== 'done';

    return {
      title:          task.title,
      status:         task.status,
      priority:       task.priority,
      assignee:       assigneeName,
      dueDate,
      updatedAt:      updatedAt.toISOString().split('T')[0]!,
      isOverdue,
      daysSinceMoved: daysSince,
    };
  };

  // Completed: done tasks updated in the last 48 hours
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const completed = allTasks
    .filter((t) => t.status === 'done' && new Date(t.updatedAt) >= fortyEightHoursAgo)
    .map(toTaskShape)
    .slice(0, 15); // Cap for token budget

  // In progress: all tasks currently in_progress or review
  const inProgress = allTasks
    .filter((t) => t.status === 'in_progress' || t.status === 'review')
    .map(toTaskShape)
    .slice(0, 15);

  // Todo: critical + high priority backlog/todo tasks (give context for blockers)
  const todo = allTasks
    .filter((t) =>
      (t.status === 'todo' || t.status === 'backlog') &&
      (t.priority === 'critical' || t.priority === 'high')
    )
    .map(toTaskShape)
    .slice(0, 10);

  const payload: TaskPayload = {
    projectName: project.name,
    generatedAt: now.toISOString(),
    completed,
    inProgress,
    todo,
  };

  // ── 3. Guard: nothing meaningful to report ──────────────────────────────────
  if (completed.length === 0 && inProgress.length === 0) {
    logger.info(`[Standup] No recent activity found for project: ${project.name}`);
    return {
      markdown: [
        '## ✅ COMPLETED',
        '- Nothing to report.',
        '',
        '## 🔄 IN PROGRESS',
        '- Nothing to report.',
        '',
        '## 🚧 BLOCKERS',
        '- Nothing to report.',
      ].join('\n'),
      generatedAt: now,
    };
  }

  // ── 4. Call the LLM ─────────────────────────────────────────────────────────
  const userMessage = `
Project: ${payload.projectName}
Report Date: ${new Date(payload.generatedAt).toDateString()}

Here is the task data:
${JSON.stringify(payload, null, 2)}
`.trim();

  logger.info(
    `[Standup] Invoking LLM — completed: ${completed.length}, ` +
    `inProgress: ${inProgress.length}, todo: ${todo.length}`
  );

  let markdown: string;

  try {
    const response = await llm.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMessage  },
    ]);

    markdown = typeof response.content === 'string'
      ? response.content
      : response.content
          .map((b) => ('text' in b ? b.text : ''))
          .join('');

    // Strip any accidental code fence wrapping
    markdown = markdown
      .replace(/^```(?:markdown)?\n?/i, '')
      .replace(/\n?```$/,               '')
      .trim();

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[Standup] LLM invocation failed: ${message}`);
    throw new AppError('The standup agent failed to generate a report. Please try again.', 502);
  }

  // ── 5. Persist to project ring buffer (max 10 entries) ─────────────────────
  const updatedHistory = [
    ...(project.aiContext.standupSummaryHistory ?? []).slice(-9),
    markdown,
  ];

  await ProjectModel.findByIdAndUpdate(project._id, {
    'aiContext.standupSummaryHistory':  updatedHistory,
    'aiContext.lastStandupGeneratedAt': now,
  });

  logger.info(`[Standup] Successfully generated standup for: "${project.name}"`);

  return { markdown, generatedAt: now };
};