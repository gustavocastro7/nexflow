import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Container, 
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
  Stack,
  Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import apiClient from '../api/client';
import type { Workspace, Invoice } from '../types';

const FaturasPage: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      return wsData ? JSON.parse(wsData) : null;
    } catch (e: unknown) {
      return null;
    }
  };
  const activeWorkspace = getActiveWorkspace();

  const fetchInvoices = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const response = await apiClient.get<Invoice[]>(`/invoices?workspaceId=${activeWorkspace.id}`);
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError('Error loading invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (!file || !activeWorkspace?.id) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        setError('');
        await apiClient.post(`/invoices/${type}/import`, { 
          content,
          workspaceId: activeWorkspace.id 
        });
        setSuccess(`Invoice ${type.toUpperCase()} imported successfully!`);
        fetchInvoices();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error importing file. Check the format.');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const getCarrierInfo = (carrier: string) => {
    switch (carrier) {
      case 'claro': return { label: 'Claro (Pos)', color: '#E11D48' };
      case 'claro_txt': return { label: 'Claro TXT', color: '#E11D48' };
      case 'vivo': return { label: 'Vivo', color: '#7C3AED' };
      default: return { label: carrier, color: '#64748B' };
    }
  };

  return (
    <Container maxWidth={false}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Invoice Management</Typography>
          <Typography variant="body1" color="textSecondary">
            View and import Claro (Positional and TXT) and Vivo (TSV) invoices.
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{ bgcolor: '#E11D48', '&:hover': { bgcolor: '#BE123C' } }}
          >
            Upload Claro (TXT)
            <input type="file" hidden onChange={(e) => handleFileUpload(e, 'claro-txt')} />
          </Button>
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ color: '#E11D48', borderColor: '#E11D48', '&:hover': { borderColor: '#BE123C', bgcolor: alpha('#E11D48', 0.05) } }}
          >
            Claro Positional
            <input type="file" hidden onChange={(e) => handleFileUpload(e, 'claro')} />
          </Button>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}
          >
            Upload Vivo (TSV)
            <input type="file" hidden onChange={(e) => handleFileUpload(e, 'vivo')} />
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Carrier</TableCell>
                  <TableCell>Origin</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell>Date/Time</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                      <Stack alignItems="center" spacing={2} sx={{ opacity: 0.5 }}>
                        <ReceiptLongIcon sx={{ fontSize: 48 }} />
                        <Typography variant="body1">No invoices found.</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => {
                    const carrier = getCarrierInfo(inv.carrier);
                    return (
                      <TableRow key={inv.id} hover>
                        <TableCell>
                          <Chip label={carrier.label} size="small" sx={{ 
                            bgcolor: alpha(carrier.color, 0.1), color: carrier.color, fontWeight: 700, borderRadius: 1
                          }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{inv.source_phone}</TableCell>
                        <TableCell>{inv.destination_phone || '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {inv.item_date} <Typography variant="caption" color="textSecondary">{inv.item_time}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 250 }} noWrap title={inv.description}>
                            {inv.description}
                          </Typography>
                        </TableCell>
                        <TableCell>{inv.duration || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                          R$ {(Number(inv.charged_value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default FaturasPage;
