import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import AiScrumMaster from '../pages/AiScrumMaster';
import Tasks from '../pages/Tasks';
import Team from '../pages/Team';
import Login    from '../pages/Login';
import Register from '../pages/Register';

export const router = createBrowserRouter([
  { path: '/login',    element: <Login />    },
  { path: '/register', element: <Register /> },
  {
    path:    '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'projects', element: <Projects /> },
      { path: 'tasks', element: <Tasks /> },
      { path: 'team', element: <Team /> },
      { path: 'ai', element: <AiScrumMaster /> },
    ],
  },
]);