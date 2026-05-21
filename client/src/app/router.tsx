import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import AiScrumMaster from '../pages/AiScrumMaster';

export const router = createBrowserRouter([
  {
    path:    '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'projects', element: <Projects /> },
      { path: 'tasks',     element: <div className="text-slate-900 dark:text-white">Tasks</div>     },
      { path: 'team',      element: <div className="text-slate-900 dark:text-white">Team</div>      },
      { path: 'ai', element: <AiScrumMaster /> },
    ],
  },
]);