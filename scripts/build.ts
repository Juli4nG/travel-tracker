/**
 * Build script for Vercel deployment
 * 
 * This script:
 * 1. Builds the CSS with Tailwind
 * 2. Bundles the frontend React app
 * 3. Outputs everything to the public/ directory
 */

import { $ } from "bun";
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "public");
const SRC_DIR = join(ROOT, "src");

console.log("🏗️  Building Travel Tracker for Vercel...\n");

// 1. Clean and create public directory
console.log("1. Preparing output directory...");
if (existsSync(PUBLIC_DIR)) {
  await $`rm -rf ${PUBLIC_DIR}`;
}
mkdirSync(PUBLIC_DIR, { recursive: true });

// 2. Build CSS
console.log("2. Building CSS with Tailwind...");
await $`bun run css:build`;

// 3. Bundle the frontend
console.log("3. Bundling React frontend...");
const result = await Bun.build({
  entrypoints: [join(SRC_DIR, "app.tsx")],
  outdir: PUBLIC_DIR,
  minify: true,
  splitting: true,
  target: "browser",
  format: "esm",
  naming: {
    entry: "[name].[hash].js",
    chunk: "[name].[hash].js",
    asset: "[name].[hash][ext]",
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

if (!result.success) {
  console.error("❌ Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Get the output file name
const outputFile = result.outputs.find((o) => o.kind === "entry-point");
const jsFileName = outputFile?.path.split("/").pop() || "app.js";

console.log(`   Output: ${jsFileName}`);

// 4. Copy and update HTML
console.log("4. Creating index.html...");
const htmlTemplate = readFileSync(join(SRC_DIR, "index.html"), "utf-8");

// Update the HTML to use the bundled JS
const updatedHtml = htmlTemplate
  .replace(
    '<script type="module" src="./app.tsx"></script>',
    `<script type="module" src="/${jsFileName}"></script>`
  )
  .replace(
    "</head>",
    `  <link rel="stylesheet" href="/styles.css">\n  </head>`
  );

writeFileSync(join(PUBLIC_DIR, "index.html"), updatedHtml);

// 5. Copy CSS
console.log("5. Copying styles...");
copyFileSync(
  join(SRC_DIR, "styles.built.css"),
  join(PUBLIC_DIR, "styles.css")
);

console.log("\n✅ Build complete!");
console.log(`   Output directory: ${PUBLIC_DIR}`);
