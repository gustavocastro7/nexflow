/**
 * Client-side API client for use in browser components.
 * Auto-prefixes /api and injects JWT Bearer token.
 */
let baseURL = '';

if (typeof window !== 'undefined') {
  baseURL = window.location.origin;
}

export async function apiGet(path, options = {}) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${baseURL}/api${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, { method: 'GET', headers, ...options });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw { response: { data: err, status: res.status } };
  }

  return res.json();
}

export async function apiPost(path, body, options = {}) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${baseURL}/api${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    ...options,
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return res.json();
}

export async function apiPut(path, body, options = {}) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${baseURL}/api${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
    ...options,
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return res.json();
}

export async function apiDelete(path, options = {}) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${baseURL}/api${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, { method: 'DELETE', headers, ...options });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return res.json();
}
