import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Alert, Stack, FormControl, Select,
  MenuItem, TextField, Tabs, Tab, useTheme, alpha, InputAdornment, Tooltip, Button,
  List, ListItemButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import apiClient from '../api/client';
import InfiniteScroll from '../components/InfiniteScroll';
import type { Workspace } from '../types';

interface PhoneLineRow {
  id: string;
  costCenterCode: string;
  costCenterName: string;
  phoneNumber: string;
  responsibleName: string;
  responsibleId: string;
}

interface ConsumptionCCRow {
  costCenterCode: string;
  costCenterName: string;
  dueDate: string;
  total: number;
}

interface ConsumptionRespRow {
  responsibleName: string;
  responsibleId: string;
  phoneNumber: string;
  costCenterCode: string;
  costCenterName: string;
  total: number;
}

interface ConsumptionSubSectionRow {
  phoneNumber: string;
  responsibleName: string;
  section: string;
  subSection: string;
  total: number;
}

interface LineDetailRow {
  id: string;
  item_date: string;
  item_time: string;
  description: string;
  destination_phone: string;
  duration: string;
  quantity: number;
  total_value: number;
  charged_value: number;
  section: string;
  sub_section: string;
}

interface PageResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  grandTotal?: number;
}

type ReportType = 0 | 1 | 2 | 3;

const REPORT_ENDPOINTS: Record<ReportType, string> = {
  0: '/reports/phone-lines',
  1: '/reports/consumption-by-cost-center',
  2: '/reports/consumption-by-responsible',
  3: '/reports/consumption-by-responsible', // Use responsible report as master list for By Line
};

const REPORT_LABELS: Record<ReportType, string> = {
  0: 'Linhas Telefônicas',
  1: 'Consumo por Centro de Custo',
  2: 'Consumo por Responsável',
  3: 'Por Linha',
};

const fmtMoney = (v: number) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const RelatoriosPage: React.FC = () => {
  const theme = useTheme();
  const [tab, setTab] = useState<ReportType>(0);
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueDates, setDueDates] = useState<string[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  // New states for master-detail (By Line report)
  const [selectedLine, setSelectedLine] = useState<ConsumptionRespRow | null>(null);
  const [details, setDetails] = useState<LineDetailRow[]>([]);
  const [detailsPage, setDetailsPage] = useState(0);
  const [hasMoreDetails, setHasMoreDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsTotal, setDetailsTotal] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const [rootEl, setRootEl] = useState<Element | null>(null);
  const [detailRootEl, setDetailRootEl] = useState<Element | null>(null);

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const d = sessionStorage.getItem('activeWorkspace');
      return d ? JSON.parse(d) : null;
    } catch {
      return null;
    }
  };
  const ws = getActiveWorkspace();

  useEffect(() => { 
    setRootEl(containerRef.current); 
    setDetailRootEl(detailContainerRef.current);
  }, [tab]);

  // Load available due dates
  useEffect(() => {
    if (!ws?.id) return;
    apiClient.get<string[]>(`/reports/due-dates?workspaceId=${ws.id}`)
      .then(res => {
        setDueDates(res.data);
        if (res.data.length && !dueDate) setDueDate(res.data[0]);
      })
      .catch((err) => {
        console.error('Error loading due dates', err);
      });
  }, [ws?.id, dueDate]);

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    if (!ws?.id) return;
    if ((tab === 1 || tab === 2 || tab === 3) && !dueDate) return;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        workspaceId: ws.id,
        page: String(pageNum),
        search,
      });
      if (tab === 1 || tab === 2 || tab === 3) params.set('dueDate', dueDate);

      const { data } = await apiClient.get<PageResponse<any>>(
        `${REPORT_ENDPOINTS[tab]}?${params}`
      );

      const newItems = data.items || [];
      setRows(prev => reset ? newItems : [...prev, ...newItems]);
      setHasMore(data.hasMore);
      setPage(pageNum);
      if (data.grandTotal !== undefined) setGrandTotal(data.grandTotal);

      // Auto-select first line in By Line report
      if (tab === 3 && reset && newItems.length > 0) {
        setSelectedLine(newItems[0]);
      } else if (tab === 3 && reset && newItems.length === 0) {
        setSelectedLine(null);
        setDetails([]);
      }
    } catch (err) {
      console.error('Report fetch error', err);
      setError('Error loading report data.');
    } finally {
      setLoading(false);
    }
  }, [ws?.id, tab, search, dueDate]);

  const fetchDetails = useCallback(async (pageNum: number, reset: boolean) => {
    if (!ws?.id || !selectedLine || !dueDate) return;

    setLoadingDetails(true);
    try {
      const params = new URLSearchParams({
        workspaceId: ws.id,
        dueDate: dueDate,
        phoneNumber: selectedLine.phoneNumber,
        page: String(pageNum),
      });

      const { data } = await apiClient.get<PageResponse<LineDetailRow>>(
        `/reports/line-detail?${params}`
      );

      setDetails(prev => reset ? data.items : [...prev, ...data.items]);
      setHasMoreDetails(data.hasMore);
      setDetailsPage(pageNum);
      if (data.grandTotal !== undefined) setDetailsTotal(data.grandTotal);
    } catch (err) {
      console.error('Details fetch error', err);
    } finally {
      setLoadingDetails(false);
    }
  }, [ws?.id, selectedLine, dueDate]);

  useEffect(() => {
    if (tab === 3 && selectedLine) {
      setDetails([]);
      setDetailsPage(0);
      setHasMoreDetails(true);
      fetchDetails(0, true);
    }
  }, [tab, selectedLine, fetchDetails]);

  const refresh = useCallback(() => {
    setRows([]);
    setPage(0);
    setHasMore(true);
    setGrandTotal(0);
    fetchPage(0, true);
  }, [fetchPage]);

  useEffect(() => { refresh(); }, [tab, dueDate, refresh]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(refresh, 400);
    return () => clearTimeout(timer);
  }, [search, refresh]);

  const loadMore = () => {
    if (!loading && hasMore) fetchPage(page + 1, false);
  };

  const loadMoreDetails = () => {
    if (!loadingDetails && hasMoreDetails) fetchDetails(detailsPage + 1, false);
  };

  const exportCSV = () => {
    let headers: string[];
    let mapper: (item: any) => (string | number)[];

    if (tab === 0) {
      headers = ['Cod CC', 'Nome CC', 'Telefone', 'Responsável', 'ID'];
      mapper = (row: PhoneLineRow) => [row.costCenterCode, row.costCenterName, row.phoneNumber, row.responsibleName, row.responsibleId];
    } else if (tab === 1) {
      headers = ['Cod CC', 'Nome CC', 'Vencimento', 'Total (R$)'];
      mapper = (row: ConsumptionCCRow) => [row.costCenterCode, row.costCenterName, row.dueDate, row.total];
    } else if (tab === 2) {
      headers = ['Responsável', 'ID', 'Telefone', 'Cod CC', 'Nome CC', 'Total (R$)'];
      mapper = (row: ConsumptionRespRow) => [row.responsibleName, row.responsibleId, row.phoneNumber, row.costCenterCode, row.costCenterName, row.total];
    } else {
      headers = ['Data', 'Hora', 'Descrição', 'Destino', 'Duração', 'Seção', 'Subsessão', 'Valor (R$)'];
      mapper = (row: LineDetailRow) => [row.item_date, row.item_time, row.description, row.destination_phone, row.duration, row.section, row.sub_section, row.charged_value];
    }

    const lines = [
      headers.join(';'),
      ...rows.map(row => mapper(row).map(val => typeof val === 'number' ? val.toFixed(2).replace('.', ',') : `"${val}"`).join(';')),
    ];
    if (tab === 2) lines.push(`"TOTAL";;;;;"${grandTotal.toFixed(2).replace('.', ',')}"`);
    if (tab === 3 && selectedLine) lines.push(`"TOTAL DA LINHA";;;;;;;"${detailsTotal.toFixed(2).replace('.', ',')}"`);

    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report_${REPORT_LABELS[tab].replace(/ /g, '_')}_${ws?.name}.csv`;
    a.click();
  };

  if (!ws) {
    return <Box sx={{ p: 4 }}><Alert severity="warning">Selecione um workspace para visualizar os relatórios.</Alert></Box>;
  }

  const renderHead = () => {
    if (tab === 0) return (
      <TableRow>
        <TableCell>Cód. CC</TableCell><TableCell>Nome CC</TableCell>
        <TableCell>Telefone</TableCell><TableCell>Responsável</TableCell><TableCell>ID</TableCell>
      </TableRow>
    );
    if (tab === 1) return (
      <TableRow>
        <TableCell>Cód. CC</TableCell><TableCell>Nome CC</TableCell>
        <TableCell>Vencimento</TableCell><TableCell align="right">Total</TableCell>
      </TableRow>
    );
    if (tab === 2) return (
      <TableRow>
        <TableCell>Responsável</TableCell><TableCell>ID</TableCell><TableCell>Telefone</TableCell>
        <TableCell>Cód. CC</TableCell><TableCell>Nome CC</TableCell><TableCell align="right">Total</TableCell>
      </TableRow>
    );
    // Detail view for By Line
    return (
      <TableRow>
        <TableCell>Data</TableCell><TableCell>Hora</TableCell>
        <TableCell>Descrição</TableCell><TableCell>Destino</TableCell>
        <TableCell>Duração/Qtde</TableCell><TableCell>Seção</TableCell>
        <TableCell>Subsessão</TableCell><TableCell align="right">Total</TableCell>
      </TableRow>
    );
  };

  const renderRow = (r: any, i: number) => {
    if (tab === 0) {
      const p = r as PhoneLineRow;
      return (
        <TableRow key={p.id} hover>
          <TableCell sx={{ fontWeight: 700 }}>{p.costCenterCode}</TableCell>
          <TableCell>{p.costCenterName}</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>{p.phoneNumber}</TableCell>
          <TableCell>{p.responsibleName}</TableCell>
          <TableCell>{p.responsibleId}</TableCell>
        </TableRow>
      );
    }
    if (tab === 1) {
      const c = r as ConsumptionCCRow;
      return (
        <TableRow key={i} hover>
          <TableCell sx={{ fontWeight: 700 }}>{c.costCenterCode}</TableCell>
          <TableCell>{c.costCenterName}</TableCell>
          <TableCell>{c.dueDate ? new Date(c.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : '-'}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>{fmtMoney(c.total)}</TableCell>
        </TableRow>
      );
    }
    if (tab === 2) {
      const v = r as ConsumptionRespRow;
      return (
        <TableRow key={i} hover>
          <TableCell sx={{ fontWeight: 700 }}>{v.responsibleName}</TableCell>
          <TableCell>{v.responsibleId}</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>{v.phoneNumber}</TableCell>
          <TableCell>{v.costCenterCode}</TableCell>
          <TableCell>{v.costCenterName}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>{fmtMoney(v.total)}</TableCell>
        </TableRow>
      );
    }
    // tab === 3 is handled by a different view structure, but just in case:
    return null;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
      {/* Compact header */}
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, mr: 1 }}>Relatórios</Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem', fontWeight: 700 } }}
        >
          <Tab label="Linhas Telefônicas" />
          <Tab label="Por Centro de Custo" />
          <Tab label="Por Responsável" />
          <Tab label="Por Linha" />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        {(tab === 1 || tab === 2 || tab === 3) && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>Vencimento</MenuItem>
              {dueDates.map(d => (
                <MenuItem key={d} value={d}>
                  {new Date(d + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          size="small"
          placeholder="Buscar por Cód. CC, nome, responsável, telefone, seção ou subsessão…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 320 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          }}
        />

        <Tooltip title="Atualizar">
          <IconButton onClick={refresh} size="small" color="primary"><RefreshIcon /></IconButton>
        </Tooltip>

        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={exportCSV}
          disabled={tab === 3 ? details.length === 0 : rows.length === 0}
        >
          CSV
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {tab === 3 ? (
        <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
          {/* Master List: Phones and Responsibles */}
          <Paper sx={{ width: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Linhas / Responsáveis</Typography>
            </Box>
            <Box ref={containerRef} sx={{ flex: 1, overflowY: 'auto' }}>
              <List disablePadding>
                {rows.map((row: ConsumptionRespRow) => (
                  <ListItemButton 
                    key={row.phoneNumber}
                    selected={selectedLine?.phoneNumber === row.phoneNumber}
                    onClick={() => setSelectedLine(row)}
                    sx={{ 
                      py: 1, px: 2, 
                      borderLeft: selectedLine?.phoneNumber === row.phoneNumber ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.phoneNumber}</Typography>
                      <Typography variant="caption" noWrap display="block" sx={{ color: theme.palette.text.secondary }}>{row.responsibleName}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{fmtMoney(row.total)}</Typography>
                    </Box>
                  </ListItemButton>
                ))}
                <InfiniteScroll
                  loadMore={loadMore}
                  hasMore={hasMore}
                  loading={loading}
                  root={rootEl}
                />
              </List>
            </Box>
          </Paper>

          {/* Detail View: Records for the selected line */}
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedLine ? (
              <>
                <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{selectedLine.phoneNumber}</Typography>
                    <Typography variant="caption">{selectedLine.responsibleName} | {selectedLine.costCenterName}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" display="block">Gasto Total da Linha</Typography>
                    <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 900 }}>{fmtMoney(detailsTotal)}</Typography>
                  </Box>
                </Box>
                <TableContainer ref={detailContainerRef} sx={{ flex: 1, overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>{renderHead()}</TableHead>
                    <TableBody>
                      {details.map((d) => (
                        <TableRow key={d.id} hover>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{d.item_date}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{d.item_time}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{d.destination_phone}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{d.duration || d.quantity}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{d.section}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{d.sub_section}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{fmtMoney(d.charged_value)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                          <InfiniteScroll
                            loadMore={loadMoreDetails}
                            hasMore={hasMoreDetails}
                            loading={loadingDetails}
                            root={detailRootEl}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.disabled">Selecione uma linha para ver os detalhes</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      ) : (
        <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <TableContainer ref={containerRef} sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>{renderHead()}</TableHead>
              <TableBody>
                {rows.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8, color: 'text.disabled' }}>
                      Nenhum dado encontrado.
                    </TableCell>
                  </TableRow>
                ) : rows.map(renderRow)}

                <TableRow>
                  <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                    <InfiniteScroll
                      loadMore={loadMore}
                      hasMore={hasMore}
                      loading={loading}
                      root={rootEl}
                    />
                  </TableCell>
                </TableRow>

                {tab === 2 && rows.length > 0 && !hasMore && (
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 900 }}>TOTAL DE GASTOS</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '1rem' }}>
                      {fmtMoney(grandTotal)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default RelatoriosPage;
