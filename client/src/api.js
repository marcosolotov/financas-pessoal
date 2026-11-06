const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function handleUnauthorized() {
  localStorage.removeItem('token');
  if (window.location.hash && window.location.hash.slice(1).startsWith('/login')) return;
  window.location.hash = '#/login';
}

export async function api(path, { method = 'GET', body, params } = {}) {
  let url = BASE + path;
  if (params) url += '?' + new URLSearchParams(params).toString();

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Sessão expirada');
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}