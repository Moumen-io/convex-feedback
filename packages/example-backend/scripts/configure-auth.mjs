import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { execFileSync } from "node:child_process";

const targetArgs = process.argv.includes("--prod") ? ["--prod"] : [];
const { privateKey, publicKey } = await generateKeyPair("RS256", {
  extractable: true,
});

const privateKeyPem = (await exportPKCS8(privateKey))
  .trimEnd()
  .replace(/\n/g, " ");
const publicJwk = await exportJWK(publicKey);
const jwks = JSON.stringify({
  keys: [{ use: "sig", ...publicJwk }],
});

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function setEnv(name, value) {
  execFileSync(npx, ["convex", "env", ...targetArgs, "set", name], {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

setEnv("JWT_PRIVATE_KEY", privateKeyPem);
setEnv("JWKS", jwks);
