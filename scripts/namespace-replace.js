#!/usr/bin/env node
/**
 * Namespace Replacement Script (PIPE-6072)
 *
 * Performs regex-capable namespace token replacements across Salesforce source files.
 * Driven by a JSON config file for easy maintenance by the dev team.
 * Designed to be portable across multiple packages.
 *
 * Usage:
 *   node scripts/namespace-replace.js [config_file] [source_dir]
 *
 * Config file defaults to: scripts/namespace-config.json
 * Source dir defaults to:  force-app
 */

const fs = require("fs");
const path = require("path");

const CONFIG_FILE = process.argv[2] || "scripts/namespace-config.json";
const SOURCE_DIR = process.argv[3] || "force-app";

function getAllFiles(dir, extensions) {
  const extSet = new Set(extensions.map((e) => `.${e.trim()}`));
  const results = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (extSet.has(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function main() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.warn(`Warning: Config file not found at ${CONFIG_FILE}`);
    console.warn("Skipping namespace replacement. Create the config to enable this step.");
    process.exit(0);
  }

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Error: Source directory not found at ${SOURCE_DIR}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  const replacements = config.replacements || [];

  if (replacements.length === 0) {
    console.log("No replacements configured. Skipping.");
    process.exit(0);
  }

  console.log("=== Namespace Replacement ===");
  console.log(`Config: ${CONFIG_FILE}`);
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Replacements: ${replacements.length}`);
  console.log();

  let totalFilesModified = 0;

  for (let i = 0; i < replacements.length; i++) {
    const rule = replacements[i];
    const description = rule.description || `Replacement ${i + 1}`;
    const extensions = (rule.extensions || "cls,trigger,xml,js,html,cmp,page").split(",");
    const flags = rule.flags || "g";

    const regex = new RegExp(rule.pattern, flags);

    console.log(`[${i + 1}/${replacements.length}] ${description}`);
    console.log(`  Pattern:     ${rule.pattern} (flags: ${flags})`);
    console.log(`  Replacement: ${rule.replacement}`);
    console.log(`  Extensions:  ${extensions.join(", ")}`);

    const files = getAllFiles(SOURCE_DIR, extensions);
    let filesModified = 0;

    for (const filePath of files) {
      const original = fs.readFileSync(filePath, "utf8");
      const updated = original.replace(regex, rule.replacement);

      if (updated !== original) {
        fs.writeFileSync(filePath, updated, "utf8");
        filesModified++;
      }
    }

    console.log(`  Files scanned: ${files.length}`);
    console.log(`  Files modified: ${filesModified}`);
    console.log();

    totalFilesModified += filesModified;
  }

  console.log("=== Namespace Replacement Complete ===");
  console.log(`Total files modified: ${totalFilesModified}`);
}

main();
