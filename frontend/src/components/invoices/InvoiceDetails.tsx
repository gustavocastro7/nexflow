import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Divider,
  Chip,
  alpha,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { Invoice } from '../../types';

interface InvoiceDetailsProps {
  invoice: Invoice | null;
}

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <Box>
      <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
};

const getCarrierInfo = (operator: string) => {
  switch (operator) {
    case 'claro': return { label: 'Claro (Positional)', color: '#E11D48' };
    case 'claro_txt': return { label: 'Claro TXT', color: '#E11D48' };
    case 'vivo': return { label: 'Vivo', color: '#7C3AED' };
    default: return { label: operator, color: '#64748B' };
  }
};

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoice }) => {
  if (!invoice) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Stack alignItems="center" spacing={2} sx={{ opacity: 0.4 }}>
          <ReceiptLongIcon sx={{ fontSize: 64 }} />
          <Typography variant="body1">Select an invoice to view details</Typography>
        </Stack>
      </Paper>
    );
  }

  const carrier = getCarrierInfo(invoice.operator);

  return (
    <Paper sx={{ height: '100%', overflow: 'auto', p: 3 }} data-testid="invoice-details">
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Invoice Details</Typography>
          <Chip label={carrier.label} sx={{
            bgcolor: alpha(carrier.color, 0.1), color: carrier.color, fontWeight: 700
          }} />
        </Box>
        <Divider />

        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Field label="Source Phone" value={invoice.source_phone} />
          <Field label="Destination Phone" value={invoice.destination_phone} />
        </Stack>

        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Field label="Date" value={invoice.item_date} />
          <Field label="Time" value={invoice.item_time} />
          <Field label="Duration" value={invoice.duration} />
        </Stack>

        <Field label="Description" value={invoice.description} />
        <Field label="Section" value={invoice.section} />
        <Field label="Sub-Section" value={invoice.sub_section} />

        <Divider />

        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Field label="Quantity" value={invoice.quantity} />
          <Field label="Total Value" value={
            invoice.total_value != null
              ? `R$ ${Number(invoice.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : undefined
          } />
          <Field label="Charged Value" value={
            invoice.charged_value != null
              ? `R$ ${Number(invoice.charged_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : undefined
          } />
        </Stack>

        <Divider />

        <Field label="Original User" value={invoice.original_user} />
        <Field label="Original Cost Center" value={invoice.original_cost_center} />
        <Field label="Invoice ID" value={invoice.id} />
      </Stack>
    </Paper>
  );
};

export default InvoiceDetails;
