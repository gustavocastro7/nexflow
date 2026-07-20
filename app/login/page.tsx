'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, TextField, Typography, Paper, Container, Alert, IconButton, InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { apiPost } from '../../lib/api/client';
import { useLanguage } from '../i18n/LanguageContext';
import type { Language } from '../i18n/dictionaries';
import { SUPPORTED_LANGUAGES } from '../i18n/dictionaries';

export default function LoginPage() {
  const router = useRouter();
  const { t, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = await apiPost('/auth/login', { email, password });
      const { user, token } = data;

      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));

      if (user.config) {
        if (user.config.theme_mode) {
          localStorage.setItem('themeMode', user.config.theme_mode);
        }
        if (SUPPORTED_LANGUAGES.includes(user.config.language)) {
          setLanguage(user.config.language as Language);
        }
      }

      router.push('/dashboard');
    } catch (err: any) {
      const message = err?.response?.data?.error || t('login.error');
      setError(message);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' }}>
      <Container maxWidth="xs">
        <Paper elevation={4} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, width: '100%' }}>
            <img src="/logo.jpg" alt="Teleen Logo" style={{ height: 120, maxWidth: '100%', objectFit: 'contain' }} />
          </Box>
          <Typography variant="h5" component="h1" gutterBottom color="primary" sx={{ fontWeight: 800 }}>
            Nexflow - Teleen
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
            {t('login.subtitle')}
          </Typography>

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField margin="normal" required fullWidth id="email" label={t('login.email')} name="email"
              autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              variant="outlined" sx={{ bgcolor: '#F8FAFC' }} />

            <TextField margin="normal" required fullWidth name="password" label={t('login.password')}
              type={showPassword ? 'text' : 'password'} id="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              variant="outlined" sx={{ bgcolor: '#F8FAFC' }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }} />

            <Button type="submit" fullWidth variant="contained" color="primary"
              sx={{ mt: 4, mb: 2, height: 50, fontSize: '1rem', fontWeight: 700 }}>
              {t('login.submit')}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
