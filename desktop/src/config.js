const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const DEFAULTS = { serverUrl: null, notifications: true, keepInTray: true, hotkey: "CommandOrControl+Alt+V", cursor: null, bounds: null, maximized: false, trayHintShown: false };
let cfg = { ...DEFAULTS };

const configFile = () => path.join(app.getPath("userData"), "config.json");

function loadConfig() {
  try {
    cfg = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(configFile(), "utf8")) };
  } catch {
    cfg = { ...DEFAULTS };
  }
}

function saveConfig() {
  try {
    fs.mkdirSync(path.dirname(configFile()), { recursive: true });
    fs.writeFileSync(configFile(), JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.error("[config]", err);
  }
}

const getConfig = () => cfg;
const updateConfig = (newCfg) => { cfg = { ...cfg, ...newCfg }; };

module.exports = { getConfig, updateConfig, loadConfig, saveConfig };
