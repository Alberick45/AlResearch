const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Set App User Model ID for Windows taskbar icon grouping
if (process.platform === "win32") {
  app.setAppUserModelId("com.researchvault.app");
}

function createWindow() {
  let iconPath = path.join(__dirname, "dist", "icon.png");
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, "public", "icon.png");
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Research Knowledge Vault",
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
    autoHideMenuBar: true,
  });

  // Intercept window close event to sync data first
  let isQuitting = false;
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.webContents.send("app-close");
    }
  });

  // Handle confirmation to quit from React renderer
  ipcMain.once("confirm-close", () => {
    isQuitting = true;
    app.quit();
  });

  // Load the built dist index.html
  win.loadFile(path.join(__dirname, "dist", "index.html")).catch((err) => {
    console.error("Failed to load build index.html. Make sure you run 'npm run build' first.", err);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
