import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container, 
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  alpha,
  useTheme
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../routes/routes';
import apiClient from '../api/client';
import type { Workspace, User } from '../types';

const WorkspaceSelectionPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const userStr = sessionStorage.getItem('user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) {
      setError(t('login.error_user_not_identified'));
      setLoading(false);
      return;
    }

    try {
      const userProfile = user?.profile;
      console.log('Fetching workspaces for user:', user?.id, 'profile:', userProfile);
      const response = await apiClient.get<Workspace[]>(`/workspaces/user/${user?.id}`);
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('Workspaces fetched:', data.length);
      setWorkspaces(data);

      // Only auto-redirect if user has exactly one workspace. 
      // If user has multiple (like a 'jedi' user), stay on this screen to allow selection.
      if (data.length === 1) {
        sessionStorage.setItem('activeWorkspace', JSON.stringify(data[0]));
        if (user?.id) {
          localStorage.setItem(`lastWorkspace_${user.id}`, data[0].id);
          apiClient.put(`/users/${user.id}/config`, { last_workspace_id: data[0].id }).catch(() => {});
        }
        navigate(ROUTES.DASHBOARD);
      }
    } catch (err: unknown) {
      console.error('Fetch workspaces error:', err);
      setError(t('workspaces.error_loading'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.profile, navigate, t, user?.config?.last_workspace_id]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleSelect = async (workspace: Workspace) => {
    sessionStorage.setItem('activeWorkspace', JSON.stringify(workspace));
    if (user?.id) {
      localStorage.setItem(`lastWorkspace_${user.id}`, workspace.id);
      try {
        await apiClient.put(`/users/${user.id}/config`, { last_workspace_id: workspace.id });
      } catch (err) {
        console.error('Failed to update last workspace in config', err);
      }
    }
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          sx={{ 
            p: { xs: 3, sm: 6 }, 
            textAlign: 'center'
          }}
        >
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ 
              width: 64, 
              height: 64, 
              borderRadius: 1.5, 
              bgcolor: theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
              mb: 3
            }}>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 900 }}>T</Typography>
            </Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
              Welcome, {user?.name?.split(' ')[0]}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Select the environment you want to access today.
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
              {workspaces.length === 0 ? (
                <Box sx={{ py: 3 }}>
                  <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                    Você não está associado a nenhum workspace ativo.
                  </Typography>
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Contate seu administrador para solicitar acesso.
                  </Alert>
                </Box>
              ) : (
                <List sx={{ pt: 0 }}>
                  {workspaces.map((ws) => (
                    <ListItem key={ws.id} disablePadding sx={{ mb: 2 }}>
                      <ListItemButton 
                        onClick={() => handleSelect(ws)}
                        sx={{ 
                          p: 2.5,
                          borderRadius: 1.5,
                          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                          bgcolor: alpha(theme.palette.text.primary, 0.01),
                          transition: 'all 0.2s',
                          '&:hover': { 
                            borderColor: theme.palette.primary.main, 
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 50 }}>
                          <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                            <BusinessIcon />
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary={ws.name} 
                          primaryTypographyProps={{ fontWeight: 700, fontSize: '1.1rem' }}
                          secondary={ws.schema_name} 
                          secondaryTypographyProps={{ sx: { textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 700, mt: 0.5 } }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default WorkspaceSelectionPage;
