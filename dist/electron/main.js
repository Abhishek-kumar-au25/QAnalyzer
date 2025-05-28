"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
const isDev = process.env.NODE_ENV === 'development';
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false, // Disable Node.js integration in renderer for security
            webSecurity: !isDev, // Disable web security in dev to allow loading from localhost
        },
        icon: path_1.default.join(__dirname, '../../assets/electron/icon.png'), // Path to app icon
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:9005'); // Next.js dev server
        mainWindow.webContents.openDevTools();
    }
    else {
        // Load the Next.js exported static site
        mainWindow.loadURL(url_1.default.format({
            pathname: path_1.default.join(__dirname, '../../out/index.html'),
            protocol: 'file:',
            slashes: true,
        }));
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Example IPC communication (optional)
electron_1.ipcMain.on('message-from-renderer', (event, arg) => {
    console.log('Message from renderer:', arg);
    event.reply('message-from-main', 'Hello from main process!');
});
