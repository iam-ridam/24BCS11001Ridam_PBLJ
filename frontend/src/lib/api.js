const API_BASE = '/api';

/**
 * Get or create unique creator token stored in localStorage.
 * Used for receiving SSE alerts and managing creator session.
 */
export function getCreatorToken() {
  let token = localStorage.getItem('zeroburn_creator_token');
  if (!token) {
    token = 'crt_' + crypto.randomUUID();
    localStorage.setItem('zeroburn_creator_token', token);
  }
  return token;
}

export async function createSecretApi({
  ciphertext,
  iv,
  salt,
  hasPassphrase,
  maxViews,
  expiryMinutes,
  creatorToken,
}) {
  const response = await fetch(`${API_BASE}/secrets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ciphertext,
      iv,
      salt,
      hasPassphrase,
      maxViews,
      expiryMinutes,
      creatorToken,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to create encrypted secret');
  }

  return response.json();
}

export async function getSecretMetadataApi(secretId) {
  const response = await fetch(`${API_BASE}/secrets/${secretId}/meta`);
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error('Failed to retrieve secret metadata');
  }
  return response.json();
}

export async function consumeSecretApi(secretId) {
  const response = await fetch(`${API_BASE}/secrets/${secretId}/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || 'Secret cannot be revealed.');
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function getActiveSecretsApi(creatorToken) {
  const response = await fetch(`${API_BASE}/secrets/active?creatorToken=${encodeURIComponent(creatorToken)}`);
  if (!response.ok) {
    throw new Error('Failed to load active secrets');
  }
  return response.json();
}

export async function simulateTamperApi(secretId) {
  const response = await fetch(`${API_BASE}/secrets/${secretId}/simulate-tamper`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Integrity test simulation request failed');
  }
  return response.json();
}

export async function getLiveRowCountApi(secretId) {
  const response = await fetch(`${API_BASE}/secrets/${secretId}/row-count`);
  if (!response.ok) {
    throw new Error('Failed to fetch live row count');
  }
  return response.json();
}

export async function getAlertHistoryApi(creatorToken) {
  const response = await fetch(`${API_BASE}/alerts/history?creatorToken=${encodeURIComponent(creatorToken)}`);
  if (!response.ok) {
    throw new Error('Failed to load alert history');
  }
  return response.json();
}

export async function getNetworkInfoApi() {
  const response = await fetch(`${API_BASE}/system/network-info`).catch(() => null);
  if (!response || !response.ok) {
    return { lanIp: window.location.hostname, availableIps: [window.location.hostname] };
  }
  return response.json();
}
