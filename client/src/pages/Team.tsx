import { useState } from 'react';
import {
  UserPlus,
  Search,
  MapPin,
  Clock,
  Zap,
  CheckCircle2,
  Circle,
  Mail,
  MoreHorizontal,
  Shield,
  Code2,
  //Palette,
  Brain,
  BarChart3,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type MemberRole   = 'admin' | 'project_manager' | 'developer' | 'viewer';
type Availability = 'available' | 'busy' | 'away';

interface ActiveTask {
  title:   string;
  epic:    string;
  type:    'epic' | 'story' | 'task' | 'bug';
}

interface TeamMember {
  id:               string;
  name:             string;
  initials:         string;
  avatarGradient:   string;
  jobTitle:         string;
  role:             MemberRole;
  timezone:         string;
  location:         string;
  skills:           string[];
  weeklyHours:      number;
  allocatedHours:   number;
  availability:     Availability;
  activeTask:       ActiveTask | null;
  email:            string;
  joinedSprint:     number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<MemberRole, {
  label:  string;
  icon:   React.ReactNode;
  badge:  string;
}> = {
  admin: {
    label: 'Admin',
    icon:  <Shield size={10} />,
    badge: 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400',
  },
  project_manager: {
    label: 'Project Manager',
    icon:  <BarChart3 size={10} />,
    badge: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
  },
  developer: {
    label: 'Developer',
    icon:  <Code2 size={10} />,
    badge: 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
  viewer: {
    label: 'Viewer',
    icon:  <Circle size={10} />,
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  },
};

const AVAILABILITY_CONFIG: Record<Availability, {
  dot:   string;
  label: string;
  text:  string;
}> = {
  available: { dot: 'bg-emerald-400', label: 'Available',  text: 'text-emerald-500 dark:text-emerald-400' },
  busy:      { dot: 'bg-amber-400',   label: 'Busy',       text: 'text-amber-500 dark:text-amber-400'    },
  away:      { dot: 'bg-slate-400',   label: 'Away',       text: 'text-slate-400 dark:text-slate-600'    },
};

const TASK_TYPE_COLOR = {
  epic:  'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
  story: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10',
  task:  'text-slate-500 bg-slate-100 dark:bg-slate-800',
  bug:   'text-red-500 bg-red-50 dark:bg-red-500/10',
};

// ── Mock Data ─────────────────────────────────────────────────────────────────

const TEAM_MEMBERS: TeamMember[] = [
  {
    id:             '1',
    name:           'Abu Bakar Tamboli',
    initials:       'AB',
    avatarGradient: 'from-sky-400 to-indigo-500',
    jobTitle:       'Full Stack Engineer',
    role:           'admin',
    timezone:       'IST (UTC+5:30)',
    location:       'Nashik, India',
    skills:         ['Node.js', 'React', 'MongoDB', 'TypeScript'],
    weeklyHours:    40,
    allocatedHours: 31,
    availability:   'busy',
    email:          'abu@nexus.dev',
    joinedSprint:   1,
    activeTask: {
      title: 'Implement Kanban drag-and-drop with dnd-kit',
      epic:  'Board UI',
      type:  'story',
    },
  },
  {
    id:             '2',
    name:           'Sara Reyhan',
    initials:       'SR',
    avatarGradient: 'from-emerald-400 to-teal-500',
    jobTitle:       'AI / ML Engineer',
    role:           'developer',
    timezone:       'CET (UTC+1)',
    location:       'Berlin, Germany',
    skills:         ['LangChain', 'Python', 'React', 'Groq'],
    weeklyHours:    40,
    allocatedHours: 24,
    availability:   'available',
    email:          'sara@nexus.dev',
    joinedSprint:   1,
    activeTask: {
      title: 'Integrate Groq LLM with structured output schema',
      epic:  'AI Module',
      type:  'task',
    },
  },
  {
    id:             '3',
    name:           'Mikael Kvist',
    initials:       'MK',
    avatarGradient: 'from-amber-400 to-orange-500',
    jobTitle:       'UI / UX Designer',
    role:           'developer',
    timezone:       'CEST (UTC+2)',
    location:       'Stockholm, Sweden',
    skills:         ['Figma', 'Tailwind', 'React', 'Motion'],
    weeklyHours:    32,
    allocatedHours: 18,
    availability:   'available',
    email:          'mikael@nexus.dev',
    joinedSprint:   2,
    activeTask: {
      title: 'Design team member invite modal with role selector',
      epic:  'Team UX',
      type:  'story',
    },
  },
  {
    id:             '4',
    name:           'Zara Khan',
    initials:       'ZK',
    avatarGradient: 'from-violet-400 to-purple-600',
    jobTitle:       'Backend Engineer',
    role:           'developer',
    timezone:       'PKT (UTC+5)',
    location:       'Karachi, Pakistan',
    skills:         ['Node.js', 'MongoDB', 'Redis', 'Docker'],
    weeklyHours:    40,
    allocatedHours: 38,
    availability:   'busy',
    email:          'zara@nexus.dev',
    joinedSprint:   1,
    activeTask: {
      title: 'Set up Atlas Vector Search index for RAG pipeline',
      epic:  'RAG Pipeline',
      type:  'task',
    },
  },
  {
    id:             '5',
    name:           'Leo Martins',
    initials:       'LM',
    avatarGradient: 'from-rose-400 to-pink-600',
    jobTitle:       'Project Manager',
    role:           'project_manager',
    timezone:       'BRT (UTC-3)',
    location:       'São Paulo, Brazil',
    skills:         ['Agile', 'Jira', 'Confluence', 'OKRs'],
    weeklyHours:    40,
    allocatedHours: 12,
    availability:   'available',
    email:          'leo@nexus.dev',
    joinedSprint:   1,
    activeTask: {
      title: 'Sprint 4 planning and backlog grooming',
      epic:  'Sprint Ops',
      type:  'epic',
    },
  },
  {
    id:             '6',
    name:           'Priya Nair',
    initials:       'PN',
    avatarGradient: 'from-cyan-400 to-sky-600',
    jobTitle:       'QA Engineer',
    role:           'developer',
    timezone:       'IST (UTC+5:30)',
    location:       'Bangalore, India',
    skills:         ['Playwright', 'Vitest', 'Cypress', 'TypeScript'],
    weeklyHours:    40,
    allocatedHours: 0,
    availability:   'away',
    email:          'priya@nexus.dev',
    joinedSprint:   3,
    activeTask:     null,
  },
];

// ── Capacity Bar ──────────────────────────────────────────────────────────────

const CapacityBar = ({
  allocated,
  total,
}: {
  allocated: number;
  total:     number;
}) => {
  const pct     = Math.min(Math.round((allocated / total) * 100), 100);
  const isFull  = pct >= 90;
  const isHigh  = pct >= 70;

  const barColor = isFull
    ? 'from-red-400 to-red-500'
    : isHigh
    ? 'from-amber-400 to-amber-500'
    : 'from-sky-400 to-emerald-400';

  const textColor = isFull
    ? 'text-red-500 dark:text-red-400'
    : isHigh
    ? 'text-amber-500 dark:text-amber-400'
    : 'text-sky-600 dark:text-sky-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-500">
          Sprint Load
        </span>
        <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>
          {allocated}h / {total}h
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-slate-400 dark:text-slate-600">
          {total - allocated}h available
        </span>
        <span className={`text-[10px] font-semibold ${textColor}`}>
          {pct}% allocated
        </span>
      </div>
    </div>
  );
};

// ── Skill Tag ─────────────────────────────────────────────────────────────────

const SkillTag = ({ label }: { label: string }) => (
  <span className="
    px-2 py-0.5 rounded-lg
    bg-slate-100 dark:bg-slate-800
    border border-slate-200 dark:border-slate-700
    text-[10.5px] font-medium
    text-slate-600 dark:text-slate-400
  ">
    {label}
  </span>
);

// ── Member Card ───────────────────────────────────────────────────────────────

const MemberCard = ({ member }: { member: TeamMember }) => {
  const role         = ROLE_CONFIG[member.role];
  const availability = AVAILABILITY_CONFIG[member.availability];
  //const freeHours    = member.weeklyHours - member.allocatedHours;

  return (
    <div className="
      group flex flex-col
      rounded-2xl overflow-hidden
      bg-white dark:bg-slate-900
      border border-slate-200 dark:border-slate-800
      hover:border-sky-300 dark:hover:border-sky-500/40
      hover:-translate-y-1
      hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/80
      transition-all duration-250 ease-out
    ">

      {/* ── Card top accent bar ── */}
      <div className={`h-1 w-full bg-gradient-to-r ${member.avatarGradient}`} />

      {/* ── Card header ── */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={`
              flex items-center justify-center
              w-12 h-12 rounded-2xl
              bg-gradient-to-br ${member.avatarGradient}
              text-white text-[15px] font-bold
              shadow-sm
            `}>
              {member.initials}
            </div>
            {/* Availability dot */}
            <span className={`
              absolute -bottom-0.5 -right-0.5
              w-3.5 h-3.5 rounded-full
              ${availability.dot}
              ring-2 ring-white dark:ring-slate-900
            `} />
          </div>

          {/* Name + title */}
          <div className="min-w-0">
            <h3 className="
              text-[14.5px] font-semibold leading-tight
              text-slate-900 dark:text-slate-50
              truncate
            ">
              {member.name}
            </h3>
            <p className="text-[12px] text-slate-400 dark:text-slate-600 mt-0.5 truncate">
              {member.jobTitle}
            </p>
          </div>
        </div>

        {/* Menu */}
        <button className="
          opacity-0 group-hover:opacity-100
          flex items-center justify-center
          w-7 h-7 rounded-xl shrink-0
          hover:bg-slate-100 dark:hover:bg-slate-800
          text-slate-400 dark:text-slate-600
          transition-all duration-150
          focus-visible:opacity-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
        ">
          <MoreHorizontal size={15} />
        </button>
      </div>

      {/* ── Meta row ── */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        {/* Role badge */}
        <span className={`
          flex items-center gap-1
          px-2 py-1 rounded-lg
          text-[10.5px] font-semibold
          ${role.badge}
        `}>
          {role.icon}
          {role.label}
        </span>

        {/* Availability */}
        <span className={`
          flex items-center gap-1
          text-[11px] font-medium
          ${availability.text}
        `}>
          <span className={`w-1.5 h-1.5 rounded-full ${availability.dot}`} />
          {availability.label}
        </span>

        {/* Location */}
        <span className="
          flex items-center gap-1 ml-auto
          text-[11px] text-slate-400 dark:text-slate-600
        ">
          <MapPin size={10} />
          {member.location}
        </span>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5" />

      {/* ── Skills ── */}
      <div className="px-5 py-4 space-y-2">
        <p className="text-[10.5px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-600">
          Skills
        </p>
        <div className="flex flex-wrap gap-1.5">
          {member.skills.map((skill) => (
            <SkillTag key={skill} label={skill} />
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5" />

      {/* ── Capacity ── */}
      <div className="px-5 py-4">
        <CapacityBar
          allocated={member.allocatedHours}
          total={member.weeklyHours}
        />
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5" />

      {/* ── Active task ── */}
      <div className="px-5 py-4 flex-1">
        <p className="text-[10.5px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-600 mb-2">
          Active Task
        </p>
        {member.activeTask ? (
          <div className="flex items-start gap-2">
            <span className={`
              flex items-center gap-1
              px-1.5 py-0.5 rounded-md shrink-0
              text-[10px] font-semibold mt-0.5
              ${TASK_TYPE_COLOR[member.activeTask.type]}
            `}>
              <Zap size={9} />
              {member.activeTask.epic}
            </span>
            <p className="
              text-[12.5px] leading-snug
              text-slate-600 dark:text-slate-400
              line-clamp-2
            ">
              {member.activeTask.title}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-300 dark:text-slate-700">
            <CheckCircle2 size={14} />
            <span className="text-[12.5px]">No active task</span>
          </div>
        )}
      </div>

      {/* ── Card footer ── */}
      <div className="
        px-5 py-3
        mt-auto
        border-t border-slate-100 dark:border-slate-800
        bg-slate-50 dark:bg-slate-900/50
        flex items-center justify-between gap-2
      ">
        {/* Timezone */}
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600">
          <Clock size={10} />
          {member.timezone}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            aria-label={`Email ${member.name}`}
            title={member.email}
            className="
              flex items-center justify-center
              w-7 h-7 rounded-lg
              hover:bg-slate-200 dark:hover:bg-slate-700
              text-slate-400 dark:text-slate-600
              hover:text-slate-700 dark:hover:text-slate-300
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
            "
          >
            <Mail size={13} />
          </button>
          <button
            aria-label={`Assign task to ${member.name}`}
            title="Assign task"
            className="
              flex items-center gap-1.5
              px-2.5 py-1 rounded-lg
              bg-sky-500 hover:bg-sky-600
              text-white text-[11px] font-medium
              transition-all duration-150
              hover:scale-[1.03] active:scale-[0.97]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              shadow-sm shadow-sky-500/30
            "
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Invite Modal (lightweight inline) ────────────────────────────────────────

const InviteBanner = ({ onClose }: { onClose: () => void }) => (
  <div className="
    flex items-center justify-between gap-4
    px-5 py-4 rounded-2xl
    bg-gradient-to-r from-sky-500 to-indigo-500
    shadow-lg shadow-sky-500/20
  ">
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 shrink-0">
        <UserPlus size={18} className="text-white" />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-white">
          Invite a team member
        </p>
        <p className="text-[12px] text-white/70">
          Enter their email and they'll receive an invite link.
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <input
        type="email"
        placeholder="colleague@company.com"
        className="
          hidden sm:block
          h-9 px-3 w-52 rounded-xl
          bg-white/20 placeholder:text-white/50
          text-white text-[13px]
          border border-white/30
          focus:outline-none focus:ring-2 focus:ring-white/50
        "
      />
      <button className="
        h-9 px-4 rounded-xl
        bg-white text-sky-600
        text-[13px] font-semibold
        hover:bg-sky-50 transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white
      ">
        Send Invite
      </button>
      <button
        onClick={onClose}
        className="
          flex items-center justify-center w-9 h-9 rounded-xl
          bg-white/10 hover:bg-white/20
          text-white transition-colors duration-150
          focus-visible:outline-none
        "
        aria-label="Close invite banner"
      >
        ✕
      </button>
    </div>
  </div>
);

// ── Summary Stats ─────────────────────────────────────────────────────────────

const TeamStats = ({ members }: { members: TeamMember[] }) => {
  const available = members.filter((m) => m.availability === 'available').length;
  const busy      = members.filter((m) => m.availability === 'busy').length;
  const totalCap  = members.reduce((s, m) => s + m.weeklyHours, 0);
  const usedCap   = members.reduce((s, m) => s + m.allocatedHours, 0);
  const freeCap   = totalCap - usedCap;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Total Members',    value: members.length, icon: <Brain size={14} />,     color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10'         },
        { label: 'Available Now',    value: available,      icon: <CheckCircle2 size={14} />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
        { label: 'Busy',             value: busy,           icon: <Zap size={14} />,        color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'     },
        { label: 'Free Hours Left',  value: `${freeCap}h`,  icon: <Clock size={14} />,      color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10'  },
      ].map((stat) => (
        <div
          key={stat.label}
          className="
            flex items-center gap-3
            px-4 py-3 rounded-2xl
            bg-white dark:bg-slate-900
            border border-slate-100 dark:border-slate-800
          "
        >
          <span className={`
            flex items-center justify-center
            w-8 h-8 rounded-xl shrink-0
            ${stat.color}
          `}>
            {stat.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[18px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-tight">
              {stat.value}
            </p>
            <p className="text-[10.5px] text-slate-400 dark:text-slate-600 truncate">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Team = () => {
  const [search,      setSearch]      = useState('');
  const [showInvite,  setShowInvite]  = useState(false);
  const [filterRole,  setFilterRole]  = useState<MemberRole | 'all'>('all');

  const ROLE_FILTERS: { key: MemberRole | 'all'; label: string }[] = [
    { key: 'all',             label: 'All'     },
    { key: 'admin',           label: 'Admin'   },
    { key: 'project_manager', label: 'PM'      },
    { key: 'developer',       label: 'Dev'     },
  ];

  const filtered = TEAM_MEMBERS.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase())     ||
      m.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      m.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchRole = filterRole === 'all' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold text-slate-900 dark:text-slate-50">
            Team Directory
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-400 dark:text-slate-600">
            {TEAM_MEMBERS.length} members across {new Set(TEAM_MEMBERS.map(m => m.location.split(', ')[1])).size} countries
          </p>
        </div>
        <button
          onClick={() => setShowInvite((s) => !s)}
          className="
            flex items-center gap-1.5
            h-9 px-4 rounded-xl
            bg-sky-500 hover:bg-sky-600
            text-white text-[13px] font-medium
            shadow-sm shadow-sky-500/30
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
          "
        >
          <UserPlus size={15} />
          <span className="hidden sm:inline">Invite Member</span>
        </button>
      </div>

      {/* ── Invite banner ─────────────────────────────────── */}
      {showInvite && (
        <InviteBanner onClose={() => setShowInvite(false)} />
      )}

      {/* ── Team stats ────────────────────────────────────── */}
      <TeamStats members={TEAM_MEMBERS} />

      {/* ── Search + filter ───────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"
          />
          <input
            type="text"
            placeholder="Search by name, title or skill…"
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
        </div>

        {/* Role filters */}
        <div className="
          flex items-center gap-1
          p-1 rounded-xl
          bg-slate-100 dark:bg-slate-800/60
          border border-slate-200 dark:border-slate-700
        ">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterRole(f.key)}
              className={`
                px-3 py-1.5 rounded-lg
                text-[12px] font-medium
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                ${filterRole === f.key
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
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="
          flex flex-col items-center gap-3 py-20
          text-slate-300 dark:text-slate-700
        ">
          <Search size={32} />
          <p className="text-[14px] font-medium text-slate-400 dark:text-slate-600">
            No team members match "{search}"
          </p>
          <button
            onClick={() => setSearch('')}
            className="text-[13px] font-medium text-sky-500 hover:text-sky-600 transition-colors"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
};

export default Team;