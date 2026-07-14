import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container, 
  Card,
  CardContent,
  Button,
  Skeleton,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import Grid from '@mui/material/Grid';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GetAppIcon from '@mui/icons-material/GetApp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Cell 
} from 'recharts';

import apiClient from '../api/client';
import type { Workspace } from '../types';

interface DashboardData {
  summary: {
    totalSpent: number;
    trend: number;
    dataUsage: number;
    voiceUsage: number;
    smsUsage: number;
  };
  alerts: {
    hasExcessConsumption: boolean;
    excessValue: number;
    excessCount: number;
    hasBillingErrors: boolean;
    errorValue: number;
    errorCount: number;
  };
  charts: {
    costsByDepartment: Array<{ name: string, total: number }>;
    monthlyTrends: Array<{ month: string, data_mb: number, voice_min: number, total_spent: number }>;
    expensiveLines: Array<{ phone: string, total: number }>;
    topDataLines: Array<{ phone: string, responsible: string, total_mb: number }>;
  };
  opportunities: Array<{ type: string, description: string, impact: number }>;
  errors: Array<{ type: string, description: string, count: number }>;
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      const ws = wsData ? JSON.parse(wsData) as Workspace : null;
      if (ws?.id) setActiveWorkspace(ws);
    } catch (_e) {
      console.error('Error parsing workspace');
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const response = await apiClient.get<DashboardData>(`/reports/dashboard-stats?workspaceId=${activeWorkspace.id}`);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!activeWorkspace) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Selecione um workspace para continuar.</Typography>
      </Box>
    );
  }

  const formatCurrency = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <Container maxWidth={false} sx={{ py: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Section */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
          Visão Geral da Fatura
        </Typography>
      </Box>

      {/* Metrics Row */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Valor Total:</Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#1e293b' }}>
                    {loading ? <Skeleton width={150} /> : formatCurrency(data?.summary.totalSpent || 0)}
                  </Typography>
                  <ArrowDropDownIcon sx={{ color: '#dc2626', fontSize: 32 }} />
                </Stack>
                <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                  {data?.summary.trend}% em relação ao mês anterior
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              {[
                { label: 'Dados', value: `${(data?.summary?.dataUsage ?? 0).toFixed(1)} MB`, color: '#f1f5f9' },
                { label: 'SMS', value: data?.summary.smsUsage, color: '#f1f5f9' },
              ].map((item, i) => (
                <Box key={i} sx={{ bgcolor: item.color, px: 3, py: 1.5, borderRadius: 2, textAlign: 'center', minWidth: 120 }}>
                  <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontWeight: 600 }}>{item.label}:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>{loading ? <Skeleton /> : item.value}</Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Row 1: Charts */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Custos por Departamento</Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={data?.charts.costsByDepartment} margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} style={{ fontSize: '11px', fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', formatter: (val: number) => formatCurrency(val), fontSize: 10, fontWeight: 700, fill: '#64748b' }}>
                      {data?.charts.costsByDepartment.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Consumo de Dados (MB)</Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.charts.monthlyTrends} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                    <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="data_mb" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Linhas Mais Caras</Typography>
              <List disablePadding>
                {data?.charts.expensiveLines.map((line, i) => (
                  <ListItem key={i} divider={i < 4} sx={{ px: 0, py: 1.5 }}>
                    <ListItemText 
                      primary={line.phone} 
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} 
                    />
                    <Typography sx={{ fontWeight: 800, color: '#1e293b' }}>{formatCurrency(line.total)}</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Maior Consumo de Dados (MB)</Typography>
              <List disablePadding>
                {data?.charts.topDataLines.map((line, i) => (
                  <ListItem key={i} divider={i < 4} sx={{ px: 0, py: 1.5 }}>
                    <ListItemText 
                      primary={line.phone}
                      secondary={line.responsible}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', color: '#64748b' }}
                    />
                    <Typography sx={{ fontWeight: 800, color: '#3B82F6' }}>{(line.total_mb ?? 0).toFixed(2)} MB</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Comparativo com Contrato</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <Box component="tr" sx={{ bgcolor: '#334155', color: 'white' }}>
                      <Box component="th" sx={{ p: 1.5, textAlign: 'left', borderRadius: '8px 0 0 0' }}>Contratado</Box>
                      <Box component="th" sx={{ p: 1.5, textAlign: 'left', borderRadius: '0 8px 0 0' }}>Utilizado</Box>
                    </Box>
                  </thead>
                  <tbody>
                    <Box component="tr">
                      <Box component="td" sx={{ p: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>Franquia de Dados:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>600 MB</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>Consumo:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#dc2626' }}>{(data?.summary?.dataUsage ?? 0).toFixed(0)} MB</Typography>
                      </Box>
                    </Box>
                    <Box component="tr">
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>Desconto Mensal:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>20%</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>Aplicado:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#dc2626' }}>10%</Typography>
                      </Box>
                    </Box>
                  </tbody>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer Actions */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<GetAppIcon />} 
          endIcon={<ArrowDropDownIcon />}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1, px: 3, borderColor: '#e2e8f0', color: '#334155' }}
        >
          Exportar Relatório
        </Button>
      </Box>
    </Container>
  );
};

export default DashboardPage;
