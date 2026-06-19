import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Zap,
  AlertCircle,
  CheckCircle2,
  Check,
} from 'lucide-react';

// ── Background (reused from Login) ───────────────────────────────────────────

const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="
      absolute inset-0
      bg-gradient-to-br from-slate-50 via-sky-50/40 to-indigo-50/60
      dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
    "/>
    <div
      className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
      style={{
        backgroundImage: `radial-gradient(circle, #94a3b8 1px, transparent 1px)`,
        backgroundSize:  '28px 28px',
      }}
    />
    <div className="
      absolute -top-40 -right-40 w-96 h-96 rounded-full
      bg-sky-200/40 dark:bg-sky-500/5 blur-3xl
    "/>
    <div className="
      absolute -bottom-40 -left-40 w-96 h-96 rounded-full
      bg-indigo-200/40 dark:bg-indigo-500/5 blur-3xl
    "/>
  </div>
);

// ── Input field ───────────────────────────────────────────────────────────────

interface InputFieldProps {
  id:            string;
  label:         string;
  type:          string;
  value:         string;
  onChange:      (v: string) => void;
  placeholder:   string;
  icon:          React.ReactNode;
  rightElement?: React.ReactNode;
  error?:        string;
  hint?:         string;
  autoComplete?: string;
}

const InputField = ({
  id, label, type, value, onChange,
  placeholder, icon, rightElement, error, hint, autoComplete,
}: InputFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-[13px] font-medium text-slate-700 dark:text-slate-300"
    >
      {label}
    </label>
    <div className="relative">
      <span className="
        absolute left-3.5 top-1/2 -translate-y-1/2
        text-slate-400 dark:text-slate-600 pointer-events-none
      ">
        {icon}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`
          w-full pl-10 pr-${rightElement ? '11' : '4'} py-2.5
          rounded-xl text-[14px]
          bg-white dark:bg-slate-900
          text-slate-800 dark:text-slate-200
          placeholder:text-slate-400 dark:placeholder:text-slate-600
          border transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${error
            ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 focus:border-red-400'
            : 'border-slate-200 dark:border-slate-700 focus:ring-sky-400/30 focus:border-sky-400 dark:focus:border-sky-500'
          }
        `}
      />
      {rightElement && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </span>
      )}
    </div>
    {error && (
      <p className="flex items-center gap-1.5 text-[12px] text-red-500 dark:text-red-400">
        <AlertCircle size={12} />
        {error}
      </p>
    )}
    {hint && !error && (
      <p className="text-[12px] text-slate-400 dark:text-slate-600">{hint}</p>
    )}
  </div>
);

// ── Password strength meter ───────────────────────────────────────────────────

interface StrengthResult {
  score:  number;   // 0 – 4
  label:  string;
  color:  string;
  bars:   string;
}

const getPasswordStrength = (password: string): StrengthResult => {
  if (!password) return { score: 0, label: '',        color: '',                       bars: 'bg-slate-200 dark:bg-slate-800' };
  let score = 0;
  if (password.length >= 8)          score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak',    color: 'text-red-500',    bars: 'bg-red-400'    };
  if (score === 2) return { score, label: 'Fair',    color: 'text-amber-500',  bars: 'bg-amber-400'  };
  if (score === 3) return { score, label: 'Good',    color: 'text-sky-500',    bars: 'bg-sky-400'    };
  return              { score, label: 'Strong',  color: 'text-emerald-500', bars: 'bg-emerald-400' };
};

const PasswordStrength = ({ password }: { password: string }) => {
  if (!password) return null;
  const strength = getPasswordStrength(password);

  return (
    <div className="flex flex-col gap-1.5 -mt-1">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`
              flex-1 h-1 rounded-full transition-all duration-300
              ${bar <= strength.score ? strength.bars : 'bg-slate-200 dark:bg-slate-800'}
            `}
          />
        ))}
        <span className={`text-[11.5px] font-semibold ml-1 ${strength.color}`}>
          {strength.label}
        </span>
      </div>
    </div>
  );
};

// ── Password requirement check ────────────────────────────────────────────────

const PasswordRequirements = ({ password }: { password: string }) => {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter',  met: /[A-Z]/.test(password)  },
    { label: 'One number',            met: /[0-9]/.test(password)  },
  ];

  if (!password) return null;

  return (
    <div className="flex flex-col gap-1 -mt-1">
      {checks.map((c) => (
        <p
          key={c.label}
          className={`flex items-center gap-1.5 text-[11.5px] font-medium transition-colors duration-200
            ${c.met
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-slate-400 dark:text-slate-600'
            }
          `}
        >
          {c.met
            ? <CheckCircle2 size={11} />
            : <Check size={11} className="opacity-40" />
          }
          {c.label}
        </p>
      ))}
    </div>
  );
};

// ── Role selector ─────────────────────────────────────────────────────────────

type Role = 'developer' | 'project_manager' | 'viewer';

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'developer',       label: 'Developer',       desc: 'Build features & fix bugs'     },
  { value: 'project_manager', label: 'Project Manager', desc: 'Plan sprints & manage team'    },
  { value: 'viewer',          label: 'Viewer',          desc: 'View-only access to boards'    },
];

const RoleSelector = ({
  value,
  onChange,
}: {
  value:    Role;
  onChange: (r: Role) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
      Role
    </label>
    <div className="flex flex-col gap-2">
      {ROLES.map((role) => (
        <button
          key={role.value}
          type="button"
          onClick={() => onChange(role.value)}
          className={`
            flex items-center gap-3
            px-3.5 py-2.5 rounded-xl text-left
            border transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
            ${value === role.value
              ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-400 dark:border-sky-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }
          `}
        >
          <span className={`
            w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
            transition-all duration-150
            ${value === role.value
              ? 'border-sky-500 bg-sky-500'
              : 'border-slate-300 dark:border-slate-600'
            }
          `}>
            {value === role.value && (
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </span>
          <div className="min-w-0">
            <p className={`
              text-[13px] font-medium leading-tight
              ${value === role.value
                ? 'text-sky-700 dark:text-sky-400'
                : 'text-slate-700 dark:text-slate-300'
              }
            `}>
              {role.label}
            </p>
            <p className="text-[11.5px] text-slate-400 dark:text-slate-600 mt-0.5">
              {role.desc}
            </p>
          </div>
        </button>
      ))}
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const Register = () => {
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPass] = useState('');
  const [role, setRole]                   = useState<Role>('developer');
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [errors, setErrors]              = useState<Record<string, string>>({});
  const [isLoading, setIsLoading]        = useState(false);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim())                   next['name']    = 'Full name is required.';
    else if (name.trim().length < 2)    next['name']    = 'Name must be at least 2 characters.';
    if (!email.trim())                  next['email']   = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) next['email'] = 'Enter a valid email address.';
    if (!password)                      next['password'] = 'Password is required.';
    else if (password.length < 8)       next['password'] = 'Password must be at least 8 characters.';
    if (!confirmPassword)               next['confirm']  = 'Please confirm your password.';
    else if (password !== confirmPassword) next['confirm'] = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    // Axios submission logic will be wired here in Phase 3
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <GridBackground />

      <div className="relative z-10 w-full max-w-[460px]">

        {/* ── Card ─────────────────────────────────────────── */}
        <div className="
          bg-white dark:bg-slate-900
          rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60
          border border-slate-200 dark:border-slate-800
          overflow-hidden
        ">
          <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500" />

          <div className="px-8 py-8">

            {/* ── Logo ───────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="
                flex items-center justify-center
                w-12 h-12 rounded-2xl bg-sky-500
                shadow-lg shadow-sky-500/30
              ">
                <Zap size={22} className="text-white" fill="currentColor" />
              </div>
              <div className="text-center">
                <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  nexus
                </h1>
                <p className="text-[12px] font-medium tracking-[0.18em] uppercase text-slate-400 dark:text-slate-600">
                  agile workspace
                </p>
              </div>
            </div>

            {/* ── Heading ────────────────────────────────────── */}
            <div className="mb-6">
              <h2 className="text-[20px] font-semibold text-slate-900 dark:text-slate-50">
                Create your account
              </h2>
              <p className="mt-1 text-[13.5px] text-slate-500 dark:text-slate-500">
                Join your team's workspace in seconds.
              </p>
            </div>

            {/* ── Form ───────────────────────────────────────── */}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

              <InputField
                id="name"
                label="Full name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Abu Bakar Tamboli"
                autoComplete="name"
                icon={<User size={15} />}
                error={errors['name']}
              />

              <InputField
                id="email"
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                autoComplete="email"
                icon={<Mail size={15} />}
                error={errors['email']}
              />

              <div className="flex flex-col gap-2">
                <InputField
                  id="password"
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  icon={<Lock size={15} />}
                  error={errors['password']}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      className="
                        text-slate-400 dark:text-slate-600
                        hover:text-slate-600 dark:hover:text-slate-400
                        transition-colors duration-150
                        focus-visible:outline-none
                      "
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
                <PasswordStrength password={password} />
                <PasswordRequirements password={password} />
              </div>

              <InputField
                id="confirm-password"
                label="Confirm password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={setConfirmPass}
                placeholder="Repeat your password"
                autoComplete="new-password"
                icon={<Lock size={15} />}
                error={errors['confirm']}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="
                      text-slate-400 dark:text-slate-600
                      hover:text-slate-600 dark:hover:text-slate-400
                      transition-colors duration-150
                      focus-visible:outline-none
                    "
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              {/* Role selector */}
              <RoleSelector value={role} onChange={setRole} />

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="
                  flex items-center justify-center gap-2
                  w-full h-11 rounded-xl mt-2
                  bg-sky-500 hover:bg-sky-600
                  disabled:bg-sky-400 disabled:cursor-not-allowed
                  text-white text-[14px] font-semibold
                  shadow-sm shadow-sky-500/30
                  hover:scale-[1.01] active:scale-[0.99]
                  disabled:scale-100
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-sky-400 focus-visible:ring-offset-2
                  focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
                "
              >
                {isLoading ? (
                  <>
                    <span className="
                      w-4 h-4 rounded-full border-2
                      border-white/30 border-t-white
                      animate-spin
                    "/>
                    Creating account…
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Card footer ──────────────────────────────────── */}
          <div className="
            px-8 py-4
            border-t border-slate-100 dark:border-slate-800
            bg-slate-50 dark:bg-slate-900/50
            text-center
          ">
            <p className="text-[13px] text-slate-500 dark:text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="
                  font-semibold
                  text-sky-500 dark:text-sky-400
                  hover:text-sky-600 dark:hover:text-sky-300
                  transition-colors duration-150
                "
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="
          mt-5 text-center text-[12px]
          text-slate-400 dark:text-slate-700
        ">
          By creating an account you agree to the{' '}
          <a href="#" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-500 transition-colors">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="#" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-500 transition-colors">
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
};

export default Register;