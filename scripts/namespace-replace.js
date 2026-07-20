/**
 * namespace-replace.js
 *
 * PIPE-6072 — Namespace Replacements for the PipeRE 2GP package.
 *
 * PORTABILITY: per Kyle's note on PIPE-6072 point (c) — "this process is
 * going to be repeated over and over for other packages, so something
 * that's relatively easy to port to a different package" — namespace,
 * target files, and field names live in an external config file
 * (namespace-config.json by default) rather than hardcoded constants. To
 * port this to another package (e.g. Salesforce-to-Portal, Private Wealth),
 * copy namespace-config.json, update its three values for that package, and
 * point this script at the new config file — no changes to this file itself
 * should be needed.
 *
 * Config file defaults to scripts/namespace-config.json (relative to repo
 * root), or pass a different path as the first CLI argument:
 *   node scripts/namespace-replace.js scripts/namespace-config-portal.json
 *
 * CONFIRMED AGAINST REAL FILE CONTENT (PipeRE's two files, verified in GitHub):
 *
 * Both flow-meta.xml files contain a "columns" inputParameter whose
 * stringValue is an HTML-entity-escaped JSON array, e.g.:
 *
 *   <stringValue>[{&quot;apiName&quot;:&quot;Name&quot;,&quot;guid&quot;:
 *   &quot;column-60fc&quot;,...,&quot;label&quot;:&quot;Introduction Name&quot;,
 *   ...},{&quot;apiName&quot;:&quot;Error_Type__c&quot;,...},
 *   {&quot;apiName&quot;:&quot;Email_Send_Error__c&quot;,...}]</stringValue>
 *
 * The quotes are literally &quot; in the raw file (not real JSON) — this is
 * escaped text sitting inside an XML string element, which is exactly why
 * Salesforce's namespace injector can't touch it: it only rewrites structured
 * <field>/<object> XML elements, not arbitrary text inside a string value.
 *
 * For PipeRE specifically, the config's fieldsToNamespace deliberately
 * excludes "Name" (a standard field) — only "Error_Type__c" and
 * "Email_Send_Error__c" (custom fields) get the namespace prefix. A future
 * package's config may need a different field list entirely; that's exactly
 * what the config file is for.
 *
 * VALIDATION POLICY — WHOLE FILE, NOT PER-FIELD IN ISOLATION:
 * For each configured field we count BOTH how many unnamespaced occurrences
 * exist AND how many already-namespaced occurrences exist (counting each,
 * not just testing "does at least one exist" — a duplicated already-
 * namespaced value would otherwise slip past a plain existence check).
 *
 * The whole file must land in exactly one of two valid states across ALL
 * configured fields together:
 *   (a) allNeedReplacement — every field has exactly 1 unnamespaced
 *       occurrence and 0 already-namespaced occurrences (a fresh file).
 *   (b) allAlreadyNamespaced — every field has 0 unnamespaced occurrences
 *       and exactly 1 already-namespaced occurrence (already fully done).
 *
 * Anything else — including a MIXED state where one field is already
 * namespaced and the other isn't, or any field duplicated — fails the whole
 * file. This is deliberately strict: a mixed state is unusual enough that
 * it's worth stopping and checking by hand rather than silently finishing
 * the job.
 *
 * SAFETY:
 * - Matches only the literal &quot;apiName&quot;:&quot;<field>&quot; pattern,
 *   never a bare word — so nothing outside the apiName key is ever touched.
 *   This does NOT verify the match sits inside the intended columns input
 *   parameter specifically — safe against PipeRE's two confirmed files, but
 *   worth re-checking for any future package's files before trusting this
 *   blindly, in case a different package's flow has the field name appearing
 *   elsewhere too.
 * - Negative lookahead in the unnamespaced-match regex skips already-prefixed
 *   values, so re-running is safe and won't produce IFLW__IFLW__Error_Type__c.
 * - Every file is validated before any file is written, so a file that fails
 *   validation is never written — but this is NOT fully atomic across files:
 *   if file 1 writes successfully and file 2's write then fails for an
 *   unrelated reason (disk, permissions), file 1 stays modified.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG_PATH = "scripts/namespace-config.json";

function loadConfig(configPath) {
  const fullConfigPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(fullConfigPath)) {
    throw new Error(`Config file not found: ${fullConfigPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(fullConfigPath, "utf8"));

  // Checks more than "does this key exist" — an empty array would pass a
  // plain truthiness check and let the script silently do nothing, reporting
  // success while having touched zero files.
  if (typeof parsed.namespace !== "string" || parsed.namespace.trim() === "") {
    throw new Error(`Config file ${configPath} must contain a non-empty "namespace" string`);
  }

  if (
    !Array.isArray(parsed.targetFiles) ||
    parsed.targetFiles.length === 0 ||
    !parsed.targetFiles.every((file) => typeof file === "string" && file.trim() !== "")
  ) {
    throw new Error(`Config file ${configPath} must contain a non-empty "targetFiles" array`);
  }

  if (
    !Array.isArray(parsed.fieldsToNamespace) ||
    parsed.fieldsToNamespace.length === 0 ||
    !parsed.fieldsToNamespace.every((field) => typeof field === "string" && field.trim() !== "")
  ) {
    throw new Error(`Config file ${configPath} must contain a non-empty "fieldsToNamespace" array`);
  }

  return parsed;
}

function buildReplacementRegex(fieldName, namespace) {
  const escapedField = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(&quot;apiName&quot;:&quot;)(?!${namespace}__)(${escapedField})(&quot;)`,
    "g"
  );
}

// Global flag so this counts EVERY already-namespaced occurrence, not just
// whether one exists — needed to catch duplicated namespaced values.
function buildAlreadyNamespacedRegex(fieldName, namespace) {
  const escapedField = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`&quot;apiName&quot;:&quot;${namespace}__${escapedField}&quot;`, "g");
}

/**
 * Runs the replacement for every configured field and returns both the
 * updated content and a per-field count of unnamespaced AND already-
 * namespaced occurrences, counted against the ORIGINAL content (before any
 * replacement happened).
 */
function replaceNamespaceInContent(originalContent, namespace, fieldsToNamespace) {
  let updated = originalContent;
  const fieldResults = {};

  for (const field of fieldsToNamespace) {
    const unnamespacedRegex = buildReplacementRegex(field, namespace);
    const namespacedRegex = buildAlreadyNamespacedRegex(field, namespace);

    const unnamespacedOccurrences = (originalContent.match(unnamespacedRegex) || []).length;
    const namespacedOccurrences = (originalContent.match(namespacedRegex) || []).length;

    fieldResults[field] = { unnamespacedOccurrences, namespacedOccurrences };

    updated = updated.replace(unnamespacedRegex, `$1${namespace}__$2$3`);
  }

  return { updated, fieldResults };
}

/**
 * Reads and processes one file, returning its final content only if the
 * WHOLE FILE (all configured fields together) lands in one of the two valid
 * states. Throws otherwise. Does NOT write to disk — writing happens
 * separately, only after every target file has passed validation.
 */
function prepareFile(relativePath, namespace, fieldsToNamespace) {
  const fullPath = path.resolve(process.cwd(), relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const original = fs.readFileSync(fullPath, "utf8");
  const { updated, fieldResults } = replaceNamespaceInContent(original, namespace, fieldsToNamespace);

  const allNeedReplacement = fieldsToNamespace.every((field) => {
    const r = fieldResults[field];
    return r.unnamespacedOccurrences === 1 && r.namespacedOccurrences === 0;
  });

  const allAlreadyNamespaced = fieldsToNamespace.every((field) => {
    const r = fieldResults[field];
    return r.unnamespacedOccurrences === 0 && r.namespacedOccurrences === 1;
  });

  if (!allNeedReplacement && !allAlreadyNamespaced) {
    const details = fieldsToNamespace
      .map((field) => {
        const r = fieldResults[field];
        return `${field}: unnamespaced=${r.unnamespacedOccurrences}, namespaced=${r.namespacedOccurrences}`;
      })
      .join("; ");

    throw new Error(
      `${relativePath}: invalid or inconsistent field state — ${details}. ` +
        `Expected every field to need replacement, or every field to already ` +
        `be namespaced exactly once. A mixed or duplicated state is not ` +
        `accepted. Stopping — do not trust this build.`
    );
  }

  console.log(
    `${relativePath}: ${allNeedReplacement ? "replaced" : "already namespaced"} — validated OK.`
  );
  return { fullPath, content: updated };
}

function main() {
  const configPath = process.argv[2] || DEFAULT_CONFIG_PATH;
  const { namespace, targetFiles, fieldsToNamespace } = loadConfig(configPath);

  console.log(`Running namespace replacement (config: ${configPath}, namespace: ${namespace})`);

  // Phase 1: validate every file first, whole-file consistency across all
  // configured fields. If any file fails, nothing gets written for ANY file
  // this run.
  const prepared = targetFiles.map((file) => prepareFile(file, namespace, fieldsToNamespace));

  // Phase 2: only write once every file has passed validation. Not fully
  // atomic across files — see SAFETY note above.
  for (const { fullPath, content } of prepared) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  console.log("Namespace replacement complete.");
}

// Only self-execute when run directly (e.g. `node scripts/namespace-replace.js`
// or the GitHub Actions step calling it that way) — not when imported, so
// Jest tests can require these functions individually without triggering a
// real file write.
if (require.main === module) {
  main();
}

module.exports = {
  loadConfig,
  buildReplacementRegex,
  buildAlreadyNamespacedRegex,
  replaceNamespaceInContent,
  prepareFile,
};
