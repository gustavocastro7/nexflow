'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Alert, Stack, FormControl, Select, MenuItem, TextField, Tabs, Tab, useTheme,
  alpha, InputAdornment, Tooltip, Button, List, ListItemButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { apiGet } from '../../lib/api/client';
import InfiniteScroll from '../components/InfiniteScroll';
import type { Workspace, PhoneLineRow, ConsumptionCCRow, ConsumptionRespRow, DataConsumptionRow, LineDetailRow, PageResponse } from '../types';

type ReportType = 0 | 1 | 2 | 3 | 4;

const REPORT_ENDPOINTS: Record<ReportType, string> = {
  0: '/reports/phone-lines', 1: '/reports/consumption-by-cost-center',
  2: '/reports/consumption-by-responsible', 3: '/reports/consumption-by-responsible',
  4: '/reports/data-consumption',
};

const REPORT_LABELS: Record<ReportType, string> = {
  0: 'Phone Lines', 1: 'Consumption by Cost Center', 2: 'Consumption by Responsible',
  3: 'By Line', 4: 'Data Consumption',
};

const fmtMoney = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ReportsPage() {
  const theme = useTheme();
  const [tab, setTab] = useState<ReportType>(0);
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sortModel, setSortModel] = useState<{ field: string; sort: 'asc' | 'desc' } | null>(null);
  const [detailSortModel, setDetailSortModel] = useState<{ field: string; sort: 'asc' | 'desc' } | null>(null);
  const [dueDates, setDueDates] = useState<string[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandTotalMb, setGrandTotalMb] = useState(0);
  const [selectedLine, setSelectedLine] = useState<ConsumptionRespRow | null>(null);
  const [details, setDetails] = useState<LineDetailRow[]>([]);
  const [detailsPage, setDetailsPage] = useState(0);
  const [hasMoreDetails, setHasMoreDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsTotal, setDetailsTotal] = useState(0);
  const [innerTab, setInnerTab] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const [rootEl, setRootEl] = useState<Element | null>(null);
  const [detailRootEl, setDetailRootEl] = useState<Element | null>(null);

  const getActiveWorkspace = (): Workspace | null => { try { const d = sessionStorage.getItem('activeWorkspace'); return d ? JSON.parse(d) : null; } catch { return null; } };
  const ws = getActiveWorkspace();

  useEffect(() => { setRootEl(containerRef.current); setDetailRootEl(detailContainerRef.current); }, [tab]);

  useEffect(() => {
    if (!ws?.id) return;
    apiGet(`/reports/due-dates?workspaceId=${ws.id}`).then((data) => {
      const list = Array.isArray(data) ? data : [];
      setDueDates(list);
      if (list.length && !dueDate) setDueDate(list[0]);
    }).catch(err => console.error('Error loading due dates', err));
  }, [ws?.id]);

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    if (!ws?.id) return;
    if ((tab === 1 || tab === 2 || tab === 3 || tab === 4) && !dueDate) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ workspaceId: ws.id, page: String(pageNum), search });
      if (tab === 1 || tab === 2 || tab === 3 || tab === 4) params.set('dueDate', dueDate);
      const data: PageResponse<any> = await apiGet(`${REPORT_ENDPOINTS[tab]}?${params}`);
      const newItems = data.items || [];
      setRows(prev => reset ? newItems : [...prev, ...newItems]);
      setHasMore(data.hasMore);
      setPage(pageNum);
      if (data.grandTotal !== undefined) setGrandTotal(data.grandTotal);
      if ((data as any).grandTotalGb !== undefined) setGrandTotalMb((data as any).grandTotalGb);
      if (tab === 3 && reset) { setSelectedLine(newItems.length > 0 ? newItems[0] : null); if (newItems.length === 0) setDetails([]); }
    } catch (err) { console.error('Report fetch error', err); setError('Error loading report data.'); }
    finally { setLoading(false); }
  }, [ws?.id, tab, search, dueDate]);

  const fetchDetails = useCallback(async (pageNum: number, reset: boolean) => {
    if (!ws?.id || !selectedLine || !dueDate) return;
    setLoadingDetails(true);
    try {
      const params = new URLSearchParams({ workspaceId: ws.id, dueDate, phoneNumber: selectedLine.phoneNumber, page: String(pageNum) });
      const data: PageResponse<LineDetailRow> = await apiGet(`/reports/line-detail?${params}`);
      setDetails(prev => reset ? data.items : [...prev, ...data.items]);
      setHasMoreDetails(data.hasMore);
      setDetailsPage(pageNum);
      if (data.grandTotal !== undefined) setDetailsTotal(data.grandTotal);
    } catch (err) { console.error('Details fetch error', err); }
    finally { setLoadingDetails(false); }
  }, [ws?.id, selectedLine, dueDate]);

  useEffect(() => { if (tab === 3 && selectedLine) { setDetails([]); setDetailsPage(0); setHasMoreDetails(true); fetchDetails(0, true); } }, [tab, selectedLine, fetchDetails]);
  useEffect(() => { setDetailSortModel(null); }, [innerTab]);

  const refresh = useCallback(() => { setRows([]); setPage(0); setHasMore(true); setGrandTotal(0); setGrandTotalMb(0); fetchPage(0, true); }, [fetchPage]);
  useEffect(() => { setSortModel(null); refresh(); }, [tab, dueDate, refresh]);
  useEffect(() => { const timer = setTimeout(refresh, 400); return () => clearTimeout(timer); }, [search, refresh]);

  const loadMore = () => { if (!loading && hasMore) fetchPage(page + 1, false); };
  const loadMoreDetails = () => { if (!loadingDetails && hasMoreDetails) fetchDetails(detailsPage + 1, false); };

  const handleSort = (field: string) => { setSortModel(prev => ({ field, sort: prev?.field === field && prev.sort === 'asc' ? 'desc' : 'asc' })); };
  const handleDetailSort = (field: string) => { setDetailSortModel(prev => ({ field, sort: prev?.field === field && prev.sort === 'asc' ? 'desc' : 'asc' })); };

  const getSortField = (index: number): string => {
    if (tab === 0) return ['costCenterCode', 'costCenterName', 'phoneNumber', 'responsibleName', 'responsibleId'][index];
    if (tab === 1) return ['costCenterCode', 'costCenterName', 'dueDate', 'total'][index];
    if (tab === 2) return ['responsibleName', 'responsibleId', 'phoneNumber', 'costCenterCode', 'costCenterName', 'total'][index];
    if (tab === 4) return ['phoneNumber', 'responsibleName', 'costCenterCode', 'costCenterName', 'totalDataMb'][index];
    return ['item_date', 'item_time', 'description', 'destination_phone', 'duration', 'section', 'sub_section', 'charged_value'][index];
  };

  const sortedRows = useMemo(() => {
    if (!sortModel) return rows;
    const { field, sort } = sortModel;
    return [...rows].sort((a, b) => {
      const aVal = a[field], bVal = b[field];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sort === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortModel]);

  const sortedDetails = useMemo(() => {
    if (!detailSortModel) return details;
    const { field, sort } = detailSortModel;
    return [...details].sort((a, b) => {
      const aVal = a[field], bVal = b[field];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sort === 'asc' ? cmp : -cmp;
    });
  }, [details, detailSortModel]);

  const subSectionData = useMemo(() => {
    if (tab !== 3 || !details.length) return { list: [], groups: {}, summary: [] };
    const groups: Record<string, LineDetailRow[]> = {};
    const summaryMap: Record<string, number> = {};
    details.forEach(d => {
      let ss = d.sub_section || 'Outros';
      ss = ss.replace(/Servios/g, 'Serviços').replace(/Informaes/g, 'Informações');
      if (!groups[ss]) groups[ss] = [];
      groups[ss].push(d);
      summaryMap[ss] = (summaryMap[ss] || 0) + (typeof d.charged_value === 'string' ? parseFloat(d.charged_value) : (d.charged_value || 0));
    });
    const list = Object.keys(groups).sort();
    return { list, groups, summary: list.map(ss => ({ name: ss, total: summaryMap[ss] })) };
  }, [tab, details]);

  const exportCSV = () => {
    let headers: string[];
    let mapper: (item: any) => (string | number)[];
    let dataToExport: any[];
    if (tab === 0) { headers = ['Cod CC', 'Nome CC', 'Telefone', 'Responsável', 'ID']; mapper = (row: PhoneLineRow) => [row.costCenterCode, row.costCenterName, row.phoneNumber, row.responsibleName, row.responsibleId]; dataToExport = sortedRows; }
    else if (tab === 1) { headers = ['Cod CC', 'Nome CC', 'Vencimento', 'Total (R$)']; mapper = (row: ConsumptionCCRow) => [row.costCenterCode, row.costCenterName, row.dueDate, row.total]; dataToExport = sortedRows; }
    else if (tab === 2) { headers = ['Responsável', 'ID', 'Telefone', 'Cod CC', 'Nome CC', 'Total (R$)']; mapper = (row: ConsumptionRespRow) => [row.responsibleName, row.responsibleId, row.phoneNumber, row.costCenterCode, row.costCenterName, row.total]; dataToExport = sortedRows; }
    else if (tab === 4) { headers = ['Telefone', 'Responsável', 'Cód. CC', 'Nome CC', 'Dados (MB)']; mapper = (row: DataConsumptionRow) => [row.phoneNumber, row.responsibleName, row.costCenterCode, row.costCenterName, row.totalDataMb]; dataToExport = sortedRows; }
    else { headers = ['Data', 'Hora', 'Descrição', 'Destino', 'Duração', 'Seção', 'Subsessão', 'Valor (R$)']; mapper = (row: LineDetailRow) => [row.item_date, row.item_time, row.description, row.destination_phone, row.duration, row.section, row.sub_section, row.charged_value]; dataToExport = details; }

    const lines = [headers.join(';'), ...dataToExport.map(row => mapper(row).map(val => typeof val === 'number' ? val.toFixed(2).replace('.', ',') : `"${val}"`).join(';'))];
    if (tab === 2) lines.push(`"TOTAL";;;;;"${grandTotal.toFixed(2).replace('.', ',')}"`);
    if (tab === 3 && selectedLine) lines.push(`"LINE TOTAL";;;;;;;"${detailsTotal.toFixed(2).replace('.', ',')}"`);
    if (tab === 4) lines.push(`"GRAND TOTAL";;;;"${grandTotalMb.toFixed(2).replace('.', ',')}"`);

    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report_${REPORT_LABELS[tab].replace(/ /g, '_')}_${ws?.name}.csv`;
    a.click();
  };

  if (!ws) return <Box sx={{ p: 4 }}><Alert severity="warning">Selecione um workspace para visualizar os relatórios.</Alert></Box>;

  const renderSortIcon = (isSorted: boolean, asc: boolean | null) => {
    if (!isSorted) return null;
    return asc ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  const headerCell = (label: string, index: number, isDetail = false, align?: 'right') => {
    const field = isDetail ? (['item_date', 'item_time', 'description', 'destination_phone', 'duration', 'section', 'sub_section', 'charged_value'][index]) : getSortField(index);
    const model = isDetail ? detailSortModel : sortModel;
    const handle = isDetail ? handleDetailSort : handleSort;
    return (
      <TableCell key={label} align={align} sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 700, whiteSpace: 'nowrap' }} onClick={() => handle(field)}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>{label}{renderSortIcon(model?.field === field, model?.field === field ? (model?.sort === 'asc') : null)}</Stack>
      </TableCell>
    );
  };

  const renderHead = () => {
    if (tab === 0) return <TableRow>{['CC Code', 'CC Name', 'Phone Number', 'Responsible', 'ID'].map((l, i) => headerCell(l, i))}</TableRow>;
    if (tab === 1) return <TableRow>{['CC Code', 'CC Name', 'Due Date', 'Total'].map((l, i) => headerCell(l, i, false, i === 3 ? 'right' : undefined))}</TableRow>;
    if (tab === 2) return <TableRow>{['Responsible', 'ID', 'Phone Number', 'CC Code', 'CC Name', 'Total'].map((l, i) => headerCell(l, i, false, i === 5 ? 'right' : undefined))}</TableRow>;
    if (tab === 4) return <TableRow>{['Phone Number', 'Responsible', 'CC Code', 'CC Name', 'Data (MB)'].map((l, i) => headerCell(l, i, false, i === 4 ? 'right' : undefined))}</TableRow>;
    return <TableRow>{['Data', 'Time', 'Description', 'Destination', 'Duration/Qty', 'Section', 'Sub-section', 'Total'].map((l, i) => headerCell(l, i, true, i === 7 ? 'right' : undefined))}</TableRow>;
  };

  const renderRow = (r: any, i: number) => {
    if (tab === 0) { const p = r as PhoneLineRow; return <TableRow key={p.id} hover><TableCell sx={{ fontWeight: 700 }}>{p.costCenterCode}</TableCell><TableCell>{p.costCenterName}</TableCell><TableCell sx={{ fontWeight: 600 }}>{p.phoneNumber}</TableCell><TableCell>{p.responsibleName}</TableCell><TableCell>{p.responsibleId}</TableCell></TableRow>; }
    if (tab === 1) { const c = r as ConsumptionCCRow; return <TableRow key={i} hover><TableCell sx={{ fontWeight: 700 }}>{c.costCenterCode}</TableCell><TableCell>{c.costCenterName}</TableCell><TableCell>{c.dueDate ? new Date(c.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : '-'}</TableCell><TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>{fmtMoney(c.total)}</TableCell></TableRow>; }
    if (tab === 2) { const v = r as ConsumptionRespRow; return <TableRow key={i} hover><TableCell sx={{ fontWeight: 700 }}>{v.responsibleName}</TableCell><TableCell>{v.responsibleId}</TableCell><TableCell sx={{ fontWeight: 600 }}>{v.phoneNumber}</TableCell><TableCell>{v.costCenterCode}</TableCell><TableCell>{v.costCenterName}</TableCell><TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>{fmtMoney(v.total)}</TableCell></TableRow>; }
    if (tab === 4) { const d = r as DataConsumptionRow; return <TableRow key={d.phoneNumber} hover><TableCell sx={{ fontWeight: 600 }}>{d.phoneNumber}</TableCell><TableCell>{d.responsibleName}</TableCell><TableCell sx={{ fontWeight: 700 }}>{d.costCenterCode}</TableCell><TableCell>{d.costCenterName}</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>{(d.totalDataMb || 0).toFixed(2)}</TableCell></TableRow>; }
    return null;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mr: 1 }}>Relatórios</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem', fontWeight: 700 } }}>
          <Tab label="Phone Lines" /><Tab label="By Cost Center" /><Tab label="By Responsible" /><Tab label="By Line" /><Tab label="Data Consumption" />
        </Tabs>
        <Box sx={{ flex: 1 }} />
        {(tab === 1 || tab === 2 || tab === 3 || tab === 4) && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={dueDate} onChange={e => setDueDate(e.target.value)} displayEmpty>
              <MenuItem value="" disabled>Due Date</MenuItem>
              {dueDates.map(d => (<MenuItem key={d} value={d}>{new Date(d + 'T12:00:00Z').toLocaleDateString('en-US')}</MenuItem>))}
            </Select>
          </FormControl>
        )}
        <TextField size="small" placeholder="Search by CC code, name, responsible, phone, section or sub-section…" value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 320 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <Tooltip title="Atualizar"><IconButton onClick={refresh} size="small" color="primary"><RefreshIcon /></IconButton></Tooltip>
        <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCSV} disabled={tab === 3 ? details.length === 0 : rows.length === 0}>CSV</Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {tab === 3 ? (
        <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
          <Paper sx={{ width: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Lines / Responsible</Typography></Box>
            <Box ref={containerRef} sx={{ flex: 1, overflowY: 'auto' }}>
              <List disablePadding>
                {rows.map((row: ConsumptionRespRow) => (
                  <ListItemButton key={row.phoneNumber} selected={selectedLine?.phoneNumber === row.phoneNumber} onClick={() => { setSelectedLine(row); setInnerTab(0); }}
                    sx={{ py: 1, px: 2, borderLeft: selectedLine?.phoneNumber === row.phoneNumber ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.phoneNumber}</Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.responsibleName}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{fmtMoney(row.total)}</Typography>
                    </Box>
                  </ListItemButton>
                ))}
                <InfiniteScroll loadMore={loadMore} hasMore={hasMore} loading={loading} root={rootEl} />
              </List>
            </Box>
          </Paper>

          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedLine ? (
              <>
                <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <Box><Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{selectedLine.phoneNumber}</Typography><Typography variant="caption">{selectedLine.responsibleName} | {selectedLine.costCenterName}</Typography></Box>
                  <Box sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ display: 'block' }}>Gasto Total da Linha</Typography><Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 900 }}>{fmtMoney(detailsTotal)}</Typography></Box>
                </Box>
                <Box sx={{ px: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                  <Tabs value={innerTab} onChange={(_, v) => setInnerTab(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0, fontSize: '0.75rem', fontWeight: 700 } }}>
                    <Tab label="All Data" /><Tab label="Summary" />
                    {subSectionData.list.map((ss) => (<Tab key={ss} label={ss} />))}
                  </Tabs>
                </Box>
                <TableContainer ref={detailContainerRef} sx={{ flex: 1, overflow: 'auto' }}>
                  {innerTab === 1 ? (
                    <Table stickyHeader size="small">
                      <TableHead><TableRow><TableCell>Subsessão</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
                      <TableBody>
                        {subSectionData.summary.map((s) => (<TableRow key={s.name} hover><TableCell sx={{ fontWeight: 700 }}>{s.name}</TableCell><TableCell align="right" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{fmtMoney(s.total)}</TableCell></TableRow>))}
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}><TableCell sx={{ fontWeight: 900 }}>TOTAL GERAL</TableCell><TableCell align="right" sx={{ fontWeight: 900 }}>{fmtMoney(detailsTotal)}</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <Table stickyHeader size="small">
                      <TableHead>{renderHead()}</TableHead>
                      <TableBody>
                        {(innerTab === 0 ? sortedDetails : subSectionData.groups[subSectionData.list[innerTab - 2]] || []).map((d) => (
                          <TableRow key={d.id} hover>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{d.item_date}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{d.item_time}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{d.destination_phone}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{d.duration || d.quantity}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{d.section}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{d.sub_section}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{fmtMoney(d.charged_value)}</TableCell>
                          </TableRow>
                        ))}
                        {innerTab === 0 && <TableRow><TableCell colSpan={8} sx={{ p: 0, border: 0 }}><InfiniteScroll loadMore={loadMoreDetails} hasMore={hasMoreDetails} loading={loadingDetails} root={detailRootEl} /></TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  )}
                </TableContainer>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.disabled">Selecione uma linha para ver os detalhes</Typography></Box>
            )}
          </Paper>
        </Box>
      ) : (
        <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <TableContainer ref={containerRef} sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>{renderHead()}</TableHead>
              <TableBody>
                {sortedRows.length === 0 && !loading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8, color: 'text.disabled' }}>Nenhum dado encontrado.</TableCell></TableRow>
                ) : sortedRows.map(renderRow)}
                <TableRow><TableCell colSpan={6} sx={{ p: 0, border: 0 }}><InfiniteScroll loadMore={loadMore} hasMore={hasMore} loading={loading} root={rootEl} /></TableCell></TableRow>
                {tab === 2 && rows.length > 0 && !hasMore && <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}><TableCell colSpan={5} sx={{ fontWeight: 900 }}>TOTAL EXPENDITURE</TableCell><TableCell align="right" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '1rem' }}>{fmtMoney(grandTotal)}</TableCell></TableRow>}
                {tab === 4 && rows.length > 0 && !hasMore && <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}><TableCell colSpan={4} sx={{ fontWeight: 900 }}>GRAND TOTAL</TableCell><TableCell align="right" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '1rem' }}>{grandTotalMb.toFixed(2)} MB</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
