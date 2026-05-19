import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import Dashboard from '../pages/Dashboard';

export const router = createBrowserRouter([
  {
    path:    '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'projects',  element: <div className="text-slate-900 dark:text-white">Projects</div>  },
      { path: 'tasks',     element: <div className="text-slate-900 dark:text-white">Tasks</div>     },
      { path: 'team',      element: <div className="text-slate-900 dark:text-white">Team</div>      },
      { path: 'ai',        element: <div className="text-slate-900 dark:text-white">AI</div>        },
    ],
  },
]);