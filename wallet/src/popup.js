const $ = (id) => document.getElementById(id);

let account = null;

function rpcBg(kind, method, params) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ kind, method, params }, (resp) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (resp && resp.ok) resolve(resp.result);
      else reject(new Error((resp && resp.error) || "bg error"));
    });
  });
}

function fmtShell(v) {
  if (v === undefined || v === null) return "—";
  const s = String(v).replace(/^0x/, "");
  try {
    const n = BigInt("0x" + (s || "0"));
    const SHE = 1000000000n;
    const full = n / SHE;
    const frac = (n % SHE).toString().padStart(9, "0").replace(/0+$/, "");
    return full.toString() + (frac ? "." + frac : "");
  } catch (e) {
    return v;
  }
}

async function refresh() {
  const st = await rpcBg("rpc", "ackn_balance", {});
  const ecc = (st.balance_other || []).find((e) => String(e.currency) === "2");
  $("bal-ecc").textContent = fmtShell(ecc ? ecc.value : "0x0");
  $("bal-shell").textContent = fmtShell(st.balance);
}

async function showAccount(kp) {
  $("screen-vault").hidden = true;
  $("screen-account").hidden = false;
  account = kp;
  $("account-id").textContent = kp.account_id;
  await refresh();
}

async function main() {
  const status = await rpcBg("vault_status", null, null);
  $("screen-vault").hidden = false;
  if (!status.hasVault) {
    $("vault-create").hidden = false;
    $("vault-unlock").hidden = true;
  } else if (!status.unlocked) {
    $("vault-create").hidden = true;
    $("vault-unlock").hidden = false;
  } else {
    $("screen-vault").hidden = true;
    const kp = await rpcBg("rpc", "ackn_accounts", {});
    await showAccount(kp);
  }
}

$("btn-gen").addEventListener("click", async () => {
  try {
    const res = await rpcBg("sdk", "crypto.mnemonic_from_random", { word_count: 24 });
    $("seed").value = res.mnemonic || res.phrase || "";
  } catch (e) {
    $("vault-err").textContent = e.message || String(e);
  }
});

$("btn-create").addEventListener("click", async () => {
  $("vault-err").textContent = "";
  const phrase = $("seed").value.trim();
  const pw1 = $("pw1").value;
  const pw2 = $("pw2").value;
  if (!phrase || !pw1) return void ($("vault-err").textContent = "phrase and password required");
  if (pw1 !== pw2) return void ($("vault-err").textContent = "passwords differ");
  try {
    const kp = await rpcBg("vault_create", null, { phrase, password: pw1 });
    await showAccount(kp);
  } catch (e) {
    $("vault-err").textContent = e.message || String(e);
  }
});

$("btn-unlock").addEventListener("click", async () => {
  $("unlock-err").textContent = "";
  try {
    const kp = await rpcBg("vault_unlock", null, { password: $("upw").value });
    await showAccount(kp);
  } catch (e) {
    $("unlock-err").textContent = e.message || String(e);
  }
});

$("btn-lock").addEventListener("click", async () => {
  await rpcBg("vault_lock", null, null);
  $("screen-account").hidden = true;
  $("screen-vault").hidden = false;
  $("vault-create").hidden = true;
  $("vault-unlock").hidden = false;
});

$("btn-refresh").addEventListener("click", refresh);

$("btn-send").addEventListener("click", async () => {
  $("tx-err").textContent = "";
  $("tx-res").textContent = "";
  try {
    const params = {
      to: $("tx-to").value.trim(),
      value: $("tx-value").value,
      cc: $("tx-cc").value || 0,
      bounce: $("tx-bounce").checked,
      flags: 1,
    };
    const res = await rpcBg("rpc", "ackn_send", params);
    $("tx-res").textContent = JSON.stringify(res, null, 1).slice(0, 500);
  } catch (e) {
    $("tx-err").textContent = e.message || String(e);
  }
});

$("btn-call").addEventListener("click", async () => {
  $("cc-err").textContent = "";
  $("cc-res").textContent = "";
  let input;
  try {
    input = JSON.parse($("cc-params").value || "{}");
  } catch (e) {
    return void ($("cc-err").textContent = "params must be valid JSON");
  }
  let abi = "";
  if ($("cc-abi").value.trim()) {
    try {
      abi = JSON.stringify(JSON.parse($("cc-abi").value));
    } catch (e) {
      return void ($("cc-err").textContent = "abi must be valid JSON");
    }
  }
  try {
    const res = await rpcBg("rpc", "ackn_call", {
      to: $("cc-to").value.trim(),
      value: $("cc-value").value || 0,
      function_name: $("cc-method").value.trim(),
      input,
      abi: abi || null,
      flags: 1,
    });
    $("cc-res").textContent = JSON.stringify(res, null, 1).slice(0, 700);
  } catch (e) {
    $("cc-err").textContent = e.message || String(e);
  }
});

main().catch((e) => {
  $("vault-err").textContent = "init: " + (e.message || e);
  $("screen-vault").hidden = false;
});