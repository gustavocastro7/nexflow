import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Alert, Stack, FormControl, Select,
  MenuItem, TextField, Tabs, Tab, useTheme, alpha, InputAdornment, Tooltip, Button,
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
  referenceMonth: string;
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

interface PageResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  grandTotal?: number;
}

type ReportType = 0 | 1 | 2;

const REPORT_ENDPOINTS: Record<ReportType, string> = {
  0: '/reports/phone-lines',
  1: '/reports/consumption-by-cost-center',
  2: '/reports/consumption-by-responsible',
};

const REPORT_LABELS: Record<ReportType, string> = {
  0: 'Phone Lines',
  1: 'Consumption by Cost Center',
  2: 'Consumption by Responsible',
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
  const [refMonth, setRefMonth] = useState('');
  const [months, setMonths] = useState<string[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [rootEl, setRootEl] = useState<Element | null>(null);

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const d = sessionStorage.getItem('activeWorkspace');
      return d ? JSON.parse(d) : null;
    } catch {
      return null;
    }
  };
  const ws = getActiveWorkspace();

  useEffect(() => { setRootEl(containerRef.current); }, []);

  // Load available reference months
  useEffect(() => {
    if (!ws?.id) return;
    apiClient.get<string[]>(`/reports/reference-months?workspaceId=${ws.id}`)
      .then(r => {
        setMonths(r.data);
        if (r.data.length && !refMonth) setRefMonth(r.data[0]);
      })
      .catch(() => {});
  }, [ws?.id]);

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    if (!ws?.id) return;
    if (tab === 2 && !refMonth) return;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        workspaceId: ws.id,
        page: String(pageNum),
        search,
      });
      if (tab === 2) params.set('referenceMonth', refMonth);

      const { data } = await apiClient.get<PageResponse<any>>(
        `${REPORT_ENDPOINTS[tab]}?${params}`
      );

      setRows(prev => reset ? data.items : [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage(pageNum);
      if (data.grandTotal !== undefined) setGrandTotal(data.grandTotal);
    } catch (e) {
      console.error('Report fetch error', e);
      setError('Error loading report data.');
    } finally {
      setLoading(false);
    }
  }, [ws?.id, tab, search, refMonth]);

  const refresh = useCallback(() => {
    setRows([]);
    setPage(0);
    setHasMore(true);
    setGrandTotal(0);
    fetchPage(0, true);
  }, [fetchPage]);

  useEffect(() => { refresh(); }, [tab, refMonth]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(refresh, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadMore = () => {
    if (!loading && hasMore) fetchPage(page + 1, false);
  };

  const exportCSV = () => {
    let headers: string[];
    let mapper: (r: any) => (string | number)[];

    if (tab === 0) {
      headers = ['CC Code', 'CC Name', 'Phone', 'Responsible', 'ID'];
      mapper = (r: PhoneLineRow) => [r.costCenterCode, r.costCenterName, r.phoneNumber, r.responsibleName, r.responsibleId];
    } else if (tab === 1) {
      headers = ['CC Code', 'CC Name', 'Reference Month', 'Total (R$)'];
      mapper = (r: ConsumptionCCRow) => [r.costCenterCode, r.costCenterName, r.referenceMonth, r.total];
    } else {
      headers = ['Responsible', 'ID', 'Phone', 'CC Code', 'CC Name', 'Total (R$)'];
      mapper = (r: ConsumptionRespRow) => [r.responsibleName, r.responsibleId, r.phoneNumber, r.costCenterCode, r.costCenterName, r.total];
    }

    const lines = [
      headers.join(';'),
      ...rows.map(r => mapper(r).map(v => typeof v === 'number' ? v.toFixed(2).replace('.', ',') : `"${v}"`).join(';')),
    ];
    if (tab === 2) lines.push(`"TOTAL";;;;;"${grandTotal.toFixed(2).replace('.', ',')}"`);

    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report_${REPORT_LABELS[tab].replace(/ /g, '_')}_${ws?.name}.csv`;
    a.click();
  };

  if (!ws) {
    return <Box sx={{ p: 4 }}><Alert severity="warning">Select a workspace to view reports.</Alert></Box>;
  }

  const renderHead = () => {
    if (tab === 0) return (
      <TableRow>
        <TableCell>CC Code</TableCell><TableCell>CC Name</TableCell>
        <TableCell>Phone</TableCell><TableCell>Responsible</TableCell><TableCell>ID</TableCell>
      </TableRow>
    );
    if (tab === 1) return (
      <TableRow>
        <TableCell>CC Code</TableCell><TableCell>CC Name</TableCell>
        <TableCell>Reference Month</TableCell><TableCell align="right">Total</TableCell>
      </TableRow>
    );
    return (
      <TableRow>
        <TableCell>Responsible</TableCell><TableCell>ID</TableCell><TableCell>Phone</TableCell>
        <TableCell>CC Code</TableCell><TableCell>CC Name</TableCell><TableCell align="right">Total</TableCell>
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
          <TableCell>{c.referenceMonth}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>{fmtMoney(c.total)}</TableCell>
        </TableRow>
      );
    }
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
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
      {/* Compact header */}
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, mr: 1 }}>Reports</Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem', fontWeight: 700 } }}
        >
          <Tab label="Phone Lines" />
          <Tab label="By Cost Center" />
          <Tab label="By Responsible" />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        {tab === 2 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={refMonth}
              onChange={e => setRefMonth(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>Ref. Month</MenuItem>
              {months.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        )}

        <TextField
          size="small"
          placeholder="Search CC code, name, responsible or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 320 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          }}
        />

        <Tooltip title="Refresh">
          <IconButton onClick={refresh} size="small" color="primary"><RefreshIcon /></IconButton>
        </Tooltip>

        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={exportCSV}
          disabled={rows.length === 0}
        >
          CSV
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Large viewing area */}
      <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <TableContainer ref={containerRef} sx={{ flex: 1, overflow: 'auto' }}>
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} loading={loading} root={rootEl}>
            <Table stickyHeader size="small">
              <TableHead>{renderHead()}</TableHead>
              <TableBody>
                {rows.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8, color: 'text.disabled' }}>
                      No data found.
                    </TableCell>
                  </TableRow>
                ) : rows.map(renderRow)}

                {tab === 2 && rows.length > 0 && !hasMore && (
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 900 }}>TOTAL EXPENSES</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '1rem' }}>
                      {fmtMoney(grandTotal)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </InfiniteScroll>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default RelatoriosPage;
