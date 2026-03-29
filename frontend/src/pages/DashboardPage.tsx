import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container, 
  Grid,
  Card,
  CardContent,
  Button,
  alpha,
  useTheme,
  Skeleton
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import PhoneIcon from '@mui/icons-material/Phone';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes/routes';
import apiClient from '../api/client';
import type { Workspace } from '../types';

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [stats, setStats] = useState({
    costCenters: 0,
    claroInvoices: 0,
    vivoInvoices: 0,
    totalSpent: 0,
    users: 0,
    collaborators: 0,
    phoneLines: 0,
    phoneLinesWithoutCC: 0
  });

  useEffect(() => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      const ws = wsData ? JSON.parse(wsData) as Workspace : null;
      if (ws && ws?.id) {
        setActiveWorkspace(ws);
      }
    } catch (e: unknown) {
      console.error('Error parsing activeWorkspace');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!activeWorkspace || !activeWorkspace?.id) return;
    setLoading(true);
    try {
      const response = await apiClient.get<{
        costCenters: number;
        claroInvoices: number;
        vivoInvoices: number;
        totalSpent: number;
        users: number;
        collaborators: number;
        phoneLines: number;
        phoneLinesWithoutCC: number;
      }>(`/reports/dashboard-stats?workspaceId=${activeWorkspace.id}`);

      const data = response.data;

      setStats({
        costCenters: data.costCenters || 0,
        claroInvoices: data.claroInvoices || 0,
        vivoInvoices: data.vivoInvoices || 0,
        totalSpent: data.totalSpent || 0,
        users: data.users || 0,
        collaborators: data.collaborators || 0,
        phoneLines: data.phoneLines || 0,
        phoneLinesWithoutCC: data.phoneLinesWithoutCC || 0
      });
    } catch (_err: unknown) {
      console.error('Error fetching statistics');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!activeWorkspace || !activeWorkspace?.id) {
    return (
      <Container maxWidth="md" sx={{ mt: 10, textAlign: 'center' }}>
        <Paper sx={{ p: 8, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <BusinessIcon sx={{ fontSize: 64, color: theme.palette.primary.main, opacity: 0.5 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Nenhum Workspace</Typography>
            <Typography variant="body1" color="textSecondary">
              Você precisa selecionar um workspace para visualizar os dados.
            </Typography>
          </Box>
          <Button variant="contained" component={Link} to={ROUTES.WORKSPACES} size="large">
            Selecionar Workspace
          </Button>
        </Paper>
      </Container>
    );
  }

  const statCards = [
    { 
      label: 'Total Gasto', 
      value: stats.totalSpent !== undefined ? `R$ ${stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00', 
      icon: <TrendingUpIcon />, 
      color: '#10B981'
    },
    { 
      label: 'Faturas', 
      value: stats.claroInvoices + stats.vivoInvoices, 
      icon: <ReceiptIcon />, 
      color: '#E11D48' 
    },
    { 
      label: 'Telefones', 
      value: stats.phoneLines, 
      icon: <PhoneIcon />, 
      color: '#3B82F6' 
    },
    { 
      label: 'Sem Centro de Custo', 
      value: stats.phoneLinesWithoutCC, 
      icon: <ErrorOutlineIcon />, 
      color: '#F59E0B' 
    },
    { 
      label: 'Centros de Custo', 
      value: stats.costCenters, 
      icon: <AccountBalanceWalletIcon />, 
      color: theme.palette.primary.main 
    },
    { 
      label: 'Colaboradores', 
      value: stats.collaborators, 
      icon: <GroupsIcon />, 
      color: '#8B5CF6' 
    },
    { 
      label: 'Usuários', 
      value: stats.users, 
      icon: <PeopleIcon />, 
      color: '#64748B' 
    },
  ];

  return (
    <Container 
      maxWidth={false} 
      disableGutters 
      sx={{ 
        height: 'auto', 
        display: 'flex', 
        flexDirection: 'column',
        px: { xs: 2, sm: 4 },
        pb: 4
      }}
    >
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visão geral: {activeWorkspace?.name}
          </Typography>
        </Box>
        {loading && <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>Atualizando...</Typography>}
      </Box>

      <Grid container spacing={2}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
            <Card sx={{ 
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              position: 'relative', 
              overflow: 'hidden',
              boxShadow: 'none',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: -10, 
                right: -10, 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                bgcolor: alpha(card.color, 0.05),
                zIndex: 0
              }} />
              <CardContent sx={{ 
                position: 'relative', 
                zIndex: 1, 
                p: 2,
                '&:last-child': { pb: 2 },
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: 42, 
                  height: 42, 
                  borderRadius: 2, 
                  bgcolor: alpha(card.color, 0.1), 
                  color: card.color,
                  flexShrink: 0
                }}>
                  {React.cloneElement(card.icon as React.ReactElement, { sx: { fontSize: 22 } })}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" sx={{ 
                    color: theme.palette.text.secondary, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    letterSpacing: 0.5,
                    display: 'block',
                    lineHeight: 1.2,
                    mb: 0.5
                  }}>
                    {card.label}
                  </Typography>
                  {loading && stats.totalSpent === 0 ? (
                    <Skeleton variant="text" width="60%" />
                  ) : (
                    <Typography variant="h6" sx={{ 
                      fontWeight: 800, 
                      color: theme.palette.text.primary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1
                    }}>
                      {card.value}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default DashboardPage;
