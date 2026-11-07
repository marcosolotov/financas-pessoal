const GIS_URL = 'https://accounts.google.com/gsi/client';
let gisPromise;

export function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;

  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_URL}"]`);
    const script = existing || document.createElement('script');
    script.src = GIS_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => window.google?.accounts?.oauth2 ? resolve() : reject(new Error('Não foi possível carregar o login do Google.'));
    script.onerror = () => reject(new Error('Não foi possível conectar aos serviços do Google.'));
    if (!existing) document.head.appendChild(script);
  }).catch((error) => {
    gisPromise = null;
    throw error;
  });

  return gisPromise;
}

export function requestDriveAccessToken(clientId) {
  if (!window.google?.accounts?.oauth2) {
    return loadGoogleIdentity().then(() => requestDriveAccessToken(clientId));
  }
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) => {
        if (response.error) reject(new Error(response.error_description || response.error));
        else if (response.access_token) resolve(response.access_token);
        else reject(new Error('O Google não retornou autorização para o Drive.'));
      },
      error_callback: (error) => reject(new Error(error.message || 'Não foi possível abrir a autorização do Google.'))
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

export async function uploadBackupToDrive(accessToken, content, filename) {
  const boundary = `codex_drive_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadata = { name: filename, mimeType: 'application/json' };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n`,
    `--${boundary}--`
  ], { type: `multipart/related; boundary=${boundary}` });

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || 'Falha ao enviar o backup para o Google Drive.');
  return result;
}
