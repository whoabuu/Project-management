import { Types } from 'mongoose';
import { ProjectModel, IProject, IProjectMember } from '../../models/Project.model';
import { UserModel } from '../../models/User.model';
import { AppError } from '../../middleware/error.middleware';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
} from './project.routes';

// ── Access Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the project if the requesting user is the owner OR a member.
 * Throws 404 (not 403) deliberately — we don't confirm the project exists
 * to users who have no access to it, preventing enumeration.
 */
// const getAccessibleProject = async (
//   projectId: string,
//   userId: Types.ObjectId
// ): Promise<IProject> => {
//   const project = await ProjectModel.findOne({
//     _id: new Types.ObjectId(projectId),
//     $or: [
//       { ownerId: userId },
//       { 'members.userId': userId },
//     ],
//   });

//   if (!project) {
//     throw new AppError('Project not found.', 404);
//   }

//   return project;
// };

/**
 * Returns the project only if the requesting user is the owner.
 * Used for destructive or privileged operations (delete, remove member).
 */
const getOwnedProject = async (
  projectId: string,
  userId: Types.ObjectId
): Promise<IProject> => {
  const project = await ProjectModel.findOne({
    _id: new Types.ObjectId(projectId),
    ownerId: userId,
  });

  if (!project) {
    throw new AppError(
      'Project not found or you do not have permission to perform this action.',
      404
    );
  }

  return project;
};

/**
 * Returns the project if the requesting user is the owner OR a project_manager.
 * Used for update operations.
 */
const getManageableProject = async (
  projectId: string,
  userId: Types.ObjectId
): Promise<IProject> => {
  const project = await ProjectModel.findOne({
    _id: new Types.ObjectId(projectId),
    $or: [
      { ownerId: userId },
      { 'members': { $elemMatch: { userId, role: 'project_manager' } } },
    ],
  });

  if (!project) {
    throw new AppError(
      'Project not found or you do not have permission to manage this project.',
      404
    );
  }

  return project;
};

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Creates a new project.
 * The requesting user is automatically set as the owner.
 */
export const createProject = async (
  input: CreateProjectInput,
  ownerId: Types.ObjectId
): Promise<IProject> => {
  const { name, description, status, techStack, domainDescription } = input;

  const project = await ProjectModel.create({
    name,
    description,
    status,
    ownerId,
    members: [],
    aiContext: {
      techStack:         techStack ?? [],
      domainDescription: domainDescription ?? '',
      preferredLanguage: 'en',
      standupSummaryHistory: [],
      embeddingModel: 'text-embedding-3-small',
    },
  });

  // Add the project to the owner's projectIds array
  await UserModel.findByIdAndUpdate(
    ownerId,
    { $addToSet: { projectIds: project._id } }
  );

  return project;
};

/**
 * Returns all projects where the user is the owner OR a member.
 * Results are sorted by most recently updated.
 */
export const getProjectsForUser = async (
  userId: Types.ObjectId
): Promise<IProject[]> => {
  return ProjectModel.find({
    $or: [
      { ownerId: userId },
      { 'members.userId': userId },
    ],
  })
    .sort({ updatedAt: -1 })
    .populate('ownerId', 'name email avatarUrl')
    .populate('members.userId', 'name email avatarUrl')
    .lean();
};

/**
 * Returns a single project by ID — only if the user has access.
 */
export const getProjectById = async (
  projectId: string,
  userId: Types.ObjectId
): Promise<IProject> => {
  // Use the raw query here to also populate after access check
  const project = await ProjectModel.findOne({
    _id: new Types.ObjectId(projectId),
    $or: [
      { ownerId: userId },
      { 'members.userId': userId },
    ],
  })
    .populate('ownerId', 'name email avatarUrl')
    .populate('members.userId', 'name email avatarUrl');

  if (!project) {
    throw new AppError('Project not found.', 404);
  }

  return project;
};

/**
 * Updates mutable project fields.
 * Only the owner or a project_manager may update.
 */
export const updateProject = async (
  projectId: string,
  input: UpdateProjectInput,
  userId: Types.ObjectId
): Promise<IProject> => {
  const project = await getManageableProject(projectId, userId);

  const { name, description, status, techStack, domainDescription } = input;

  if (name               !== undefined) project.name        = name;
  if (description        !== undefined) project.description = description;
  if (status             !== undefined) project.status      = status;
  if (techStack          !== undefined) project.aiContext.techStack         = techStack;
  if (domainDescription  !== undefined) project.aiContext.domainDescription = domainDescription;

  await project.save();
  return project;
};

/**
 * Permanently deletes a project.
 * Only the owner may delete. Does NOT cascade-delete tasks in this phase —
 * that will be handled by a Task module cleanup hook in Phase 6.
 */
export const deleteProject = async (
  projectId: string,
  userId: Types.ObjectId
): Promise<void> => {
  const project = await getOwnedProject(projectId, userId);

  await ProjectModel.findByIdAndDelete(project._id);

  // Remove the project reference from the owner's projectIds
  await UserModel.findByIdAndUpdate(
    userId,
    { $pull: { projectIds: project._id } }
  );
};

/**
 * Adds a user to the project's members list.
 * Only the owner or project_manager may add members.
 * Prevents adding the owner as a member (they have implicit full access).
 * Prevents duplicate member entries.
 */
export const addMember = async (
  projectId: string,
  input: AddMemberInput,
  requesterId: Types.ObjectId
): Promise<IProject> => {
  const project = await getManageableProject(projectId, requesterId);

  const targetUserId = new Types.ObjectId(input.userId);

  // Cannot add the owner as an explicit member
  if (project.ownerId.equals(targetUserId)) {
    throw new AppError('The project owner already has full access.', 400);
  }

  // Check target user exists
  const targetUser = await UserModel.findById(targetUserId).lean();
  if (!targetUser) {
    throw new AppError('User not found.', 404);
  }

  // Prevent duplicates
  const alreadyMember = project.members.some((m) =>
    m.userId.equals(targetUserId)
  );
  if (alreadyMember) {
    throw new AppError('User is already a member of this project.', 409);
  }

  const newMember: IProjectMember = {
    userId:   targetUserId,
    role:     input.role,
    joinedAt: new Date(),
  };

  project.members.push(newMember);
  await project.save();

  // Keep the user's projectIds in sync
  await UserModel.findByIdAndUpdate(
    targetUserId,
    { $addToSet: { projectIds: project._id } }
  );

  return project;
};

/**
 * Removes a member from the project.
 * Only the owner may remove members.
 * The owner cannot remove themselves.
 */
export const removeMember = async (
  projectId: string,
  targetUserIdStr: string,
  requesterId: Types.ObjectId
): Promise<IProject> => {
  const project = await getOwnedProject(projectId, requesterId);

  const targetUserId = new Types.ObjectId(targetUserIdStr);

  if (project.ownerId.equals(targetUserId)) {
    throw new AppError('Cannot remove the project owner from the project.', 400);
  }

  const memberIndex = project.members.findIndex((m) =>
    m.userId.equals(targetUserId)
  );

  if (memberIndex === -1) {
    throw new AppError('User is not a member of this project.', 404);
  }

  project.members.splice(memberIndex, 1);
  await project.save();

  // Remove project reference from the removed user's projectIds
  await UserModel.findByIdAndUpdate(
    targetUserId,
    { $pull: { projectIds: project._id } }
  );

  return project;
};