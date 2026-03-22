import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Alert,
  alpha,
  Stack,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import apiClient from '../api/client';
import type { Workspace, Invoice } from '../types';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceDetails from '../components/invoices/InvoiceDetails';

const PAGE_SIZE = 50;

interface PaginatedInvoices {
  data: Invoice[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const FaturasPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const loadingRef = useRef(false);

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      return wsData ? JSON.parse(wsData) : null;
    } catch {
      return null;
    }
  };
  const activeWorkspace = getActiveWorkspace();

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (!activeWorkspace?.id || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedInvoices>(
        `/invoices?workspaceId=${activeWorkspace.id}&page=${pageNum}&limit=${PAGE_SIZE}`
      );
      const { data, hasMore: more } = res.data;
      setInvoices(prev => append ? [...prev, ...data] : data);
      setHasMore(more);
      setPage(pageNum);
    } catch {
      setError('Error loading invoices');
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  const loadMore = useCallback(() => {
    fetchPage(page + 1, true);
  }, [fetchPage, page]);

  const reset = useCallback(() => {
    setInvoices([]);
    setSelected(null);
    setPage(0);
    setHasMore(true);
    fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

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
          workspaceId: activeWorkspace.id,
        });
        setSuccess(`Invoice ${type.toUpperCase()} imported successfully!`);
        reset();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error importing file. Check the format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <Container maxWidth={false} sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
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
            <input type="file" hidden data-testid="upload-claro-txt" onChange={(e) => handleFileUpload(e, 'claro-txt')} />
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

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: '1 1 60%', minWidth: 0 }}>
          <InvoiceList
            invoices={invoices}
            loading={loading}
            hasMore={hasMore}
            loadMore={loadMore}
            selectedId={selected?.id}
            onSelect={setSelected}
          />
        </Box>
        <Box sx={{ flex: '1 1 40%', minWidth: 0 }}>
          <InvoiceDetails invoice={selected} />
        </Box>
      </Box>
    </Container>
  );
};

export default FaturasPage;
