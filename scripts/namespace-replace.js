/**
 * Adds the package namespace to custom field API names stored inside
 * escaped datatable JSON in PipeRE Flow metadata.
 *
 * Salesforce does not namespace these values automatically because they
 * are stored as text inside stringValue rather than structured field
 * references.
 *
 * Usage:
 *   node scripts/namespace-replace.js
 *   node scripts/namespace-replace.js path/to/config.json
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG_PATH = "scripts/namespace-config.json";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadConfig(configPath) {
  const fullPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Config file not found: ${fullPath}`);
  }

  const config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

  if (
    typeof config.namespace !== "string" ||
    config.namespace.trim() === ""
  ) {
    throw new Error("Namespace is missing from the config file.");
  }

  if (
    !Array.isArray(config.targetFiles) ||
    config.targetFiles.length === 0
  ) {
    throw new Error("No target files were provided.");
  }

  if (
    !Array.isArray(config.fieldsToNamespace) ||
    config.fieldsToNamespace.length === 0
  ) {
    throw new Error("No fields were provided.");
  }

  return config;
}

function buildPatterns(field, namespace) {
  const escapedField = escapeRegex(field);
  const escapedNamespace = escapeRegex(namespace);

  return {
    unnamespaced: new RegExp(
      `(&quot;apiName&quot;:&quot;)(?!${escapedNamespace}__)(${escapedField})(&quot;)`,
      "g"
    ),
    alreadyNamespaced: new RegExp(
      `&quot;apiName&quot;:&quot;${escapedNamespace}__${escapedField}&quot;`,
      "g"
    ),
  };
}

function replaceFields(content, namespace, fields, relativePath) {
  let updated = content;
  const fieldCounts = {};

  for (const field of fields) {
    const { unnamespaced, alreadyNamespaced } = buildPatterns(
      field,
      namespace
    );

    fieldCounts[field] = {
      unnamespaced: (content.match(unnamespaced) || []).length,
      namespaced: (content.match(alreadyNamespaced) || []).length,
    };

    updated = updated.replace(
      unnamespaced,
      `$1${namespace}__$2$3`
    );
  }

  const allFresh = fields.every(
    (field) =>
      fieldCounts[field].unnamespaced === 1 &&
      fieldCounts[field].namespaced === 0
  );

  const allDone = fields.every(
    (field) =>
      fieldCounts[field].unnamespaced === 0 &&
      fieldCounts[field].namespaced === 1
  );

  if (!allFresh && !allDone) {
    const details = fields
      .map(
        (field) =>
          `${field}: unnamespaced=${fieldCounts[field].unnamespaced}, ` +
          `namespaced=${fieldCounts[field].namespaced}`
      )
      .join("; ");

    throw new Error(
      `${relativePath}: inconsistent field state — ${details}`
    );
  }

  return { updated, allFresh };
}

function prepareFile(relativePath, namespace, fields) {
  const fullPath = path.resolve(process.cwd(), relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Flow file not found: ${fullPath}`);
  }

  const original = fs.readFileSync(fullPath, "utf8");

  const { updated, allFresh } = replaceFields(
    original,
    namespace,
    fields,
    relativePath
  );

  console.log(
    `${relativePath}: ${
      allFresh ? "replaced" : "already namespaced"
    }`
  );

  return {
    fullPath,
    content: updated,
  };
}

function main() {
  const configPath =
    process.argv[2] || DEFAULT_CONFIG_PATH;

  const {
    namespace,
    targetFiles,
    fieldsToNamespace,
  } = loadConfig(configPath);

  console.log(
    `Running namespace replacement for ${namespace}`
  );

  const prepared = targetFiles.map((file) =>
    prepareFile(
      file,
      namespace,
      fieldsToNamespace
    )
  );

  for (const { fullPath, content } of prepared) {
    fs.writeFileSync(
      fullPath,
      content,
      "utf8"
    );
  }

  console.log(
    "Namespace replacement completed successfully."
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  loadConfig,
  buildPatterns,
  replaceFields,
  prepareFile,
};