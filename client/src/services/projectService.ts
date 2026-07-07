import { apiGet, apiPost } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemberRole = 'project_manager' | 'developer' | 'viewer';

/**
 * A populated project member — the backend returns the full User document
 * embedded inside the project's `members` array after .populate('members.userId').
 */
export interface ProjectMember {
  userId: {
    _id:       string;
    name:      string;
    email:     string;
    role:      string;
    avatarUrl?: string | null;
    capacity: {
      skills:               string[];
      isAvailable:          boolean;
      weeklyHoursAvailable: number;
      currentSprintLoad:    number;
      timezone:             string;
    };
    createdAt: string;
  };
  role:     MemberRole;
  joinedAt: string;
}

interface GetMembersResponse {
  project: {
    _id:     string;
    name:    string;
    members: ProjectMember[];
    ownerId: {
      _id:      string;
      name:     string;
      email:    string;
      role:     string;
      avatarUrl?: string | null;
      capacity: {
        skills:               string[];
        isAvailable:          boolean;
        weeklyHoursAvailable: number;
        currentSprintLoad:    number;
        timezone:             string;
      };
      createdAt: string;
    };
  };
}

interface InviteMemberResponse {
  project: {
    _id:     string;
    members: ProjectMember[];
  };
}

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Fetches all members of a project, including the owner.
 * Hits GET /projects/:projectId to get the fully populated project document.
 */
export const getProjectMembers = async (
  projectId: string
): Promise<{ members: ProjectMember[]; owner: GetMembersResponse['project']['ownerId'] }> => {
  const result = await apiGet<GetMembersResponse>(`/projects/${projectId}`);
  return {
    members: result.data.project.members,
    owner:   result.data.project.ownerId,
  };
};

/**
 * Invites a user to the project by their userId.
 * Hits POST /projects/:projectId/members.
 *
 * The invite flow for Phase 3 uses userId (not email directly) because
 * the user must already have a Nexus account. The Team page's invite modal
 * performs a user search first, then passes the resolved userId here.
 *
 * Note: once a backend /projects/:id/invite-by-email route exists, this
 * can be updated to POST { email } directly.
 */
export const inviteMember = async (
  projectId: string,
  userId:    string,
  role:      MemberRole = 'developer'
): Promise<InviteMemberResponse> => {
  const result = await apiPost<InviteMemberResponse>(
    `/projects/${projectId}/members`,
    { userId, role }
  );
  return result.data;
};

/**
 * Removes a member from the project.
 * Hits DELETE /projects/:projectId/members/:userId.
 */
export const removeMember = async (
  projectId: string,
  userId:    string
): Promise<void> => {
  await apiPost(`/projects/${projectId}/members/${userId}/remove`, {});
};

export const projectService = {
  getProjectMembers,
  inviteMember,
  removeMember,
};

export default projectService;