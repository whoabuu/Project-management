import { ChatGroq } from '@langchain/groq';
import { z } from 'zod';
import { Types } from 'mongoose';
import { TaskModel } from '../../../models/Task.model';
import { ProjectModel } from '../../../models/Project.model';
import { UserModel } from '../../../models/User.model';
import { AppError } from '../../../middleware/error.middleware';
import { env } from '../../../config/env';
import { logger } from '../../../shared/utils/logger';
import {
  ScrumMasterInput,
  ScrumMasterOutput,
  GeneratedTaskDraft,
} from '../../../shared/types/ai.types';

// ── Structured Output Schema ──────────────────────────────────────────────────

/**
 * Zod schema passed to `.withStructuredOutput()`.
 * The LLM is forced to return data conforming to this shape — no free-text.
 * LangChain uses this to build the function-calling / tool_use payload
 * automatically, so the response is always parseable.
 */
const GeneratedTaskSchema = z.object({
  title: z
    .string()
    .describe('A concise, actionable task title starting with a verb (e.g. "Implement JWT auth middleware")'),

  description: z
    .string()
    .describe('A detailed description of what needs to be done, written in Markdown. Include acceptance criteria if possible.'),

  type: z
    .enum(['story', 'task', 'subtask'])
    .describe('The type of work item. Use "story" for user-facing features, "task" for technical work, "subtask" for granular steps.'),

  priority: z
    .enum(['critical', 'high', 'medium', 'low'])
    .describe('Priority based on complexity and dependency — critical items must be done first.'),

  storyPoints: z
    .number()
    .optional()
    .describe('Fibonacci story points (1, 2, 3, 5, 8, 13) reflecting complexity. Omit if uncertain.'),

  estimatedHours: z
    .number()
    .describe('Realistic development hours required, excluding review and testing overhead.'),

  tags: z
    .array(z.string())
    .describe('Relevant technical tags from the project tech stack (e.g. ["React", "API", "Auth"]).'),

  suggestedAssigneeId: z
    .string()
    .optional()
    .describe('The userId of the most suitable team member based on skills and availability. Omit if unsure.'),

  assignmentRationale: z
    .string()
    .optional()
    .describe('One sentence explaining why this team member was suggested.'),

  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe('Your confidence in this decomposition (0.0–1.0). Use < 0.6 if requirements are ambiguous.'),
});

const DecompositionOutputSchema = z.object({
  tasks: z
    .array(GeneratedTaskSchema)
    .describe('An ordered array of tasks decomposed from the Epic. Order by dependency — foundational tasks first.'),

  agentWarnings: z
    .array(z.string())
    .describe('Any concerns about the Epic scope, team capacity, or ambiguous requirements.'),

  totalEstimatedHours: z
    .number()
    .describe('Sum of all estimatedHours across the generated tasks.'),
});

// ── LLM Instance ─────────────────────────────────────────────────────────────

/**
 * Instantiate once — reused across calls.
 * temperature: 0.2 keeps output deterministic and structured.
 * We bind `.withStructuredOutput()` per-call (not here) so the schema
 * can be passed alongside, keeping this instance generic.
 */
const llm = new ChatGroq({
  apiKey:      env.GROQ_API_KEY,
  model:       env.GROQ_MODEL,
  maxTokens:   env.GROQ_MAX_TOKENS,
  temperature: env.GROQ_TEMPERATURE,
});

// ── System Prompt Builder ─────────────────────────────────────────────────────

const buildSystemPrompt = (input: ScrumMasterInput): string => {
  const { projectContext, teamMembers } = input;

  const teamSummary = teamMembers.length > 0
    ? teamMembers
        .map(
          (m) =>
            `- ${m.name} (${m.skills.join(', ')}) — ${m.availableHours}h available`
        )
        .join('\n')
    : 'No team member data available. Skip assignee suggestions.';

  return `
You are an expert Agile Scrum Master and Senior Software Architect.
Your job is to decompose a high-level Epic into granular, actionable development tasks.

## Project Context
- Domain: ${projectContext.domainDescription || 'Not specified'}
- Tech Stack: ${projectContext.techStack.join(', ') || 'Not specified'}
- Target Sprint Velocity: ${projectContext.targetSprintVelocity ?? 'Unknown'} story points

## Available Team Members
${teamSummary}

## Decomposition Rules
1. Each task must be completable by ONE developer in a single sprint.
2. Tasks must be ordered by dependency — foundational work first.
3. No task should exceed 13 story points or 16 hours.
4. Tasks above 8 story points should be split further.
5. Every task must map to the tech stack — avoid vague tasks like "do research".
6. Suggest assignees ONLY if a team member has the matching skill AND available hours.
7. If the Epic is too vague to decompose confidently, set confidenceScore below 0.6 and add a warning.
8. Use the project's tech stack for tags — do not invent technologies not in the stack.
`.trim();
};

// ── Main Agent Function ───────────────────────────────────────────────────────

/**
 * Decomposes an Epic task into an array of GeneratedTaskDraft objects.
 *
 * Does NOT persist anything to the database — returns drafts for
 * frontend review. The user confirms before tasks are saved.
 *
 * @param epicId  - The MongoDB ObjectId of the Epic task
 * @param userId  - The requesting user (must have project access)
 */
export const decomposeEpic = async (
  epicId: string,
  userId: Types.ObjectId
): Promise<ScrumMasterOutput> => {
  logger.info(`[ScrumMaster] Starting decomposition for epic: ${epicId}`);

  // ── 1. Fetch & validate the Epic ─────────────────────────────────────────
  const epic = await TaskModel.findById(new Types.ObjectId(epicId));
  if (!epic) throw new AppError('Epic not found.', 404);
  if (epic.type !== 'epic') {
    throw new AppError(
      `Task is of type "${epic.type}". Only Epics can be decomposed.`,
      400
    );
  }

  // ── 2. Fetch the parent Project ───────────────────────────────────────────
  const project = await ProjectModel.findOne({
    _id: epic.projectId,
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

  // ── 3. Fetch team member capacity profiles ────────────────────────────────
  const memberUserIds = [
    project.ownerId,
    ...project.members.map((m) => m.userId),
  ];

  const teamUsers = await UserModel.find({
    _id:                    { $in: memberUserIds },
    'capacity.isAvailable': true,
  })
    .select('_id name capacity.skills capacity.weeklyHoursAvailable capacity.currentSprintLoad')
    .lean();

  const teamMembers: ScrumMasterInput['teamMembers'] = teamUsers.map((u) => ({
    userId:         u._id,
    name:           u.name,
    skills:         u.capacity.skills,
    availableHours: Math.max(
      0,
      u.capacity.weeklyHoursAvailable - u.capacity.currentSprintLoad
    ),
  }));

  // ── 4. Build agent input ──────────────────────────────────────────────────
  const agentInput: ScrumMasterInput = {
    epicId:         epic._id,
    epicTitle:      epic.title,
    epicDescription: epic.description ?? 'No description provided.',
    projectContext: {
      techStack:             project.aiContext.techStack,
      domainDescription:     project.aiContext.domainDescription,
      targetSprintVelocity:  project.aiContext.targetSprintVelocity ?? undefined,
    },
    teamMembers,
  };

  // ── 5. Bind structured output & invoke ────────────────────────────────────
  const structuredLLM = llm.withStructuredOutput(DecompositionOutputSchema, {
    name: 'decompose_epic', // Tool name sent to Groq function calling
  });

  const userMessage = `
Please decompose the following Epic into granular development tasks:

**Epic Title:** ${agentInput.epicTitle}

**Epic Description:**
${agentInput.epicDescription}

Return a structured list of tasks following the rules in the system prompt.
`.trim();

  logger.info(`[ScrumMaster] Invoking LLM for epic: "${epic.title}"`);

  let rawOutput: z.infer<typeof DecompositionOutputSchema>;

  try {
    rawOutput = await structuredLLM.invoke([
      { role: 'system', content: buildSystemPrompt(agentInput) },
      { role: 'user',   content: userMessage },
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[ScrumMaster] LLM invocation failed: ${message}`);
    throw new AppError(
      'The AI agent failed to generate tasks. Please try again.',
      502
    );
  }

  logger.info(
    `[ScrumMaster] Generated ${rawOutput.tasks.length} task drafts for epic: "${epic.title}"`
  );

  // ── 6. Map LLM output → GeneratedTaskDraft[] ─────────────────────────────
  const tasks: GeneratedTaskDraft[] = rawOutput.tasks.map((t) => ({
    title:               t.title,
    description:         t.description,
    type:                t.type,
    priority:            t.priority,
    storyPoints:         t.storyPoints,
    estimatedHours:      t.estimatedHours,
    tags:                t.tags,
    confidenceScore:     t.confidenceScore,
    suggestedAssigneeId: (t.suggestedAssigneeId && Types.ObjectId.isValid(t.suggestedAssigneeId))
      ? new Types.ObjectId(t.suggestedAssigneeId)
      : undefined,
    assignmentRationale: t.assignmentRationale,
  }));

  return {
    epicId:              epic._id,
    tasks,
    decompositionPrompt: userMessage,
    totalEstimatedHours: rawOutput.totalEstimatedHours,
    agentWarnings:       rawOutput.agentWarnings,
  };
};