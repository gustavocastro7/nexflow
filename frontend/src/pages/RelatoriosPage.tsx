import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Grid
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiClient from '../api/client';
import type { Workspace, CostCenter } from '../types';

interface ReportSummary {
  id: string;
  name: string;
  total: number;
}

interface ReportDetail {
  phone: string;
  costCenter: string;
  total: number;
  recordCount: number;
}

interface ReportGeneral {
  id: string | number;
  operator: string;
  phone: string;
  date: string;
  service: string;
  value: number;
  costCenter: string;
}

const RelatoriosPage: React.FC = () => {
  const theme = useTheme();
  const [viewTab, setViewTab] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [summary, setSummary] = useState<ReportSummary[]>([]);
  const [details, setDetails] = useState<ReportDetail[]>([]);
  const [general, setGeneral] = useState<ReportGeneral[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [costCenterId, setCostCenterId] = useState('');
  const [phone, setPhone] = useState('');

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      return wsData ? JSON.parse(wsData) : null;
    } catch (e: unknown) {
      console.error('Error parsing activeWorkspace in RelatoriosPage', e);
      return null;
    }
  };
  const activeWorkspace = getActiveWorkspace();

  const fetchCostCenters = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const response = await apiClient.get<CostCenter[]>(`/cost-centers?workspaceId=${activeWorkspace.id}`);
      setCostCenters(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      console.error('Error fetching cost centers in RelatoriosPage', err);
    }
  }, [activeWorkspace?.id]);

  const fetchData = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      console.log('RelatoriosPage: Fetching report data for workspace', activeWorkspace.id);
      const params = new URLSearchParams({
        workspaceId: activeWorkspace.id,
        mes: month,
        ano: year,
        centroCustoId: costCenterId,
        telefone: phone
      });
      const response = await apiClient.get<{ summary: ReportSummary[]; details: ReportDetail[]; general: ReportGeneral[] }>(`/reports/spending-by-cc?${params}`);
      
      console.log('RelatoriosPage: Data received', response.data);
      setSummary(response.data.summary || []);
      setDetails(response.data.details || []);
      setGeneral(response.data.general || []);
    } catch (err: unknown) {
      console.error('RelatoriosPage: Error fetching report data', err);
      setError('Error loading report data. Please check your connection or try again later.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, month, year, costCenterId, phone]);

  useEffect(() => {
    fetchCostCenters();
    fetchData();
  }, [fetchCostCenters, fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const exportCSV = () => {
    try {
      let headers: string[] = [];
      let rows: (string | number)[][] = [];
      const fileName = `report_${viewTab === 0 ? 'summary_cc' : viewTab === 1 ? 'summary_phone' : 'general'}`;

      if (viewTab === 0) {
        headers = ['Cost Center', 'Total (R$)'];
        rows = summary.map(item => [item.name, item.total || 0]);
      } else if (viewTab === 1) {
        headers = ['Phone', 'Cost Center', 'Record Count', 'Total (R$)'];
        rows = details.map(item => [item.phone, item.costCenter, item.recordCount || 0, item.total || 0]);
      } else {
        headers = ['Carrier', 'Phone', 'Date', 'Service', 'Value (R$)', 'Cost Center'];
        rows = general.map(item => [item.operator, item.phone, item.date, item.service, item.value || 0, item.costCenter]);
      }

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(v => typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v).join(';'))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_${activeWorkspace?.name}.csv`);
      link.click();
    } catch (err) {
      console.error('CSV Export error:', err);
      setError('Failed to export CSV');
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const title = `Report ${viewTab === 0 ? 'Summary by CC' : viewTab === 1 ? 'Summary by Phone' : 'General'}`;
      
      doc.setFontSize(11.2);
      doc.text(title, 14, 15);
      doc.setFontSize(6.4);
      doc.text(`Workspace: ${activeWorkspace?.name} | Filters: Year ${year}${month ? ', Month ' + month : ''}`, 14, 22);

      let tableColumn: string[] = [];
      let tableRows: any[][] = [];

      if (viewTab === 0) {
        tableColumn = ['Cost Center', 'Total (R$)'];
        tableRows = summary.map(item => [item.name, (item.total || 0).toLocaleString('pt-BR')]);
      } else if (viewTab === 1) {
        tableColumn = ['Phone', 'CC', 'Qty', 'Total'];
        tableRows = details.map(item => [item.phone, item.costCenter, item.recordCount || 0, (item.total || 0).toLocaleString('pt-BR')]);
      } else {
        tableColumn = ['Date', 'Carrier', 'Phone', 'Service', 'Value'];
        tableRows = general.map(item => [item.date, item.operator, item.phone, (item.service || '').substring(0, 30), (item.value || 0).toLocaleString('pt-BR')]);
      }

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: { fontSize: 5.6, font: 'helvetica' },
        headStyles: { fillColor: [32, 172, 172] }
      });

      doc.save(`${title.replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Export error:', err);
      setError('Failed to export PDF');
    }
  };

  if (!activeWorkspace) {
    return (
      <Container maxWidth="md" sx={{ mt: 10 }}>
        <Alert severity="warning">No active workspace selected. Please select a workspace to view reports.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 0 }}>
      <Container maxWidth={false} sx={{ py: 4 }}>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Analytical Reports</Typography>
                <Typography variant="body1" color="textSecondary">
                  Detailed consumption analysis and cost distribution in <b>{activeWorkspace.name}</b>.
                </Typography>
              </Box>
        <Tabs 
          value={viewTab} 
          onChange={(_, v) => setViewTab(v)}
          sx={{ 
            '& .MuiTabs-indicator': { height: 4, borderRadius: '4px 4px 0 0' },
            '& .MuiTab-root': { fontWeight: 700, fontSize: '0.9rem' }
          }}
        >
          <Tab label="Summary by CC" />
          <Tab label="Summary by Phone" />
          <Tab label="Overview" />
        </Tabs>
        
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCSV} color="primary" sx={{ borderRadius: 2 }}>CSV</Button>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportPDF} color="error" sx={{ borderRadius: 2 }}>PDF</Button>
        </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflow: 'hidden' }}>
          <Table stickyHeader>
            <TableHead>
              {viewTab === 0 && (
                <TableRow>
                  <TableCell>Cost Center</TableCell>
                  <TableCell align="right">Total Investment</TableCell>
                </TableRow>
              )}
              {viewTab === 1 && (
                <TableRow>
                  <TableCell>Phone</TableCell>
                  <TableCell>Cost Center</TableCell>
                  <TableCell align="center">Records</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              )}
              {viewTab === 2 && (
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Carrier</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Service/Description</TableCell>
                  <TableCell>CC</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {viewTab === 0 && summary.map(item => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                    R$ {(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              {viewTab === 1 && details.map((item, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{item.phone}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>{item.costCenter}</Typography>
                  </TableCell>
                  <TableCell align="center">{item.recordCount || 0}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                    R$ {(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              {viewTab === 2 && general.map((item, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ 
                      display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.75rem', fontWeight: 700,
                      bgcolor: (item.operator === 'claro' || item.operator === 'claro_txt') ? alpha('#E11D48', 0.1) : alpha('#7C3AED', 0.1),
                      color: (item.operator === 'claro' || item.operator === 'claro_txt') ? '#E11D48' : '#7C3AED',
                      textTransform: 'uppercase'
                    }}>{item.operator || 'Unknown'}</Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.phone}</TableCell>
                  <TableCell sx={{ fontSize: '0.825rem', color: theme.palette.text.secondary }}>{item.service}</TableCell>
                  <TableCell sx={{ fontSize: '0.825rem' }}>{item.costCenter}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>R$ {(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
              
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell colSpan={viewTab === 2 ? 5 : viewTab === 1 ? 3 : 1} sx={{ fontWeight: 900, py: 3 }}>FINAL SUMMARY</TableCell>
                {viewTab === 0 && (
                  <TableCell align="right" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '1.1rem' }}>R$ {summary.reduce((a, b) => a + (b.total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                )}
                {viewTab === 1 && (
                  <TableCell align="right" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '1.1rem' }}>R$ {details.reduce((a, b) => a + (b.total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                )}
                {viewTab === 2 && (
                  <TableCell align="right" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '1.1rem' }}>R$ {general.reduce((a, b) => a + (b.value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
    </Box>
  );
};

export default RelatoriosPage;
