const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

let backend;
let backendPort;
let mainWindow;
let quitting = false;

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function waitForBackend(port, timeoutMs = 15000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
        response.resume();
        if (response.statusCode === 200) return resolve();
        retry();
      });
      request.setTimeout(700, () => request.destroy());
      request.on('error', retry);
    };
    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('O servidor local não iniciou a tempo.'));
        return;
      }
      setTimeout(check, 250);
    };
    check();
  });
}

async function startBackend() {
  if (backend && backend.exitCode === null) return backendPort;
  const port = await findAvailablePort();
  const dataDirectory = app.getPath('userData');
  fs.mkdirSync(dataDirectory, { recursive: true });

  backend = spawn(process.execPath, [path.join(app.getAppPath(), 'server', 'index.js')], {
    cwd: app.getAppPath(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      DB_PATH: path.join(dataDirectory, 'db.sqlite')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  backendPort = port;

  backend.stdout.on('data', (data) => console.log(`[backend] ${data}`));
  backend.stderr.on('data', (data) => console.error(`[backend] ${data}`));
  backend.once('error', (error) => console.error('Falha ao iniciar o servidor local:', error));
  backend.once('exit', (code) => {
    if (!quitting && code !== 0) console.error(`Servidor local encerrado com código ${code}.`);
  });

  await waitForBackend(port);
  return port;
}

async function createWindow() {
  const port = await startBackend();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 760,
    minHeight: 600,
    title: 'Controle Financeiro',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  await mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error(error);
    await dialog.showMessageBox({
      type: 'error',
      title: 'Não foi possível iniciar',
      message: 'O Controle Financeiro não conseguiu iniciar o servidor local.',
      detail: error.message
    });
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow().catch(console.error);
  });
});

app.on('before-quit', () => {
  quitting = true;
  if (backend && !backend.killed) backend.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
