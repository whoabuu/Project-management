import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  AlertCircle,
  ClipboardCopy,
  CheckCheck,
} from 'lucide-react';

// ── Demo credentials ──────────────────────────────────────────────────────────

const DEMO = { email: 'admin@nexus.dev', password: 'Test1234' };

// ── Background pattern ────────────────────────────────────────────────────────

const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Base gradient */}
    <div className="
      absolute inset-0
      bg-gradient-to-br from-slate-50 via-sky-50/40 to-indigo-50/60
      dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
    "/>
    {/* Dot grid overlay */}
    <div
      className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
      style={{
        backgroundImage: `radial-gradient(circle, #94a3b8 1px, transparent 1px)`,
        backgroundSize:  '28px 28px',
      }}
    />
    {/* Soft glow blobs */}
    <div className="
      absolute -top-40 -right-40
      w-96 h-96 rounded-full
      bg-sky-200/40 dark:bg-sky-500/5
      blur-3xl
    "/>
    <div className="
      absolute -bottom-40 -left-40
      w-96 h-96 rounded-full
      bg-indigo-200/40 dark:bg-indigo-500/5
      blur-3xl
    "/>
  </div>
);

// ── Input field ───────────────────────────────────────────────────────────────

interface InputFieldProps {
  id:           string;
  label:        string;
  type:         string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder:  string;
  icon:         React.ReactNode;
  rightElement?: React.ReactNode;
  error?:       string;
  autoComplete?: string;
}

const InputField = ({
  id, label, type, value, onChange,
  placeholder, icon, rightElement, error, autoComplete,
}: InputFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-[13px] font-medium text-slate-700 dark:text-slate-300"
    >
      {label}
    </label>
    <div className="relative">
      {/* Left icon */}
      <span className="
        absolute left-3.5 top-1/2 -translate-y-1/2
        text-slate-400 dark:text-slate-600
        pointer-events-none
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

      {/* Right element */}
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
  </div>
);

// ── Demo credentials box ──────────────────────────────────────────────────────

const DemoBox = ({
  onFill,
}: {
  onFill: (email: string, password: string) => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleFill = () => {
    onFill(DEMO.email, DEMO.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="
      flex items-start justify-between gap-3
      p-3.5 rounded-xl
      bg-sky-50 dark:bg-sky-500/10
      border border-sky-200 dark:border-sky-500/30
    ">
      <div className="flex flex-col gap-0.5">
        <p className="text-[11.5px] font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wide">
          Demo Credentials
        </p>
        <p className="text-[12.5px] text-slate-600 dark:text-slate-400 font-mono">
          {DEMO.email}
        </p>
        <p className="text-[12.5px] text-slate-600 dark:text-slate-400 font-mono">
          {DEMO.password}
        </p>
      </div>
      <button
        type="button"
        onClick={handleFill}
        className="
          flex items-center gap-1.5 shrink-0
          px-2.5 py-1.5 rounded-lg
          bg-sky-100 dark:bg-sky-500/20
          hover:bg-sky-200 dark:hover:bg-sky-500/30
          text-sky-600 dark:text-sky-400
          text-[11.5px] font-medium
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
        "
      >
        {copied
          ? <><CheckCheck size={12} /> Filled</>
          : <><ClipboardCopy size={12} /> Fill</>
        }
      </button>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Login = () => {
  const [searchParams]          = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const sessionExpired = searchParams.get('session') === 'expired';

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!email.trim())           next['email']    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) next['email'] = 'Enter a valid email address.';
    if (!password)               next['password'] = 'Password is required.';
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

      <div className="relative z-10 w-full max-w-[420px]">

        {/* ── Card ─────────────────────────────────────────── */}
        <div className="
          bg-white dark:bg-slate-900
          rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60
          border border-slate-200 dark:border-slate-800
          overflow-hidden
        ">
          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500" />

          <div className="px-8 py-8">

            {/* ── Logo ───────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="
                flex items-center justify-center
                w-12 h-12 rounded-2xl
                bg-sky-500
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

            {/* ── Session expired alert ──────────────────────── */}
            {sessionExpired && (
              <div className="
                flex items-center gap-2.5
                px-4 py-3 mb-5 rounded-xl
                bg-amber-50 dark:bg-amber-500/10
                border border-amber-200 dark:border-amber-500/30
                text-amber-700 dark:text-amber-400
                text-[13px] font-medium
              ">
                <AlertCircle size={15} className="shrink-0" />
                Your session expired. Please sign in again.
              </div>
            )}

            {/* ── Heading ────────────────────────────────────── */}
            <div className="mb-6">
              <h2 className="text-[20px] font-semibold text-slate-900 dark:text-slate-50">
                Welcome back
              </h2>
              <p className="mt-1 text-[13.5px] text-slate-500 dark:text-slate-500">
                Sign in to continue to your workspace.
              </p>
            </div>

            {/* ── Form ───────────────────────────────────────── */}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

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

              <InputField
                id="password"
                label="Password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                autoComplete="current-password"
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

              {/* Forgot password */}
              <div className="flex justify-end -mt-1">
                <a
                  href="#"
                  className="
                    text-[12.5px] font-medium
                    text-sky-500 dark:text-sky-400
                    hover:text-sky-600 dark:hover:text-sky-300
                    transition-colors duration-150
                  ">
                
                  Forgot password?
                
                </a>
              </div>

              {/* Demo credentials */}
              {import.meta.env.DEV && (
                <DemoBox onFill={(e, p) => { setEmail(e); setPassword(p); }} />
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="
                  flex items-center justify-center gap-2
                  w-full h-11 rounded-xl mt-1
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
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
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
              Don't have an account?{' '}
              <Link
                to="/register"
                className="
                  font-semibold
                  text-sky-500 dark:text-sky-400
                  hover:text-sky-600 dark:hover:text-sky-300
                  transition-colors duration-150
                "
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* ── Below-card note ───────────────────────────────── */}
        <p className="
          mt-5 text-center text-[12px]
          text-slate-400 dark:text-slate-700
        ">
          By signing in you agree to the{' '}
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

export default Login;