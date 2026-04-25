// API-Hilfsfunktionen mit CSRF-Schutz

let csrfToken = null;

export function withTenantContext(url) {
  if (typeof window === 'undefined') return url;

  const currentUrl = new URL(url, window.location.origin);
  const pageParams = new URLSearchParams(window.location.search);
  const tenant = pageParams.get('tenant') || pageParams.get('tenantSlug');

  if (tenant && !currentUrl.searchParams.has('tenant') && !currentUrl.searchParams.has('tenantSlug')) {
    currentUrl.searchParams.set('tenant', tenant);
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return currentUrl.toString();
  }

  return currentUrl.pathname + currentUrl.search;
}

export async function fetchCsrfToken() {
  const res = await fetch(withTenantContext('/api/csrf-token'), { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function apiRequest(url, method, body, isFormData = false) {
  if (method !== 'GET' && !csrfToken) {
    await fetchCsrfToken();
  }

  const options = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (method !== 'GET') {
    options.headers['X-CSRF-Token'] = csrfToken;
  }

  if (body !== undefined) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const targetUrl = withTenantContext(url);
  let res = await fetch(targetUrl, options);

  if (method !== 'GET' && res.status === 403) {
    await fetchCsrfToken();
    options.headers['X-CSRF-Token'] = csrfToken;
    res = await fetch(targetUrl, options);
  }

  return res;
}

export async function apiPost(url, body, isFormData = false) {
  return apiRequest(url, 'POST', body, isFormData);
}

export async function apiPut(url, body) {
  return apiRequest(url, 'PUT', body);
}

export async function apiGet(url) {
  return apiRequest(url, 'GET');
}

export async function apiDelete(url) {
  return apiRequest(url, 'DELETE');
}
