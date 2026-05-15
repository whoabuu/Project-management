import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Types } from 'mongoose';
import { TaskModel } from '../../../models/Task.model';
import { ProjectModel } from '../../../models/Project.model';
import { AppError } from '../../../middleware/error.middleware';
import { env } from '../../../config/env';
import { logger } from '../../../shared/utils/logger';
import { StandupInput, StandupOutput } from '../../../shared/types/ai.types';

// ── LLM Instance ─────────────────────────────────────────────────────────────

const llm = new ChatGroq({
  apiKey:      env.GROQ_API_KEY,
  model:       env.GROQ_MODEL,
  maxTokens:   env.GROQ_MAX_TOKENS,
  temperature: 0.3, // Slightly higher than scrumMaster for natural prose
});

// ── Prompt Builders ───────────────────────────────────────────────────────────

const buildSystemPrompt = (projectName: string): string => `
You are an expert Agile Scrum Master writing a concise daily standup summary.
Your audience is a development team and their stakeholders.

## Output Format (strict Markdown)
You MUST structure your response exactly as follows:

### 📋 Daily Standup — ${projectName}
**Date:** {today's date}

#### ✅ Completed
- Bullet list of completed items

#### 🔄 In Progress
- Bullet list of work currently underway

#### 🚧 Blockers
- Bullet list of blockers, or "No blockers reported." if none

#### 📊 Summary
One or two sentence executive summary of overall progress.

## Rules
1. Only report on HUMAN activity — ignore entries where isAIGenerated is true.
2. Group related activities under the developer's name when possible.
3. Be specific — mention task titles, not just "worked on stuff".
4. Keep the entire summary under 400 words.
5. If there is no human activity to report, say so clearly.
`.trim();

const buildActivitySummary = (input: StandupInput): string => {
  // Filter out AI-generated activity — standup should only reflect human work
  const humanActivity = input.activityEvents.filter((e) => !e.isAIGenerated);

  if (humanActivity.length === 0) {
    return 'No human activity was recorded in the last 24 hours.';
  }

  const lines = humanActivity.map(
    (e) =>
      `- [${new Date(e.timestamp).toLocaleTimeString()}] ${e.actorName} ${e.action} on "${e.taskTitle}"`
  );

  const previousContext =
    input.previousSummaries.length > 0
      ? `\n\n## Previous Standup Context (last ${input.previousSummaries.length} day(s))\n` +
        input.previousSummaries
          .slice(-2) // Only last 2 to stay within token budget
          .map((s, i) => `### Day -${input.previousSummaries.length - i}\n${s}`)
          .join('\n\n')
      : '';

  return `
## Activity Log (last 24 hours) — ${humanActivity.length} event(s)
${lines.join('\n')}
${previousContext}
`.trim();
};

// ── Main Agent Function ───────────────────────────────────────────────────────

/**
 * Generates a Markdown daily standup summary for a project.
 *
 * Steps:
 *  1. Verify user has project access
 *  2. Fetch all tasks with activity in the last 24 hours
 *  3. Flatten activityLog entries into a feed
 *  4. Invoke the LLM with system + user prompt
 *  5. Persist the summary to project.aiContext.standupSummaryHistory (ring buffer)
 *  6. Return the structured StandupOutput
 *
 * @param projectId - The MongoDB ObjectId string of the project
 * @param userId    - The requesting user (must have project access)
 */
export const generateStandup = async (
  projectId: string,
  userId: Types.ObjectId
): Promise<StandupOutput> => {
  logger.info(`[Standup] Generating standup for project: ${projectId}`);

  // ── 1. Fetch & authorize project ─────────────────────────────────────────
  const project = await ProjectModel.findOne({
    _id: new Types.ObjectId(projectId),
    $or: [
      { ownerId: userId },
      { 'members.userId': userId },
    ],
  });

  if (!project) {
    throw new AppError(
      'Project not found or you do not have access to it.',
      404
    );
  }

  // ── 2. Fetch tasks with activity in the last 24 hours ────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const activeTasks = await TaskModel.find({
    projectId: project._id,
    'activityLog.timestamp': { $gte: since },
  })
    .select('title status activityLog')
    .lean();

  // ── 3. Flatten activity log entries into a single sorted feed ─────────────
  const activityEvents: StandupInput['activityEvents'] = [];

  for (const task of activeTasks) {
    for (const entry of task.activityLog) {
      // Only include entries from within the last 24 hours
      if (new Date(entry.timestamp) >= since) {
        activityEvents.push({
          actorName:    entry.actorName,
          action:       entry.action,
          taskTitle:    task.title,
          isAIGenerated: entry.isAIGenerated,
          timestamp:    new Date(entry.timestamp),
        });
      }
    }
  }

  // Sort chronologically for a coherent narrative
  activityEvents.sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // ── 4. Build agent input ──────────────────────────────────────────────────
  const standupInput: StandupInput = {
    projectId:        project._id,
    projectName:      project.name,
    sinceTimestamp:   since,
    activityEvents,
    previousSummaries: project.aiContext.standupSummaryHistory,
  };

  // ── 5. Invoke LLM ─────────────────────────────────────────────────────────
  const systemMsg = new SystemMessage(buildSystemPrompt(project.name));
  const userMsg   = new HumanMessage(
    `Here is the activity data for today's standup:\n\n${buildActivitySummary(standupInput)}\n\nPlease write the standup summary now.`
  );

  logger.info(
    `[Standup] Invoking LLM with ${activityEvents.length} activity events`
  );

  let summaryText: string;

  try {
    const response = await llm.invoke([systemMsg, userMsg]);

    // response.content can be string or complex content blocks
    summaryText = typeof response.content === 'string'
      ? response.content
      : response.content
          .map((block) => ('text' in block ? block.text : ''))
          .join('');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[Standup] LLM invocation failed: ${message}`);
    throw new AppError(
      'The standup agent failed to generate a summary. Please try again.',
      502
    );
  }

  // ── 6. Parse structured fields from the Markdown output ───────────────────
  const completedItems  = extractSection(summaryText, '✅ Completed');
  const inProgressItems = extractSection(summaryText, '🔄 In Progress');
  const blockers        = extractSection(summaryText, '🚧 Blockers');

  // ── 7. Persist to ring buffer (max 10 entries) ────────────────────────────
  const updatedHistory = [
    ...project.aiContext.standupSummaryHistory.slice(-9), // Keep last 9
    summaryText, // Append newest
  ];

  await ProjectModel.findByIdAndUpdate(project._id, {
    'aiContext.standupSummaryHistory':  updatedHistory,
    'aiContext.lastStandupGeneratedAt': new Date(),
  });

  logger.info(`[Standup] Successfully generated standup for: "${project.name}"`);

  const output: StandupOutput = {
    summary:          summaryText,
    blockers,
    completedItems,
    inProgressItems,
    generatedAt:      new Date(),
  };

  return output;
};

// ── Utility: Extract bullet points from a Markdown section ───────────────────

/**
 * Pulls bullet-point lines from a named Markdown section.
 * e.g. extractSection(md, '✅ Completed') → ['Built login API', 'Fixed auth bug']
 */
const extractSection = (markdown: string, sectionTitle: string): string[] => {
  const lines   = markdown.split('\n');
  const results: string[] = [];
  let   inSection = false;

  for (const line of lines) {
    if (line.includes(sectionTitle)) {
      inSection = true;
      continue;
    }
    // Stop when we hit the next section header
    if (inSection && line.startsWith('####')) break;

    if (inSection && line.trim().startsWith('-')) {
      const content = line.replace(/^-\s*/, '').trim();
      if (content) results.push(content);
    }
  }

  return results;
};