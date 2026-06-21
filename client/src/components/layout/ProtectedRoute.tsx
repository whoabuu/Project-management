import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Route guard for authenticated sections of the app.
 *
 * - While the auth bootstrap is resolving (isLoading), shows a full-screen
 *   loader instead of flashing the login page or the protected content.
 * - If the session check fails, redirects to /login.
 * - Otherwise renders the nested route via <Outlet />.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="
        flex flex-col items-center justify-center
        min-h-screen gap-4
        bg-slate-50 dark:bg-slate-950
      ">
        {/* Logo with pulse + ring animation */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <span className="
            absolute inset-0 rounded-2xl
            border-2 border-sky-400/40
            animate-ping
          " />
          <img
            src="/nexus-icon-64.svg"
            alt="Nexus"
            className="w-12 h-12 relative z-10 animate-pulse"
          />
        </div>

        <p className="text-[13px] font-medium text-slate-400 dark:text-slate-600">
          Loading your workspace…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};