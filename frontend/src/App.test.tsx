import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import axios from 'axios';
import App from './App';

// Mock axios
vi.mock('axios');

test('renders login page by default', async () => {
  // Mock api-config response
  (axios.get as any).mockResolvedValue({ data: { public_url: '' } });

  render(<App />);
  
  // Wait for the login page text to appear
  await waitFor(() => {
    expect(screen.getByText(/Teleen Consultoria/i)).toBeInTheDocument();
  });
  
  expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
});
