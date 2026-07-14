import React, { useRef, useState, useEffect, memo } from 'react';
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
  Skeleton,
  Box,
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
  onSelect?: (invoice: Invoice) => void;
  isInitialLoading?: boolean;
}

const getCarrierInfo = (operator: string) => {
  switch (operator) {
    case 'claro': return { label: 'Claro (Pos)', color: '#E11D48' };
    case 'claro_txt': return { label: 'Claro TXT', color: '#E11D48' };
    case 'vivo': return { label: 'Vivo', color: '#7C3AED' };
    default: return { label: operator, color: '#64748B' };
  }
};

const InvoiceListSkeleton: React.FC = () => (
  <>
    {[...Array(10)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} /></TableCell>
        <TableCell><Skeleton variant="text" width={100} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="text" width={150} /></TableCell>
        <TableCell><Skeleton variant="text" width={120} /></TableCell>
        <TableCell align="right"><Skeleton variant="text" width={60} /></TableCell>
      </TableRow>
    ))}
  </>
);

const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  loading,
  hasMore,
  loadMore,
  selectedId,
  onSelect,
  isInitialLoading = false,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [rootEl, setRootEl] = useState<Element | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setRootEl(containerRef.current);
    }
  }, []);

  return (
    <Paper sx={{ 
      overflow: 'hidden', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative' 
    }}>
      {/* Background loading indicator for non-initial loads */}
      {loading && !isInitialLoading && !hasMore && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: 2, 
          bgcolor: alpha(theme.palette.primary.main, 0.2),
          zIndex: 10,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '30%',
            bgcolor: theme.palette.primary.main,
            animation: 'loading-bar 1.5s infinite linear',
          },
          '@keyframes loading-bar': {
            '0%': { left: '-30%' },
            '100%': { left: '100%' }
          }
        }} />
      )}

      <TableContainer
        ref={containerRef}
        data-testid="invoice-list-container"
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          // Prevent horizontal flicker during render
          contain: 'content'
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '120px' }}>Operadora</TableCell>
              <TableCell sx={{ width: '140px' }}>Origem</TableCell>
              <TableCell sx={{ width: '120px' }}>Data</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell sx={{ width: '150px' }}>Sub-Seção</TableCell>
              <TableCell align="right" sx={{ width: '120px' }}>Valor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isInitialLoading ? (
              <InvoiceListSkeleton />
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                  <Stack alignItems="center" spacing={2} sx={{ opacity: 0.5 }}>
                    <ReceiptLongIcon sx={{ fontSize: 48 }} />
                    <Typography variant="body1">Nenhum registro encontrado.</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {invoices.map((inv) => {
                  const carrier = getCarrierInfo(inv.operator);
                  const isSelected = inv.id === selectedId;
                  return (
                    <TableRow
                      key={inv.id}
                      hover
                      data-testid="invoice-row"
                      selected={isSelected}
                      onClick={() => onSelect?.(inv)}
                      sx={{ 
                        cursor: 'pointer',
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                          }
                        }
                      }}
                    >
                      <TableCell>
                        <Chip 
                          label={carrier.label} 
                          size="small" 
                          sx={{
                            bgcolor: alpha(carrier.color, 0.1), 
                            color: carrier.color, 
                            fontWeight: 700, 
                            borderRadius: 1
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {inv.source_phone}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {inv.item_date}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} 
                          title={inv.description}
                        >
                          {inv.description || inv.section || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {inv.sub_section || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                        R$ {(Number(inv.charged_value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Sentinel for Infinite Scroll */}
                <TableRow>
                  <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                    <InfiniteScroll
                      loadMore={loadMore}
                      hasMore={hasMore}
                      loading={loading}
                      root={rootEl}
                      threshold={250}
                    />
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default memo(InvoiceList);
