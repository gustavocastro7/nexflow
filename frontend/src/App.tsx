import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CentroCustoPage from './pages/CentroCustoPage';
import FaturasPage from './pages/FaturasPage';
import ProfilePage from './pages/ProfilePage';
import RelatoriosPage from './pages/RelatoriosPage';
import CollaboratorsPage from './pages/CollaboratorsPage';
import UsersPage from './pages/UsersPage';
import WorkspaceSelectionPage from './pages/WorkspaceSelectionPage';
import RoleAssignmentPage from './pages/RoleAssignmentPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeHandler from './components/ThemeHandler';
import { ROUTES } from './routes/routes';

const App: React.FC = () => {
  return (
    <Router>
      <ThemeHandler>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.WORKSPACES} element={<ProtectedRoute><WorkspaceSelectionPage /></ProtectedRoute>} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.COST_CENTERS} element={<CentroCustoPage />} />
            <Route path={ROUTES.COLLABORATORS} element={<CollaboratorsPage />} />
            <Route path={ROUTES.INVOICES} element={<FaturasPage />} />
            <Route path={ROUTES.REPORTS} element={<RelatoriosPage />} />
            <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
            <Route path={ROUTES.ADMIN_ROLES} element={<RoleAssignmentPage />} />
            <Route path={ROUTES.USERS} element={<UsersPage />} />
          </Route>

          <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </ThemeHandler>
    </Router>
  );
};

export default App;
