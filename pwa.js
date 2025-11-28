let deferredPrompt = null;

export function listenToInstallPrompt(callback) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    callback(); // avisa o React para mostrar o botão
  });
}

export async function triggerInstall() {
  if (!deferredPrompt) return null;

  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return result;
}
