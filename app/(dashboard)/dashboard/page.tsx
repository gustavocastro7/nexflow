'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Container, Card, CardContent, Button,
  Skeleton, List, ListItem, ListItemText,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import GetAppIcon from '@mui/icons-material/GetApp';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { apiGet } from '../../lib/api/client';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#6366F1'];

interface Workspace { id: string; name: string; }

interface DashboardData {
  summary: { totalSpent: number; trend: number; dataUsage: number; voiceUsage: number; smsUsage: number; };
  alerts: { hasExcessConsumption: boolean; excessValue: number; excessCount: number; hasBillingErrors: boolean; errorValue: number; errorCount: number; };
  charts: {
    costsByDepartment: Array<{ name: string; total: number }>;
    monthlyTrends: Array<{ month: string; data_mb: number; voice_min: number; total_spent: number }>;
    expensiveLines: Array<{ phone: string; total: number }>;
    topDataLines: Array<{ phone: string; responsible: string; total_mb: number }>;
  };
  opportunities: Array<{ type: string; description: string; impact: number }>;
  errors: Array<{ type: string; description: string; count: number }>;
}

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      if (wsData) setActiveWorkspace(JSON.parse(wsData));
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const response = await apiGet(`/reports/dashboard-stats?workspaceId=${activeWorkspace.id}`);
      setData(response);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!activeWorkspace) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Selecione um workspace para continuar.</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3, minHeight: '100vh' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
          Visão Geral da Fatura
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 33.33%' } }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Valor Total:</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#1e293b' }}>
                    {loading ? <Skeleton width={150} /> : formatCurrency(data?.summary.totalSpent || 0)}
                  </Typography>
                  <ArrowDropDownIcon sx={{ color: '#dc2626', fontSize: 32 }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                  {data?.summary.trend}% em relação ao mês anterior
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 66.66%' }, display: 'flex', gap: 2, justifyContent: { md: 'flex-end' } }}>
            <Box sx={{ bgcolor: '#f1f5f9', px: 3, py: 1.5, borderRadius: 2, textAlign: 'center', minWidth: 120 }}>
              <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontWeight: 600 }}>Dados:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                {loading ? <Skeleton /> : `${(data?.summary?.dataUsage ?? 0).toFixed(1)} MB`}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#f1f5f9', px: 3, py: 1.5, borderRadius: 2, textAlign: 'center', minWidth: 120 }}>
              <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontWeight: 600 }}>Voz:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                {loading ? <Skeleton /> : `${(data?.summary?.voiceUsage ?? 0).toFixed(1)} min`}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 calc(33.33% - 16px)' }, minWidth: 0 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Custos por Departamento</Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={data?.charts.costsByDepartment} margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} style={{ fontSize: '11px', fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}
                      label={{ position: 'right', formatter: (val: any) => formatCurrency(Number(val)), fontSize: 10, fontWeight: 700, fill: '#64748b' }}>
                      {data?.charts.costsByDepartment?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 calc(33.33% - 16px)' }, minWidth: 0 }}>
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
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 calc(33.33% - 16px)' }, minWidth: 0 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Linhas Mais Caras</Typography>
              <List disablePadding>
                {data?.charts.expensiveLines?.map((line, i) => (
                  <ListItem key={i} divider={i < (data?.charts.expensiveLines?.length ?? 0) - 1} sx={{ px: 0, py: 1.5 }}>
                    <ListItemText primary={line.phone} slotProps={{ primary: { sx: { fontWeight: 600, fontSize: '0.9rem' } } }} />
                    <Typography sx={{ fontWeight: 800, color: '#1e293b' }}>{formatCurrency(line.total)}</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 calc(33.33% - 16px)' }, minWidth: 0 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Maior Consumo de Dados (MB)</Typography>
              <List disablePadding>
                {data?.charts.topDataLines?.map((line, i) => (
                  <ListItem key={i} divider={i < (data?.charts.topDataLines?.length ?? 0) - 1} sx={{ px: 0, py: 1.5 }}>
                    <ListItemText primary={line.phone} secondary={line.responsible}
                      slotProps={{ primary: { sx: { fontWeight: 600, fontSize: '0.9rem' } }, secondary: { sx: { fontSize: '0.75rem', color: '#64748b' } } }} />
                    <Typography sx={{ fontWeight: 800, color: '#3B82F6' }}>{(line.total_mb ?? 0).toFixed(2)} MB</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" startIcon={<GetAppIcon />}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1, px: 3 }}>
          Exportar Relatório
        </Button>
      </Box>
    </Container>
  );
}
