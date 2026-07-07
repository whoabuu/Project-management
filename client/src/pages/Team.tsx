import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserPlus,
  Search,
  Mail,
  Shield,
  MoreVertical,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Check,
  Clock,
  MapPin,
  Code2,
  BarChart3,
  Eye,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { projectService, type ProjectMember, type MemberRole } from '../services/projectService';
import { apiGet } from '../lib/api';

// ── Active project ────────────────────────────────────────────────────────────

const ACTIVE_PROJECT_ID =
  (import.meta.env['VITE_DEMO_PROJECT_ID'] as string) || '';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NormalizedMember {
  id:           string;
  name:         string;
  email:        string;
  role:         string;
  memberRole:   MemberRole | 'owner';
  avatarUrl?:   string | null;
  skills:       string[];
  isAvailable:  boolean;
  sprintLoad:   number;
  weeklyHours:  number;
  timezone:     string;
  joinedAt?:    string;
  isOwner:      boolean;
}

interface UserSearchResult {
  _id:   string;
  name:  string;
  email: string;
  role:  string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const MEMBER_ROLE_CONFIG: Record<string, {
  label:  string;
  icon:   React.ReactNode;
  badge:  string;
}> = {
  owner:           { label: 'Owner',           icon: <Shield size={10} />,    badge: 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400'         },
  project_manager: { label: 'Project Manager', icon: <BarChart3 size={10} />, badge: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  developer:       { label: 'Developer',       icon: <Code2 size={10} />,     badge: 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400'         },
  viewer:          { label: 'Viewer',          icon: <Eye size={10} />,       badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'     },
};

const AVATAR_GRADIENTS = [
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-600',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name?: string): string => {
  if (!name?.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? 'U').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

const hashGradient = (str: string): string => {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length]!;
};

const formatJoinDate = (iso?: string): string => {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const normalizeOwner = (
  owner: Awaited<ReturnType<typeof projectService.getProjectMembers>>['owner']
): NormalizedMember => ({
  id:          owner._id,
  name:        owner.name,
  email:       owner.email,
  role:        owner.role,
  memberRole:  'owner',
  avatarUrl:   owner.avatarUrl,
  skills:      owner.capacity.skills,
  isAvailable: owner.capacity.isAvailable,
  sprintLoad:  owner.capacity.currentSprintLoad,
  weeklyHours: owner.capacity.weeklyHoursAvailable,
  timezone:    owner.capacity.timezone,
  isOwner:     true,
});

const normalizeMember = (m: ProjectMember): NormalizedMember => ({
  id:          m.userId._id,
  name:        m.userId.name,
  email:       m.userId.email,
  role:        m.userId.role,
  memberRole:  m.role,
  avatarUrl:   m.userId.avatarUrl,
  skills:      m.userId.capacity.skills,
  isAvailable: m.userId.capacity.isAvailable,
  sprintLoad:  m.userId.capacity.currentSprintLoad,
  weeklyHours: m.userId.capacity.weeklyHoursAvailable,
  timezone:    m.userId.capacity.timezone,
  joinedAt:    m.joinedAt,
  isOwner:     false,
});

// ── Skeleton Card ─────────────────────────────────────────────────────────────

const MemberCardSkeleton = () => (
  <div className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div className="h-1 bg-slate-200 dark:bg-slate-700 animate-pulse" />
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md w-3/4" />
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-1/2" />
        </div>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-full" />
      <div className="h-2 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md w-2/3" />
    </div>
  </div>
);

// ── Capacity Bar ──────────────────────────────────────────────────────────────

const CapacityBar = ({ load, total }: { load: number; total: number }) => {
  const pct     = total > 0 ? Math.min(Math.round((load / total) * 100), 100) : 0;
  const isFull  = pct >= 90;
  const isHigh  = pct >= 70;
  const color   = isFull ? 'from-red-400 to-red-500'
    : isHigh  ? 'from-amber-400 to-amber-500'
    : 'from-sky-400 to-emerald-400';
  const text    = isFull ? 'text-red-500 dark:text-red-400'
    : isHigh  ? 'text-amber-500 dark:text-amber-400'
    : 'text-sky-600 dark:text-sky-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-500">Sprint Load</span>
        <span className={`text-[11px] font-bold tabular-nums ${text}`}>{load}h / {total}h</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ── Member Card ───────────────────────────────────────────────────────────────

const MemberCard = ({
  member,
  onRemove,
  currentUserId,
}: {
  member:        NormalizedMember;
  onRemove:      (id: string, name: string) => void;
  currentUserId?: string;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleConf = MEMBER_ROLE_CONFIG[member.memberRole] ?? MEMBER_ROLE_CONFIG['viewer']!;
  const gradient = hashGradient(member.id);
  const isSelf   = member.id === currentUserId;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="
      group flex flex-col rounded-2xl overflow-hidden
      bg-white dark:bg-slate-900
      border border-slate-200 dark:border-slate-800
      hover:border-sky-300 dark:hover:border-sky-500/40
      hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/80
      transition-all duration-250 ease-out
    ">
      {/* Top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar */}
          <div className="relative shrink-0">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="w-12 h-12 rounded-2xl object-cover"
              />
            ) : (
              <div className={`
                flex items-center justify-center w-12 h-12 rounded-2xl
                bg-gradient-to-br ${gradient}
                text-white text-[15px] font-bold shadow-sm
              `}>
                {getInitials(member.name)}
              </div>
            )}
            {/* Availability dot */}
            <span className={`
              absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full
              ring-2 ring-white dark:ring-slate-900
              ${member.isAvailable ? 'bg-emerald-400' : 'bg-slate-400'}
            `} />
          </div>

          {/* Name + email */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[14.5px] font-semibold leading-tight text-slate-900 dark:text-slate-50 truncate">
                {member.name}
              </h3>
              {isSelf && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  You
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-400 dark:text-slate-600 mt-0.5 truncate">
              {member.email}
            </p>
          </div>
        </div>

        {/* Actions menu */}
        {!member.isOwner && !isSelf && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Member options"
              className="
                opacity-0 group-hover:opacity-100
                flex items-center justify-center w-7 h-7 rounded-lg
                hover:bg-slate-100 dark:hover:bg-slate-800
                text-slate-400 dark:text-slate-600
                transition-all duration-150
                focus-visible:opacity-100 focus-visible:outline-none
              "
            >
              <MoreVertical size={15} />
            </button>

            {menuOpen && (
              <div className="
                absolute right-0 top-full mt-1.5 z-20 w-44 py-1 rounded-xl
                bg-white dark:bg-slate-900
                border border-slate-200 dark:border-slate-700
                shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60
              ">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Shield size={13} className="text-slate-400" />
                  Change Role
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1" />
                <button
                  onClick={() => { setMenuOpen(false); onRemove(member.id, member.name); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <X size={13} />
                  Remove from Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role badge + availability */}
      <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-semibold ${roleConf.badge}`}>
          {roleConf.icon}
          {roleConf.label}
        </span>
        <span className={`flex items-center gap-1 text-[11px] font-medium ${member.isAvailable ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${member.isAvailable ? 'bg-emerald-400' : 'bg-slate-400'}`} />
          {member.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5" />

      {/* Skills */}
      <div className="px-5 py-3.5 space-y-1.5">
        <p className="text-[10.5px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-600">Skills</p>
        {member.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {member.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] font-medium text-slate-600 dark:text-slate-400"
              >
                {skill}
              </span>
            ))}
            {member.skills.length > 4 && (
              <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10.5px] font-medium text-slate-400 dark:text-slate-600">
                +{member.skills.length - 4}
              </span>
            )}
          </div>
        ) : (
          <p className="text-[11.5px] text-slate-300 dark:text-slate-700">No skills listed</p>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5" />

      {/* Capacity */}
      <div className="px-5 py-3.5">
        <CapacityBar load={member.sprintLoad} total={member.weeklyHours} />
      </div>

      {/* Footer */}
      <div className="
        mt-auto px-5 py-3
        border-t border-slate-100 dark:border-slate-800
        bg-slate-50 dark:bg-slate-900/50
        flex items-center justify-between
      ">
        <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-600">
          <Clock size={10} />{member.timezone}
        </span>
        {member.joinedAt && (
          <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-600">
            <MapPin size={10} />Joined {formatJoinDate(member.joinedAt)}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Invite Member Modal ───────────────────────────────────────────────────────

interface InviteModalProps {
  projectId: string;
  onClose:   () => void;
  onSuccess: () => void;
}

const InviteMemberModal = ({ projectId, onClose, onSuccess }: InviteModalProps) => {
  const [email,         setEmail]         = useState('');
  const [role,          setRole]          = useState<MemberRole>('developer');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser,  setSelectedUser]  = useState<UserSearchResult | null>(null);
  const [isSearching,   setIsSearching]   = useState(false);
  const [isInviting,    setIsInviting]    = useState(false);
  const [searchError,   setSearchError]   = useState<string | null>(null);
  const [inviteError,   setInviteError]   = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Debounced user search
  useEffect(() => {
    if (!email.trim() || email.length < 2) {
      setSearchResults([]);
      setSelectedUser(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const result = await apiGet<{ users: UserSearchResult[] }>('/users', { q: email, limit: 5 });
        setSearchResults(result.data.users);
        if (result.data.users.length === 0) {
          setSearchError('No Nexus users found matching this email. They must register first.');
        }
      } catch {
        setSearchError('User search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser && searchResults.length === 0) {
      setInviteError('Please search for and select a user to invite.');
      return;
    }

    const target = selectedUser ?? searchResults[0];
    if (!target) {
      setInviteError('No user selected.');
      return;
    }

    setIsInviting(true);
    setInviteError(null);

    try {
      await projectService.inviteMember(projectId, target._id, role);
      setInviteSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('[InviteModal] inviteMember failed:', err);
      setInviteError('Could not invite this user. They may already be a member.');
    } finally {
      setIsInviting(false);
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog" aria-labelledby="invite-modal-title">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500 shadow-sm shadow-sky-500/30">
              <UserPlus size={15} className="text-white" />
            </div>
            <h2 id="invite-modal-title" className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
              Invite Team Member
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void handleInvite(e)} noValidate>
          <div className="px-6 py-5 space-y-4">

            {/* Success state */}
            {inviteSuccess && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[13px] font-medium">
                <CheckCircle2 size={15} className="shrink-0" />
                Member invited successfully! Refreshing…
              </div>
            )}

            {/* Invite error */}
            {inviteError && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-[13px] font-medium">
                <AlertCircle size={14} className="shrink-0" />{inviteError}
              </div>
            )}

            {/* Email search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Search by Name or Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSelectedUser(null); setInviteError(null); }}
                  placeholder="Search name or email address…"
                  className={`${INPUT_BASE} pl-10 pr-9`}
                />
                {isSearching && (
                  <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                )}
              </div>

              {/* Search results */}
              {searchResults.length > 0 && !selectedUser && (
                <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                  {searchResults.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => { setSelectedUser(u); setEmail(u.email); setSearchResults([]); }}
                      className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${hashGradient(u._id)} text-white text-[11px] font-bold shrink-0`}>
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                        <p className="text-[11.5px] text-slate-400 dark:text-slate-600 truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected user chip */}
              {selectedUser && (
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${hashGradient(selectedUser._id)} text-white text-[11px] font-bold shrink-0`}>
                    {getInitials(selectedUser.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-sky-700 dark:text-sky-400 truncate">{selectedUser.name}</p>
                    <p className="text-[11.5px] text-sky-600/70 dark:text-sky-400/60 truncate">{selectedUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setEmail(''); }}
                    className="text-sky-400 hover:text-sky-600 transition-colors"
                    aria-label="Clear selection"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Search hint */}
              {searchError && (
                <p className="text-[12px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle size={11} />{searchError}
                </p>
              )}
            </div>

            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Assign Role
              </label>
              <div className="flex flex-col gap-2">
                {([
                  { value: 'project_manager', label: 'Project Manager', desc: 'Plan sprints, manage team' },
                  { value: 'developer',       label: 'Developer',       desc: 'Build features & fix bugs' },
                  { value: 'viewer',          label: 'Viewer',          desc: 'View-only board access'    },
                ] as { value: MemberRole; label: string; desc: string }[]).map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left
                      border transition-all duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                      ${role === r.value
                        ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-400 dark:border-sky-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    <span className={`
                      w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all
                      ${role === r.value ? 'border-sky-500 bg-sky-500' : 'border-slate-300 dark:border-slate-600'}
                    `}>
                      {role === r.value && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-medium leading-tight ${role === r.value ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {r.label}
                      </p>
                      <p className="text-[11.5px] text-slate-400 dark:text-slate-600 mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isInviting}
              className="px-4 py-2 rounded-xl text-[13.5px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInviting || inviteSuccess || (!selectedUser && searchResults.length === 0)}
              className="
                flex items-center gap-2 px-5 py-2 rounded-xl
                text-[13.5px] font-semibold text-white
                bg-sky-500 hover:bg-sky-600
                disabled:bg-sky-300 dark:disabled:bg-sky-800 disabled:cursor-not-allowed
                shadow-sm shadow-sky-500/30
                hover:scale-[1.02] active:scale-[0.98] disabled:scale-100
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              "
            >
              {inviteSuccess ? (
                <><Check size={14} />Invited!</>
              ) : isInviting ? (
                <><Loader2 size={14} className="animate-spin" />Inviting…</>
              ) : (
                <><UserPlus size={14} />Send Invite</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Remove Confirm Dialog ─────────────────────────────────────────────────────

const RemoveConfirmDialog = ({
  memberName,
  onConfirm,
  onCancel,
  isRemoving,
}: {
  memberName: string;
  onConfirm:  () => void;
  onCancel:   () => void;
  isRemoving: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="alertdialog">
    <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-500/15 shrink-0">
          <AlertCircle size={18} className="text-red-500 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-50">Remove Member</h3>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-500 mt-0.5">
            Remove <span className="font-semibold text-slate-700 dark:text-slate-300">{memberName}</span> from this project?
          </p>
        </div>
      </div>
      <p className="text-[12.5px] text-slate-500 dark:text-slate-500">
        They will lose access to all project boards and tasks. This action cannot be undone.
      </p>
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onCancel} disabled={isRemoving} className="flex-1 py-2 rounded-xl text-[13px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={isRemoving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors">
          {isRemoving ? <><Loader2 size={13} className="animate-spin" />Removing…</> : 'Remove'}
        </button>
      </div>
    </div>
  </div>
);

// ── Team Stats Bar ────────────────────────────────────────────────────────────

const TeamStats = ({ members }: { members: NormalizedMember[] }) => {
  const available = members.filter((m) => m.isAvailable).length;
  const totalCap  = members.reduce((s, m) => s + m.weeklyHours, 0);
  const usedCap   = members.reduce((s, m) => s + m.sprintLoad,  0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Total Members',  value: members.length,            color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10'          },
        { label: 'Available Now',  value: available,                 color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
        { label: 'Busy',           value: members.length - available, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'     },
        { label: 'Free Hours',     value: `${totalCap - usedCap}h`,  color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10'  },
      ].map((s) => (
        <div key={s.label} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
          <span className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ${s.color}`}>
            <Users size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-[18px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-tight">{s.value}</p>
            <p className="text-[10.5px] text-slate-400 dark:text-slate-600 truncate">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Team = () => {
  const [members,     setMembers]     = useState<NormalizedMember[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState<'all' | MemberRole | 'owner'>('all');
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving,   setIsRemoving]   = useState(false);

  // ── Fetch members ───────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!ACTIVE_PROJECT_ID) {
      setLoadError('No active project ID configured. Set VITE_DEMO_PROJECT_ID in your .env file.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const { members: raw, owner } = await projectService.getProjectMembers(ACTIVE_PROJECT_ID);
      const ownerNorm = normalizeOwner(owner);
      const memberNorm = raw.map(normalizeMember);

      // Owner first, then sort members alphabetically
      setMembers([
        ownerNorm,
        ...memberNorm.sort((a, b) => a.name.localeCompare(b.name)),
      ]);
    } catch (err) {
      console.error('[Team] fetchMembers failed:', err);
      setLoadError('Could not load team members. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMembers(); }, [fetchMembers]);

  // ── Remove member ───────────────────────────────────────────────────────────
  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);

    try {
      await projectService.removeMember(ACTIVE_PROJECT_ID, removeTarget.id);
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch (err) {
      console.error('[Team] removeMember failed:', err);
    } finally {
      setIsRemoving(false);
    }
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.skills.some((s) => s.toLowerCase().includes(q));
    const matchRole = roleFilter === 'all' || m.memberRole === roleFilter;
    return matchSearch && matchRole;
  });

  const ROLE_FILTERS: { key: 'all' | MemberRole | 'owner'; label: string }[] = [
    { key: 'all',             label: 'All'     },
    { key: 'owner',           label: 'Owner'   },
    { key: 'project_manager', label: 'PM'      },
    { key: 'developer',       label: 'Dev'     },
    { key: 'viewer',          label: 'Viewer'  },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold text-slate-900 dark:text-slate-50">
              Team Directory
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-400 dark:text-slate-600">
              {isLoading ? 'Loading team…' : `${members.length} member${members.length !== 1 ? 's' : ''} in this project`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchMembers()}
              disabled={isLoading}
              aria-label="Refresh team"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 hover:text-sky-500 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-600 disabled:opacity-50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-[13px] font-medium shadow-sm shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <UserPlus size={15} />
              <span className="hidden sm:inline">Invite Member</span>
            </button>
          </div>
        </div>

        {/* ── Load error ────────────────────────────────────── */}
        {loadError && !isLoading && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
            <AlertCircle size={15} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{loadError}</p>
              <button onClick={() => void fetchMembers()} className="text-[12px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 mt-1 transition-colors">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Stats ─────────────────────────────────────────── */}
        {!isLoading && members.length > 0 && <TeamStats members={members} />}

        {/* ── Search + Filter bar ───────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email or skill…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full pl-9 pr-4 h-9 rounded-xl
                bg-white dark:bg-slate-900
                border border-slate-200 dark:border-slate-700
                text-[13px] text-slate-700 dark:text-slate-300
                placeholder:text-slate-400 dark:placeholder:text-slate-600
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent
                transition-all duration-150
              "
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" aria-label="Clear">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Role filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setRoleFilter(f.key)}
                className={`
                  px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                  ${roleFilter === f.key
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Member grid ───────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <MemberCardSkeleton key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onRemove={(id, name) => setRemoveTarget({ id, name })}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-300 dark:text-slate-700">
            <Search size={32} />
            <p className="text-[14px] font-medium text-slate-400 dark:text-slate-600">
              No team members match "{search}"
            </p>
            <button onClick={() => { setSearch(''); setRoleFilter('all'); }} className="text-[13px] font-medium text-sky-500 hover:text-sky-600 transition-colors">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ── Invite Modal ──────────────────────────────────── */}
      {isInviteOpen && (
        <InviteMemberModal
          projectId={ACTIVE_PROJECT_ID}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => void fetchMembers()}
        />
      )}

      {/* ── Remove Confirm ────────────────────────────────── */}
      {removeTarget && (
        <RemoveConfirmDialog
          memberName={removeTarget.name}
          onConfirm={() => void handleRemoveConfirm()}
          onCancel={() => setRemoveTarget(null)}
          isRemoving={isRemoving}
        />
      )}
    </>
  );
};

export default Team;