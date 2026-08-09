(() => {
  if (window.__ackinackiWalletInjected) return;
  window.__ackinackiWalletInjected = true;

  const TARGET = "ackinacki-wallet";

  function request(method, params) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      const timer = setTimeout(() => reject(new Error("wallet timeout")), 120000);
      const handler = (ev) => {
        const data = ev.data;
        if (!data || data.target !== TARGET || data.id !== id) return;
        window.removeEventListener("message", handler);
        clearTimeout(timer);
        if (data.ok) resolve(data.result);
        else reject(new Error(data.error || "wallet error"));
      };
      window.addEventListener("message", handler);
      window.postMessage({ source: TARGET, id, method, params }, "*");
    });
  }

  window.ackinacki = {
    isAckiNacki: true,
    request,
    enable: () => request("ackn_accounts"),
    getAccount: () => request("ackn_accounts"),
    getBalance: (accountId) => request("ackn_balance", { accountId }),
    send: (params) => request("ackn_send", params),
    call: (params) => request("ackn_call", params),
    sign: (data) => request("ackn_sign", { data }),
  };
})();