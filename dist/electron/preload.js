"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    sendMessage: (channel, data) => electron_1.ipcRenderer.send(channel, data),
    onMessage: (channel, func) => {
        const subscription = (event, ...args) => func(...args);
        electron_1.ipcRenderer.on(channel, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(channel, subscription);
        };
    },
    // Example: Expose a function to open external links safely
    openExternal: (url) => electron_1.ipcRenderer.send('open-external-link', url),
});
