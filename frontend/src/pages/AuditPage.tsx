import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  alpha,
  useTheme
} from '@mui/material';
import {
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import apiClient from '../api/client';
import { useTranslation } from 'react-i18next';

interface AuditLog {
  id: string;
  user_id: string;
  workspace_id: string;
  action: string;
  entity: string;
  entity_id: string;
  ip_address: string;
  payload: any;
  created_at?: string;
  createdAt?: string;
  user?: {
    name: string;
    email: string;
  };
}

const AuditPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  
  // Details Dialog
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Helper for date locale
  const getDateLocale = () => {
    const lang = i18n.language;
    if (lang.startsWith('en')) return enUS;
    if (lang.startsWith('es')) return es;
    return ptBR;
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/audit', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          action: actionFilter || undefined,
          entity: entityFilter || undefined
        }
      });
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, actionFilter, entityFilter]);

  const fetchFilters = async () => {
    try {
      const [actionsRes, entitiesRes] = await Promise.all([
        apiClient.get('/audit/actions'),
        apiClient.get('/audit/entities')
      ]);
      setActions(actionsRes.data);
      setEntities(entitiesRes.data);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchFilters();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'error';
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'success';
    if (action.includes('UPDATE')) return 'warning';
    if (action.includes('LOGIN')) return 'info';
    return 'default';
  };

  return (
    <Container maxWidth={false}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <HistoryIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>{t('common.audit')}</Typography>
          <Typography variant="body1" color="textSecondary">
            {t('audit.subtitle')}
          </Typography>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label={t('audit.action')}
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              size="small"
            >
              <MenuItem value="">{t('audit.all_actions')}</MenuItem>
              {actions.map(action => (
                <MenuItem key={action} value={action}>{action}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label={t('audit.entity')}
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
              size="small"
            >
              <MenuItem value="">{t('audit.all_entities')}</MenuItem>
              {entities.map(entity => (
                <MenuItem key={entity} value={entity}>{entity}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button 
              variant="outlined" 
              startIcon={<FilterIcon />} 
              onClick={() => { setActionFilter(''); setEntityFilter(''); setPage(0); }}
            >
              {t('audit.clear_filters')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 650 }} size="small">
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('audit.date_time')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('audit.action')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('audit.entity')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('audit.user')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('audit.ip')}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{t('audit.details')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  {t('audit.no_logs')}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventIcon fontSize="inherit" color="disabled" />
                      {format(new Date(log.created_at || log.createdAt || new Date()), 'dd/MM/yyyy HH:mm:ss', { locale: getDateLocale() })}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.action} 
                      size="small" 
                      color={getActionColor(log.action)}
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.entity || '-'}</Typography>
                    <Typography variant="caption" color="textSecondary">{log.entity_id || ''}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="inherit" color="disabled" />
                      <Typography variant="body2">
                        {log.user ? `${log.user.name} (${log.user.email})` : log.user_id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ComputerIcon fontSize="inherit" color="disabled" />
                      <Typography variant="body2">{log.ip_address || '-'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t('audit.view_details')}>
                      <IconButton size="small" onClick={() => handleOpenDetails(log)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={t('audit.rows_per_page')}
        />
      </TableContainer>

      {/* Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}>
          <HistoryIcon color="primary" />
          {t('audit.op_details')}
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="textSecondary">{t('audit.log_id')}</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{selectedLog.id}</Typography>
                
                <Typography variant="caption" color="textSecondary">{t('audit.action')}</Typography>
                <Box sx={{ mb: 2 }}><Chip label={selectedLog.action} color={getActionColor(selectedLog.action)} size="small" /></Box>
                
                <Typography variant="caption" color="textSecondary">{t('audit.date_and_time')}</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{format(new Date(selectedLog.created_at || selectedLog.createdAt || new Date()), 'PPPPpppp', { locale: getDateLocale() })}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="textSecondary">{t('audit.user')}</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : selectedLog.user_id}
                </Typography>
                
                <Typography variant="caption" color="textSecondary">{t('audit.affected_entity')}</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{selectedLog.entity} ({selectedLog.entity_id || 'N/A'})</Typography>
                
                <Typography variant="caption" color="textSecondary">{t('audit.ip_address')}</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{selectedLog.ip_address || t('audit.not_registered')}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>{t('audit.payload_data')}</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.02), fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'auto' }}>
                  <pre>{JSON.stringify(selectedLog.payload, null, 2)}</pre>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDetailsOpen(false)} variant="contained">{t('audit.close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AuditPage;
