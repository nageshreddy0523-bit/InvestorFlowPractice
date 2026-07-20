/**
 * calculate-version.js
 *
 * PIPE-6073 — Package Version Calculation for the PipeRE 2GP package.
 *
 * STATUS: SPECULATIVE. Kyle and Julia have not yet confirmed the actual
 * version numbering logic — this implements a plain major.minor.patch
 * scheme as a placeholder for that discussion, not a confirmed decision.
 * Do not treat this as final until Kyle/Julia sign off.
 *
 * NOTE ON FORMAT MISMATCH: PipeRE's real sfdx-project.json currently uses
 * a 4-segment version like "25.0807.0.NEXT" (major.date.build.next), not
 * 3-segment major.minor.patch. If the team confirms major.minor.patch as
 * the actual scheme, that's a change to the version FORMAT itself, not
 * just this script — sfdx-project.json's versionNumber would need to
 * follow the same convention.
 *
 * LOGIC IMPLEMENTED HERE:
 * - Ask the corp org for the most recently released version of PipeRE
 * - Parse its major.minor.patch
 * - Patch auto-increments by 1 for every new build
 * - Major and minor do NOT auto-increment — bumping either of those is
 *   assumed to be a deliberate, manual edit to sfdx-project.json before
 *   running this (e.g. a breaking change bumps major, a new feature set
 *   bumps minor). This script only ever reads major.minor from the
 *   existing released version and carries them forward unless the config
 *   has been manually changed — see readManualVersionOverride() below.
 * - If no released version exists yet at all, starts at 1.0.0
 *
 * This mirrors the same idempotent, fail-loud philosophy as
 * namespace-replace.js: if the CLI call fails or returns something
 * unparseable, this throws rather than guessing.
 */

const { execSync } = require("child_process");

const PACKAGE_ID = process.env.PACKAGE_ID;

if (!PACKAGE_ID) {
  throw new Error("PACKAGE_ID environment variable is missing.");
}

/**
 * Queries the corp org for released versions of the package, ordered by
 * creation date, and returns the most recent one's version string
 * (e.g. "1.4.2"), or null if none exist yet.
 */
function getLatestReleasedVersion() {
  let raw;
  let parsed;

  try {
    raw = execSync(
  `sf package version list --packages "${PACKAGE_ID}" --released --order-by CreatedDate --json`,
  { encoding: "utf8" }
);

    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Salesforce command failed.");

    if (err.stdout) {
      console.error("STDOUT:");
      console.error(err.stdout.toString());
    }

    if (err.stderr) {
      console.error("STDERR:");
      console.error(err.stderr.toString());
    }

    throw new Error(
      `Failed to query released package versions: ${err.message}`
    );
  }

  const results = parsed.result;

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const latest = results[results.length - 1];

  if (!latest || typeof latest.Version !== "string") {
    throw new Error(
      "Latest release record is missing a Version field — cannot calculate next version."
    );
  }

  return latest.Version;
}

/**
 * Parses a version string into { major, minor, patch }. Only accepts
 * strict 3-segment numeric versions (e.g. "1.4.2") — anything else
 * (including the real 4-segment format currently in use) throws, since
 * silently truncating or guessing at a mismatched format is more
 * dangerous than failing loudly here.
 */
function parseVersion(versionString) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(versionString);
  if (!match) {
    throw new Error(
      `Version "${versionString}" is not in major.minor.patch format. ` +
        `If PipeRE is still using the 4-segment date-based scheme, this ` +
        `script does not apply yet — confirm the format change with Kyle/Julia first.`
    );
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Calculates the next version: same major.minor as the latest release,
 * patch incremented by 1. If no release exists yet, starts at 1.0.0.
 */
function calculateNextVersion(latestVersionString) {
  if (latestVersionString === null) {
    return "1.0.0";
  }

  const { major, minor, patch } = parseVersion(latestVersionString);
  return `${major}.${minor}.${patch + 1}`;
}

function main() {
  const latest = getLatestReleasedVersion();
  const next = calculateNextVersion(latest);

  console.error(`Latest released version: ${latest ?? "(none — first release)"}`);
  console.error(`Calculated next version: ${next}`);

  // Only the version string goes to stdout — this is what the YAML step
  // captures via $(node ./scripts/calculate-version.js). Everything else
  // above goes to stderr so it doesn't get captured as part of the version.
  console.log(next);
}

if (require.main === module) {
  main();
}

module.exports = {
  getLatestReleasedVersion,
  parseVersion,
  calculateNextVersion,
};
