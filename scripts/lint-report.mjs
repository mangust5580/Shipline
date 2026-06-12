import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

const REPORT_DIR = process.env.REPORT_DIR || "reports";
const ESLINT_OUT = process.env.ESLINT_REPORT || `${REPORT_DIR}/eslint.json`;
const STYLELINT_OUT = process.env.STYLELINT_REPORT || `${REPORT_DIR}/stylelint.json`;

async function run(cmd, args, opts = {}) {
  return await new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: opts.stdio ?? "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  // ESLint: write JSON report to file while preserving exit code
  const eslintArgs = ["eslint", ".", "-f", "json", "-o", ESLINT_OUT];

  // Stylelint: JSON formatter to stdout, redirected to file (cross-platform via node)
  // We'll capture stdout and write it ourselves to avoid shell redirection differences.
  const stylelintArgs = ["stylelint", "src/**/*.{css,scss}", "--formatter", "json"];

  const eslintCode = await run("npx", ["--no-install", ...eslintArgs]);

  // Stylelint capture
  let stylelintCode = 1;
  const stylelintJson = await new Promise((resolve) => {
    const child = spawn("npx", ["--no-install", ...stylelintArgs], {
      stdio: ["ignore", "pipe", "inherit"],
      shell: process.platform === "win32",
      env: process.env,
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString("utf8")));
    child.on("close", (code) => {
      stylelintCode = code ?? 1;
      resolve(out);
    });
  });

  const { writeFile } = await import("node:fs/promises");
  await writeFile(STYLELINT_OUT, stylelintJson, "utf8");

  // Exit non-zero if any gate failed
  process.exit(eslintCode || stylelintCode ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
