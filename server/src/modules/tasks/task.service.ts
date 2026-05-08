import { Types } from 'mongoose';
import { TaskModel, ITask, ITaskComment } from '../../models/Task.model';
import { ProjectModel } from '../../models/Project.model';
import { UserModel } from '../../models/User.model';
import { AppError } from '../../middleware/error.middleware';
import {
  CreateTaskInput,
  UpdateTaskInput,
  AddCommentInput,
  TaskQueryInput,
} from './task.routes';

// ── Project Access Guard ──────────────────────────────────────────────────────

/**
 * Verifies the requesting user is the owner OR a member of the project.
 * Called at the top of every service method before any DB mutation.
 * Throws 404 (not 403) to prevent project existence enumeration.
 */
const assertProjectAccess = async (
  projectId: string,
  userId: Types.ObjectId
): Promise<void> => {
  const project = await ProjectModel.findOne({
    _id: new Types.ObjectId(projectId),
    $or: [
      { ownerId: userId },
      { 'members.userId': userId },
    ],
  }).lean();

  if (!project) {
    throw new AppError(
      'Project not found or you do not have access to it.',
      404
    );
  }
};

/**
 * Verifies access to a task's parent project via the task document itself.
 * Used when we already have a taskId but need to confirm project membership.
 */
const assertTaskAccess = async (
  task: ITask,
  userId: Types.ObjectId
): Promise<void> => {
  await assertProjectAccess(task.projectId.toString(), userId);
};

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Creates a new task.
 *
 * Steps:
 *  1. Assert the user has access to the parent project
 *  2. If a parentId is provided, verify it exists in the same project
 *  3. Create the task
 *  4. If parentId exists, push this task into parent's childIds (bi-directional link)
 *  5. Append a creation entry to the activity log
 */
export const createTask = async (
  input: CreateTaskInput,
  reporterId: Types.ObjectId,
  reporterName: string
): Promise<ITask> => {
  const {
    projectId, title, description, type, status, priority,
    storyPoints, estimatedHours, assigneeId, watcherIds,
    parentId, sprintId, tags, dueDate, order,
  } = input;

  // 1. Project access guard
  await assertProjectAccess(projectId, reporterId);

  // 2. Validate assignee is a project member if provided
  if (assigneeId) {
    const project = await ProjectModel.findById(projectId).lean();
    const isAssigneeMember =
      project?.ownerId.equals(new Types.ObjectId(assigneeId)) ||
      project?.members.some((m) =>
        m.userId.equals(new Types.ObjectId(assigneeId))
      );

    if (!isAssigneeMember) {
      throw new AppError(
        'Assignee must be a member of the project.',
        400
      );
    }
  }

  // 3. Validate parentId exists in the same project
  if (parentId) {
    const parentTask = await TaskModel.findOne({
      _id:       new Types.ObjectId(parentId),
      projectId: new Types.ObjectId(projectId),
    }).lean();

    if (!parentTask) {
      throw new AppError(
        'Parent task not found in this project.',
        404
      );
    }
  }

  // 4. Create the task
  const task = await TaskModel.create({
    projectId:      new Types.ObjectId(projectId),
    sprintId:       sprintId  ? new Types.ObjectId(sprintId)  : undefined,
    parentId:       parentId  ? new Types.ObjectId(parentId)  : undefined,
    assigneeId:     assigneeId ? new Types.ObjectId(assigneeId) : undefined,
    watcherIds:     (watcherIds ?? []).map((id) => new Types.ObjectId(id)),
    reporterId,
    title,
    description,
    type,
    status,
    columnId: status, // columnId mirrors status on creation
    priority,
    storyPoints,
    estimatedHours,
    tags,
    dueDate:  dueDate ? new Date(dueDate) : undefined,
    order,
    aiMeta: { aiGenerated: false },
    activityLog: [
      {
        actorId:      reporterId,
        actorName:    reporterName,
        action:       'created this task',
        isAIGenerated: false,
        timestamp:    new Date(),
      },
    ],
  });

  // 5. Bi-directional link: push new task into parent's childIds
  if (parentId) {
    await TaskModel.findByIdAndUpdate(
      new Types.ObjectId(parentId),
      { $addToSet: { childIds: task._id } }
    );
  }

  // 6. Update assignee's sprint load if estimatedHours provided
  if (assigneeId && estimatedHours) {
    await UserModel.findByIdAndUpdate(
      new Types.ObjectId(assigneeId),
      { $inc: { 'capacity.currentSprintLoad': estimatedHours } }
    );
  }

  return task;
};

/**
 * Returns tasks for a project with optional filters.
 * Verifies project membership before returning any data.
 */
export const getTasks = async (
  query: TaskQueryInput,
  userId: Types.ObjectId
): Promise<ITask[]> => {
  const { projectId, status, assigneeId, type, sprintId, priority } = query;

  await assertProjectAccess(projectId, userId);

  // Build filter dynamically — only include fields that were provided
  const filter: Record<string, unknown> = {
    projectId: new Types.ObjectId(projectId),
  };

  if (status)     filter['status']     = status;
  if (type)       filter['type']       = type;
  if (priority)   filter['priority']   = priority;
  if (assigneeId) filter['assigneeId'] = new Types.ObjectId(assigneeId);
  if (sprintId)   filter['sprintId']   = new Types.ObjectId(sprintId);

  return TaskModel.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .populate('reporterId',  'name email avatarUrl')
    .populate('assigneeId',  'name email avatarUrl')
    .populate('watcherIds',  'name email avatarUrl')
    .lean();
};

/**
 * Returns a single task by ID.
 * Verifies the requesting user has access to the task's parent project.
 */
export const getTaskById = async (
  taskId: string,
  userId: Types.ObjectId
): Promise<ITask> => {
  const task = await TaskModel.findById(new Types.ObjectId(taskId))
    .populate('reporterId',  'name email avatarUrl')
    .populate('assigneeId',  'name email avatarUrl')
    .populate('watcherIds',  'name email avatarUrl');

  if (!task) throw new AppError('Task not found.', 404);

  await assertTaskAccess(task, userId);

  return task;
};

/**
 * Updates a task.
 * Logs every changed field into the activity log for the standup agent.
 */
export const updateTask = async (
  taskId: string,
  input: UpdateTaskInput,
  userId: Types.ObjectId,
  userName: string
): Promise<ITask> => {
  const task = await TaskModel.findById(new Types.ObjectId(taskId));
  if (!task) throw new AppError('Task not found.', 404);

  await assertTaskAccess(task, userId);

  const activityEntries: ITask['activityLog'][number][] = [];

  // Helper: log a field change and apply it
  const applyChange = <K extends keyof ITask>(
  field: K,
  newValue: ITask[K]
): void => {
  if (newValue !== undefined && task[field] !== newValue) {
    activityEntries.push({
      actorId:       userId,
      actorName:     userName,
      action:        `changed ${String(field)}`,
      field:         String(field),
      previousValue: String(task[field] ?? ''),
      nextValue:     String(newValue),
      isAIGenerated: false,
      timestamp:     new Date(),
    } as ITask['activityLog'][number]);
    (task as unknown as Record<string, unknown>)[field as string] = newValue;
  }
};

  if (input.title          !== undefined) applyChange('title',          input.title);
  if (input.description    !== undefined) applyChange('description',    input.description as ITask['description']);
  if (input.priority       !== undefined) applyChange('priority',       input.priority);
  if (input.storyPoints    !== undefined) applyChange('storyPoints',    input.storyPoints as ITask['storyPoints']);
  if (input.estimatedHours !== undefined) applyChange('estimatedHours', input.estimatedHours as ITask['estimatedHours']);
  if (input.actualHours    !== undefined) applyChange('actualHours',    input.actualHours as ITask['actualHours']);
  if (input.order          !== undefined) applyChange('order',          input.order);
  if (input.dueDate        !== undefined) {
    const newDate = input.dueDate ? new Date(input.dueDate) : undefined;
    applyChange('dueDate', newDate as ITask['dueDate']);
  }

  // Status change — pre-save hook handles startedAt/completedAt
  if (input.status !== undefined && input.status !== task.status) {
    activityEntries.push({
      actorId:       userId,
      actorName:     userName,
      action:        `moved to ${input.status}`,
      field:         'status',
      previousValue: task.status,
      nextValue:     input.status,
      isAIGenerated: false,
      timestamp:     new Date(),
    } as ITask['activityLog'][number]);
    task.status   = input.status;
    task.columnId = input.status; // Keep in sync
  }

  // Assignee change — update capacity load delta
  if (input.assigneeId !== undefined) {
    const prevAssigneeId = task.assigneeId?.toString();
    const newAssigneeId  = input.assigneeId ?? null;

    if (prevAssigneeId !== newAssigneeId) {
      activityEntries.push({
        actorId:       userId,
        actorName:     userName,
        action:        `reassigned task`,
        field:         'assigneeId',
        previousValue: prevAssigneeId ?? 'unassigned',
        nextValue:     newAssigneeId  ?? 'unassigned',
        isAIGenerated: false,
        timestamp:     new Date(),
      } as ITask['activityLog'][number]);

      // Decrease previous assignee's load
      if (prevAssigneeId && task.estimatedHours) {
        await UserModel.findByIdAndUpdate(
          prevAssigneeId,
          { $inc: { 'capacity.currentSprintLoad': -task.estimatedHours } }
        );
      }
      // Increase new assignee's load
      if (newAssigneeId && task.estimatedHours) {
        await UserModel.findByIdAndUpdate(
          newAssigneeId,
          { $inc: { 'capacity.currentSprintLoad': task.estimatedHours } }
        );
      }

      task.assigneeId = newAssigneeId
        ? new Types.ObjectId(newAssigneeId)
        : undefined;
    }
  }

  if (input.sprintId !== undefined) {
    task.sprintId = input.sprintId
      ? new Types.ObjectId(input.sprintId)
      : undefined;
  }

  if (input.tags !== undefined) task.tags = input.tags;

  // Push all activity entries in one operation
  if (activityEntries.length > 0) {
    task.activityLog.push(...activityEntries);
  }

  await task.save();
  return task;
};

/**
 * Deletes a task.
 * Only the reporter or a project owner/manager may delete.
 * Cleans up: removes from parent's childIds, decrements assignee load.
 */
export const deleteTask = async (
  taskId: string,
  userId: Types.ObjectId
): Promise<void> => {
  const task = await TaskModel.findById(new Types.ObjectId(taskId));
  if (!task) throw new AppError('Task not found.', 404);

  await assertTaskAccess(task, userId);

  // Only reporter or project owner/PM can delete
  const isReporter = task.reporterId.equals(userId);
  const project = await ProjectModel.findById(task.projectId).lean();
  const isOwnerOrPM =
    project?.ownerId.equals(userId) ||
    project?.members.some(
      (m) => m.userId.equals(userId) && m.role === 'project_manager'
    );

  if (!isReporter && !isOwnerOrPM) {
    throw new AppError(
      'Only the task reporter or a project manager can delete this task.',
      403
    );
  }

  await TaskModel.findByIdAndDelete(task._id);

  // Remove from parent's childIds
  if (task.parentId) {
    await TaskModel.findByIdAndUpdate(
      task.parentId,
      { $pull: { childIds: task._id } }
    );
  }

  // Decrement assignee capacity load
  if (task.assigneeId && task.estimatedHours) {
    await UserModel.findByIdAndUpdate(
      task.assigneeId,
      { $inc: { 'capacity.currentSprintLoad': -task.estimatedHours } }
    );
  }
};

/**
 * Adds a comment to a task.
 * Any project member may comment.
 */
export const addComment = async (
  taskId: string,
  input: AddCommentInput,
  userId: Types.ObjectId,
  userName: string
): Promise<ITask> => {
  const task = await TaskModel.findById(new Types.ObjectId(taskId));
  if (!task) throw new AppError('Task not found.', 404);

  await assertTaskAccess(task, userId);

  const comment: Partial<ITaskComment> = {
    authorId:      userId,
    authorName:    userName,
    body:          input.body,
    isAIGenerated: false,
    createdAt:     new Date(),
  };

  task.comments.push(comment as ITaskComment);

  task.activityLog.push({
    actorId:       userId,
    actorName:     userName,
    action:        'added a comment',
    isAIGenerated: false,
    timestamp:     new Date(),
  } as ITask['activityLog'][number]);

  await task.save();
  return task;
};