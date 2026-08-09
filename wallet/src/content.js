(() => {
  if (window.__ackinackiContentLoaded) return;
  window.__ackinackiContentLoaded = true;

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const data = ev.data;
    if (!data || data.source !== "ackinacki-wallet") return;
    chrome.runtime.sendMessage(
      { kind: "rpc", method: data.method, params: data.params, id: data.id },
      (resp) => {
        if (chrome.runtime.lastError) {
          window.postMessage({ target: "ackinacki-wallet", id: data.id, ok: false, error: chrome.runtime.lastError.message }, "*");
          return;
        }
        window.postMessage(
          {
            target: "ackinacki-wallet",
            id: data.id,
            ok: !!resp.ok,
            result: resp.ok ? resp.result : undefined,
            error: resp.ok ? undefined : resp.error,
          },
          "*"
        );
      }
    );
  });
})();