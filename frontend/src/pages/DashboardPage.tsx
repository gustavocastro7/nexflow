import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container, 
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Button,
  alpha,
  useTheme
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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
    totalSpent: 0
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
      }>(`/reports/dashboard-stats?workspaceId=${activeWorkspace.id}`);

      const data = response.data;

      setStats({
        costCenters: data.costCenters || 0,
        claroInvoices: data.claroInvoices || 0,
        vivoInvoices: data.vivoInvoices || 0,
        totalSpent: data.totalSpent || 0
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
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>No Workspace</Typography>
            <Typography variant="body1" color="textSecondary">
              You need to select a workspace to view data.
            </Typography>
          </Box>
          <Button variant="contained" component={Link} to={ROUTES.WORKSPACES} size="large">
            Select Workspace
          </Button>
        </Paper>
      </Container>
    );
  }

  const statCards = [
    { 
      label: 'Cost Centers', 
      value: stats.costCenters, 
      icon: <AccountBalanceWalletIcon />, 
      color: theme.palette.primary.main 
    },
    { 
      label: 'Claro Invoices', 
      value: stats.claroInvoices, 
      icon: <ReceiptIcon />, 
      color: '#E11D48' 
    },
    // Vivo Invoices card removed
    { 
      label: 'Total Spent', 
      value: `R$ ${(stats.totalSpent ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: <TrendingUpIcon />, 
      color: '#10B981'
    },
  ];
  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Container 
      maxWidth={false} 
      disableGutters 
      sx={{ 
        height: 'calc(100vh - 120px)', 
        display: 'flex', 
        flexDirection: 'column',
        px: { xs: 2, sm: 4 },
        pb: 4
      }}
    >
      <Box sx={{ mb: 4 }}>
      </Box>

      <Box 
        sx={{ 
          flexGrow: 1,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(4, 1fr)'
          },
          gridTemplateRows: {
            xs: 'auto',
            md: 'repeat(3, 1fr)'
          },
          gap: 3,
          width: '100%'
        }}
      >
        {statCards.map((card, idx) => (
          <Card key={idx} sx={{ 
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%', 
            position: 'relative', 
            overflow: 'hidden',
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }}>
            <Box sx={{ 
              position: 'absolute', 
              top: -20, 
              right: -20, 
              width: { xs: 80, md: 100 }, 
              height: { xs: 80, md: 100 }, 
              borderRadius: '50%', 
              bgcolor: alpha(card.color, 0.1),
              zIndex: 0
            }} />
            <CardContent sx={{ 
              position: 'relative', 
              zIndex: 1, 
              p: { xs: 2, md: 3 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              height: '100%',
              justifyContent: 'center',
              flexGrow: 1
            }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: { xs: 40, md: 56 }, 
                  height: { xs: 40, md: 56 }, 
                  borderRadius: 3, 
                  bgcolor: alpha(card.color, 0.1), 
                  color: card.color,
                  mb: 2
                }}>
                  {React.cloneElement(card.icon as React.ReactElement, { sx: { fontSize: { xs: 24, md: 32 } } })}
                </Box>
                <Typography variant="subtitle2" sx={{ 
                  color: theme.palette.text.secondary, 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  letterSpacing: 1.5,
                  fontSize: { xs: '0.7rem', md: '0.8rem' }
                }}>
                  {card.label}
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ 
                fontWeight: 900, 
                mt: 2,
                fontSize: { 
                  xs: '1.25rem', 
                  sm: '1.5rem', 
                  md: '1.8rem', 
                  lg: '2.2rem' 
                },
                color: theme.palette.text.primary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1
              }}>
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
};

export default DashboardPage;
