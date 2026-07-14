import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ info: errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default', p: 4 }}>
          <Paper sx={{ p: 4, maxWidth: 600, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Algo deu errado</Typography>
            <Typography variant="body2" color="error" sx={{ mb: 1, fontWeight: 700 }}>
              {this.state.error?.name}: {this.state.error?.message}
            </Typography>
            {this.state.info?.componentStack && (
              <Box component="pre" sx={{ fontSize: '0.7rem', textAlign: 'left', maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1, mb: 2 }}>
                {this.state.info.componentStack}
              </Box>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ocorreu um erro inesperado. Tente recarregar a página.
            </Typography>
            <Button variant="contained" onClick={this.handleReload}>
              Recarregar
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
