const { dialog } = require("electron");

let updater = null;

function setupUpdater(app, L, checkUpdatesCallback, setQuitting) {
  if (!app.isPackaged) return;
  updater = require("electron-updater").autoUpdater;
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on("update-downloaded", async (info) => {
    const { response } = await dialog.showMessageBox({
      type: "info",
      title: "VibeWorks",
      message: L("updateReady", { v: info.version }),
      detail: L("updateDetail"),
      buttons: [L("restartNow"), L("later")],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      setQuitting(true);
      updater.quitAndInstall();
    }
  });
  updater.on("error", (err) => console.error("[update]", err?.message ?? err));
  void checkUpdatesCallback(false);
  setInterval(() => void checkUpdatesCallback(false), 6 * 3_600_000).unref?.();
}

async function checkUpdates(manual, app, L, toast) {
  if (!updater) return;
  try {
    const result = await updater.checkForUpdates();
    const latest = result?.updateInfo?.version;
    if (!manual) return;
    if (!latest || latest === app.getVersion()) {
      await dialog.showMessageBox({ type: "info", title: "VibeWorks", message: L("upToDate", { v: app.getVersion() }) });
    } else {
      toast("VibeWorks", L("updateLoading", { v: latest }));
    }
  } catch (err) {
    if (manual) await dialog.showMessageBox({ type: "warning", title: "VibeWorks", message: L("updateFailed", { msg: err?.message ?? String(err) }) });
  }
}

module.exports = { setupUpdater, checkUpdates };
