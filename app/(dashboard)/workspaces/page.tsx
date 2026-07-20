'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Container, Alert, CircularProgress, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Divider, alpha, useTheme } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import { useRouter } from 'next/navigation';
import { apiGet, apiPut } from '@/lib/api/client';
import type { Workspace, User } from '@/app/types';
import { useLanguage } from '@/app/i18n/LanguageContext';

export default function WorkspaceSelectionPage() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userStr = typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) {
      setError(t('workspaceSelection.userNotIdentified'));
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet(`/workspaces/user/${user.id}`);
      const list = Array.isArray(data) ? data : [];
      setWorkspaces(list);

      if (list.length === 1) {
        sessionStorage.setItem('activeWorkspace', JSON.stringify(list[0]));
        if (user?.id) {
          localStorage.setItem(`lastWorkspace_${user.id}`, list[0].id);
          apiPut(`/users/${user.id}/config`, { last_workspace_id: list[0].id }).catch(() => {});
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Fetch workspaces error:', err);
      setError(t('workspaceSelection.loadError'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, router, t]);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleSelect = async (workspace: Workspace) => {
    sessionStorage.setItem('activeWorkspace', JSON.stringify(workspace));
    if (user?.id) {
      localStorage.setItem(`lastWorkspace_${user.id}`, workspace.id);
      try { await apiPut(`/users/${user.id}/config`, { last_workspace_id: workspace.id }); } catch {}
    }
    router.push('/dashboard');
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: { xs: 3, sm: 6 }, textAlign: 'center' }}>
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: 1.5, bgcolor: theme.palette.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`, mb: 3 }}>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 900 }}>T</Typography>
            </Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
              {t('workspaceSelection.welcome', { name: user?.name?.split(' ')[0] || '' })}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {t('workspaceSelection.selectEnvironment')}
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
              {workspaces.length === 0 ? (
                <Box sx={{ py: 3 }}>
                  <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>{t('workspaceSelection.noWorkspacesAssociated')}</Typography>
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>{t('workspaceSelection.contactAdmin')}</Alert>
                </Box>
              ) : (
                <List sx={{ pt: 0 }}>
                  {workspaces.map((ws) => (
                    <ListItem key={ws.id} disablePadding sx={{ mb: 2 }}>
                      <ListItemButton onClick={() => handleSelect(ws)} sx={{ p: 2.5, borderRadius: 1.5, border: `1px solid ${alpha(theme.palette.divider, 0.5)}`, bgcolor: alpha(theme.palette.text.primary, 0.01), transition: 'all 0.2s', '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.04), transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}` } }}>
                        <ListItemIcon sx={{ minWidth: 50 }}>
                          <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}><BusinessIcon /></Box>
                        </ListItemIcon>
                        <ListItemText primary={ws.name} slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '1.1rem' } }, secondary: { sx: { textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 700, mt: 0.5 } } }} secondary={ws.schema_name} />
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
}
