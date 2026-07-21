// Margins desktop (Electron) main process.
//
// Starts the bundled Express server on a free local port, points its storage at
// a stable, Finder-visible folder (~/Documents/Margins) so your essays are easy
// to find and back up, then opens a window onto the app.

const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const { pathToFileURL } = require("node:url");

let serverPort = null;
let dataDir = null;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function canConnect(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
  });
}

async function waitForServer(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canConnect(port)) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

async function startServer() {
  serverPort = await getFreePort();
  dataDir = path.join(app.getPath("documents"), "Margins");
  fs.mkdirSync(dataDir, { recursive: true });

  process.env.PORT = String(serverPort);
  process.env.DATA_DIR = dataDir;
  process.env.NODE_ENV = "production";

  const serverPath = path.join(__dirname, "..", "server", "index.js");
  await import(pathToFileURL(serverPath).href);

  const ok = await waitForServer(serverPort);
  if (!ok) {
    dialog.showErrorBox(
      "Margins couldn't start",
      "The local writing server did not respond. Please try reopening the app."
    );
    app.quit();
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "Margins",
    backgroundColor: "#c8c8c8",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  win.loadURL(`http://127.0.0.1:${serverPort}/`);
  return win;
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: "Margins",
            submenu: [
              { role: "about" },
              { type: "separator" },
              {
                label: "Where are my essays?",
                click: () =>
                  dialog.showMessageBox({
                    type: "info",
                    title: "Your essays",
                    message: "Every essay is a .md file saved here:",
                    detail: dataDir,
                    buttons: ["Reveal in Finder", "OK"],
                    defaultId: 0,
                  }).then((r) => {
                    if (r.response === 0) shell.openPath(dataDir);
                  }),
              },
              { type: "separator" },
              { role: "hide" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Reveal Essays Folder in Finder",
          accelerator: "CmdOrCtrl+Shift+O",
          click: () => dataDir && shell.openPath(dataDir),
        },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "window", submenu: [{ role: "minimize" }, { role: "zoom" }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  await startServer();
  buildMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
