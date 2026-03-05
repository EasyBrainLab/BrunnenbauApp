// API-Hilfsfunktionen mit CSRF-Schutz

let csrfToken = null;

export async function fetchCsrfToken() {
  const res = await fetch('/api/csrf-token', { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

export async function apiPost(url, body, isFormData = false) {
  if (!csrfToken) await fetchCsrfToken();

  const options = {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken },
  };

  if (isFormData) {
    options.body = body;
  } else {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (res.status === 403) {
    // CSRF-Token erneuern und erneut versuchen
    await fetchCsrfToken();
    options.headers['X-CSRF-Token'] = csrfToken;
    const retry = await fetch(url, options);
    return retry;
  }

  return res;
}

export async function apiPut(url, body) {
  if (!csrfToken) await fetchCsrfToken();

  const res = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(body),
  });

  return res;
}

export async function apiGet(url) {
  const res = await fetch(url, { credentials: 'include' });
  return res;
}

export async function apiDelete(url) {
  if (!csrfToken) await fetchCsrfToken();

  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  });

  return res;
}
