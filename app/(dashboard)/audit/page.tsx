'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, MenuItem, Stack, Chip, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, alpha, useTheme
} from '@mui/material';
import { History as HistoryIcon, Visibility as VisibilityIcon, Event as EventIcon, Person as PersonIcon, Computer as ComputerIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { apiGet } from '../../lib/api/client';
import type { AuditLog } from '../types';

export default function AuditPage() {
  const theme = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/audit?page=${page + 1}&limit=${rowsPerPage}${actionFilter ? `&action=${actionFilter}` : ''}${entityFilter ? `&entity=${entityFilter}` : ''}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) { console.error('Failed to fetch audit logs:', error); }
    finally { setLoading(false); }
  }, [page, rowsPerPage, actionFilter, entityFilter]);

  const fetchFilters = async () => {
    try {
      const [actionsData, entitiesData] = await Promise.all([apiGet('/audit/actions'), apiGet('/audit/entities')]);
      setActions(Array.isArray(actionsData) ? actionsData : []);
      setEntities(Array.isArray(entitiesData) ? entitiesData : []);
    } catch (error) { console.error('Failed to fetch filters:', error); }
  };

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchFilters(); }, []);

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'error';
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'success';
    if (action.includes('UPDATE')) return 'warning';
    if (action.includes('LOGIN')) return 'info';
    return 'default';
  };

  const fmtDate = (d: string | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <HistoryIcon color="primary" sx={{ fontSize: 32 }} />
        <Box><Typography variant="h4" sx={{ fontWeight: 800 }}>Auditoria</Typography><Typography variant="body1" color="textSecondary">Registro de operações realizadas no sistema.</Typography></Box>
      </Box>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField select label="Ação" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }} size="small" sx={{ minWidth: 240 }}>
            <MenuItem value="">Todas as ações</MenuItem>
            {actions.map(action => (<MenuItem key={action} value={action}>{action}</MenuItem>))}
          </TextField>
          <TextField select label="Entidade" value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }} size="small" sx={{ minWidth: 240 }}>
            <MenuItem value="">Todas as entidades</MenuItem>
            {entities.map(entity => (<MenuItem key={entity} value={entity}>{entity}</MenuItem>))}
          </TextField>
          <Button variant="outlined" startIcon={<FilterIcon />} onClick={() => { setActionFilter(''); setEntityFilter(''); setPage(0); }} sx={{ height: 40 }}>Limpar Filtros</Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 650 }} size="small">
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Data/Hora</TableCell><TableCell sx={{ fontWeight: 700 }}>Ação</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Entidade</TableCell><TableCell sx={{ fontWeight: 700 }}>Usuário</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>IP</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>Detalhes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress size={30} /></TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}>Nenhum registro de auditoria encontrado.</TableCell></TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EventIcon fontSize="inherit" color="disabled" />{fmtDate(log.created_at || log.createdAt)}</Box></TableCell>
                <TableCell><Chip label={log.action} size="small" color={getActionColor(log.action) as any} sx={{ fontWeight: 700, fontSize: '0.7rem' }} /></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{log.entity || '-'}</Typography><Typography variant="caption" color="textSecondary">{log.entity_id || ''}</Typography></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonIcon fontSize="inherit" color="disabled" /><Typography variant="body2">{log.user ? `${log.user.name} (${log.user.email})` : log.user_id}</Typography></Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ComputerIcon fontSize="inherit" color="disabled" /><Typography variant="body2">{log.ip_address || '-'}</Typography></Box></TableCell>
                <TableCell align="right"><Tooltip title="Ver detalhes"><IconButton size="small" onClick={() => { setSelectedLog(log); setDetailsOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination rowsPerPageOptions={[25, 50, 100]} component="div" count={total} rowsPerPage={rowsPerPage} page={page} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} labelRowsPerPage="Linhas por página" />
      </TableContainer>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}><HistoryIcon color="primary" />Detalhes da Operação</DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 280 }}>
                <Typography variant="caption" color="textSecondary">ID do Log</Typography><Typography variant="body2" sx={{ mb: 2 }}>{selectedLog.id}</Typography>
                <Typography variant="caption" color="textSecondary">Ação</Typography><Box sx={{ mb: 2 }}><Chip label={selectedLog.action} color={getActionColor(selectedLog.action) as any} size="small" /></Box>
                <Typography variant="caption" color="textSecondary">Data e Hora</Typography><Typography variant="body2" sx={{ mb: 2 }}>{fmtDate(selectedLog.created_at || selectedLog.createdAt)}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 280 }}>
                <Typography variant="caption" color="textSecondary">Usuário</Typography><Typography variant="body2" sx={{ mb: 2 }}>{selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : selectedLog.user_id}</Typography>
                <Typography variant="caption" color="textSecondary">Entidade Afetada</Typography><Typography variant="body2" sx={{ mb: 2 }}>{selectedLog.entity} ({selectedLog.entity_id || 'N/A'})</Typography>
                <Typography variant="caption" color="textSecondary">Endereço IP</Typography><Typography variant="body2" sx={{ mb: 2 }}>{selectedLog.ip_address || 'Não registrado'}</Typography>
              </Box>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>Dados do Payload</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.02), fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'auto' }}><pre>{JSON.stringify(selectedLog.payload, null, 2)}</pre></Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setDetailsOpen(false)} variant="contained">Fechar</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
