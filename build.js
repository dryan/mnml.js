#!/usr/bin/env node

const browserslist = require("browserslist");
const nextLatestBrowserVersion = (browser) => {
  return browserslist(`last 2 ${browser} versions`)
    .pop()
    .split(" ")
    .join("")
    .split(".")[0];
};
const browsers = ["chrome", "firefox", "safari", "edge"]
  .map((browser) => nextLatestBrowserVersion(browser))
  .sort();
const package = require("./package.json");

require("esbuild")
  .build({
    entryPoints: ["src/mnml.ts"],
    bundle: true,
    minify: true,
    sourcemap: true,
    platform: "browser",
    target: browsers,
    outdir: "dist",
    watch: process.argv.includes("--watch"),
    banner: {
      js: `/*
 * mnml.js ${package.version}
 * built for ${browsers
   .map((browser) => {
     browser = browser.charAt(0).toUpperCase() + browser.slice(1);
     return `${browser
       .split(/([\d]+)/)
       .filter((piece) => !!piece)
       .join(" ")}+`;
   })
   .join(", ")}
 */`,
    },
  })
  .catch(() => process.exit(1));
