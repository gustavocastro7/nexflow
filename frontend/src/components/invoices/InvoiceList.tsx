import React, { useRef, useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import InfiniteScroll from '../InfiniteScroll';
import type { Invoice } from '../../types';

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  selectedId?: string;
  onSelect: (invoice: Invoice) => void;
}

const getCarrierInfo = (operator: string) => {
  switch (operator) {
    case 'claro': return { label: 'Claro (Pos)', color: '#E11D48' };
    case 'claro_txt': return { label: 'Claro TXT', color: '#E11D48' };
    case 'vivo': return { label: 'Vivo', color: '#7C3AED' };
    default: return { label: operator, color: '#64748B' };
  }
};

const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  loading,
  hasMore,
  loadMore,
  selectedId,
  onSelect,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [rootEl, setRootEl] = useState<Element | null>(null);

  useEffect(() => {
    setRootEl(containerRef.current);
  }, []);

  return (
    <Paper sx={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TableContainer
        ref={containerRef}
        data-testid="invoice-list-container"
        sx={{ flex: 1, overflow: 'auto' }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Carrier</TableCell>
              <TableCell>Origin</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                  <Stack alignItems="center" spacing={2} sx={{ opacity: 0.5 }}>
                    <ReceiptLongIcon sx={{ fontSize: 48 }} />
                    <Typography variant="body1">No invoices found.</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const carrier = getCarrierInfo(inv.operator);
                const isSelected = inv.id === selectedId;
                return (
                  <TableRow
                    key={inv.id}
                    hover
                    data-testid="invoice-row"
                    selected={isSelected}
                    onClick={() => onSelect(inv)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Chip label={carrier.label} size="small" sx={{
                        bgcolor: alpha(carrier.color, 0.1), color: carrier.color, fontWeight: 700, borderRadius: 1
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{inv.source_phone}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{inv.item_date}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap title={inv.description}>
                        {inv.description || inv.section || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                      R$ {(Number(inv.charged_value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            <TableRow>
              <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                <InfiniteScroll
                  loadMore={loadMore}
                  hasMore={hasMore}
                  loading={loading}
                  root={rootEl}
                >
                  {null}
                </InfiniteScroll>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default InvoiceList;
