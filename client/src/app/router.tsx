import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import AiScrumMaster from '../pages/AiScrumMaster';
import Tasks from '../pages/Tasks';
import Team from '../pages/Team';
import Login    from '../pages/Login';
import Register from '../pages/Register';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';


const RootLayout = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes
      { path: '/login',    element: <Login />    },
      { path: '/register', element: <Register /> },

      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/',
            element: <AppLayout />,
            children: [
              { index: true,       element: <Navigate to="/dashboard" replace /> },
              { path: 'dashboard', element: <Dashboard />     },
              { path: 'projects',  element: <Projects />      },
              { path: 'tasks',     element: <Tasks />         },
              { path: 'team',      element: <Team />          },
              { path: 'ai',        element: <AiScrumMaster /> },
            ],
          },
        ],
      },
    ],
  },
]);