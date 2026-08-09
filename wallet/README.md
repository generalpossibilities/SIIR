# Acki Nacki Wallet (browser extension)

MetaMask-style wallet for the Acki Nacki chain (shellnet), used by the SIIR static site.

## Install in Chrome (users — no npm needed)

The ready-to-load build lives in `dist/` (already built, committed to the repo).

1. Copy/send the whole `dist/` folder, or `wallet-extension.zip` (unzip it first; `manifest.json` must be at the folder root — the zip already has it there).
2. Open `chrome://extensions`
3. Toggle **Developer mode** (top right)
4. Click **Load unpacked** → select the folder containing `manifest.json`
5. Pin "Acki Nacki Wallet" from the puzzle-piece icon, or open the popup from the site page.

> Note: `wallet-extension.zip` is also web-store-ready: on the Chrome Web Store it is the package you upload. There is no mining in this wallet — Acki Nacki is a validator chain, VMSHELL/SHELL is earned via contracts, not proof-of-work.

Distribute later via Chrome Web Store (`chrome://extensions` → "Publish" needs a one-time $5 developer account); until then the zip is the distribution artifact.

## Developer setup

```sh
npm install
npm run build   # builds dist/ + wallet-extension.zip
```

## Layout

```
src/        code (background SW, offscreen SDK host, popup, content/inject bridge)
wasm/       TVM SDK (web assembly + JS wrapper)
contracts/  multisig ABI + code for account derivation
dist/       built extension (load this folder in Chrome)
```