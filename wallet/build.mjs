import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const dist = "dist";
const zip = "wallet-extension.zip";
mkdirSync(dist, { recursive: true });
rmSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });

const common = {
  bundle: true,
  format: "esm",
  target: "chrome116",
  sourcemap: true,
  logLevel: "info",
  loader: { ".json": "json", ".txt": "text" },
};

await esbuild.build({
  ...common,
  entryPoints: ["src/background.js"],
  outfile: `${dist}/background.js`,
});

await esbuild.build({
  ...common,
  entryPoints: ["src/offscreen.js"],
  outfile: `${dist}/offscreen.js`,
});

await esbuild.build({
  ...common,
  entryPoints: ["src/inject.js"],
  outfile: `${dist}/inject.js`,
});

await esbuild.build({
  ...common,
  entryPoints: ["src/popup.js"],
  outfile: `${dist}/popup.js`,
});

await esbuild.build({
  ...common,
  entryPoints: ["src/content.js"],
  outfile: `${dist}/content.js`,
});

cpSync("manifest.json", `${dist}/manifest.json`);
cpSync("src/popup.html", `${dist}/popup.html`);
cpSync("src/popup.css", `${dist}/popup.css`);

cpSync("wasm/tvmsdk.wasm", `${dist}/tvmsdk.wasm`);
cpSync("wasm/libweb-wrapper.mjs", `${dist}/libweb-wrapper.mjs`);
cpSync("src/offscreen.html", `${dist}/offscreen.html`);
cpSync("contracts/abi", `${dist}/abi`, { recursive: true });

await zipDist();

console.log("build done ->", dist);

function zipDist() {
  rmSync(zip, { force: true });
  execSync(`cd ${dist} && zip -qr ../${zip} .`);
  console.log("package ->", zip);
}