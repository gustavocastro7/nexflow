import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import axios from 'axios';
import App from './App';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      get: vi.fn(() => Promise.resolve({ data: {} })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      put: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
    }
  };
});

test('renders login page by default', async () => {
  // Mock api-config response
  (axios.get as jest.Mock).mockResolvedValue({ data: { public_url: '' } });

  render(<App />);
  
  // Wait for the login page text to appear
  await waitFor(() => {
    expect(screen.getByText(/welcome - Teleen/i)).toBeInTheDocument();
  });
  
  expect(screen.getByLabelText(/common.email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/common.password/i)).toBeInTheDocument();
});
