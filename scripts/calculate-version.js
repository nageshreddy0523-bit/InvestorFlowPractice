
const { execSync } = require("child_process");

const PACKAGE_NAME = "PipeRE";

function pad2(n) {
return String(n).padStart(2, "0");
}

function getDateParts(date = new Date()) {
const formatter = new Intl.DateTimeFormat("en-GB", {
timeZone: "UTC",
year: "2-digit",
month: "2-digit",
day: "2-digit",
});

const parts = formatter.formatToParts(date).reduce((acc, part) => {
acc[part.type] = part.value;
return acc;
}, {});

return { yy: parts.year, mm: parts.month, dd: parts.day };
}

function parseAsUtc(dateString) {
const isoLike = String(dateString).trim().replace(" ", "T");
const hasExplicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(isoLike);
return new Date(hasExplicitOffset ? isoLike : `${isoLike}Z`);
}

function getTodaysBuildCount(referenceDate = new Date()) {
let raw;
try {
raw = execSync(
`sf package version list --packages "${PACKAGE_NAME}" --order-by CreatedDate --json`,
{ encoding: "utf8" }
);
} catch (err) {
throw new Error(`Failed to query existing package versions: ${err.message}`);
}

let parsed;
try {
parsed = JSON.parse(raw);
} catch (err) {
throw new Error(`Could not parse sf CLI output as JSON: ${err.message}`);
}

const results = Array.isArray(parsed.result) ? parsed.result : [];
const todayKey = Object.values(getDateParts(referenceDate)).join("-");

return results.filter((v) => {
if (!v.CreatedDate) return false;
if (v.Status !== "Success") return false;a

const createdDate = parseAsUtc(v.CreatedDate);

if (Number.isNaN(createdDate.getTime())) {
console.error("Invalid CreatedDate:", JSON.stringify(v.CreatedDate));
return false;
}

const createKey = Object.values(
getDateParts(createdDate)
).join("-");

return createKey === todayKey;
}).length;
}
function calculateSfdxVersionNumber(date, sequence) {
const { yy, mm, dd } = getDateParts(date);
return `${yy}${mm}.${dd}${pad2(sequence)}.0.0`;
}

function calculateReleaseName(date = new Date(), sequence) {
const { yy, mm, dd } = getDateParts(date);
return `${yy}.${mm}.${dd}.${sequence}.0`;
}

function main() {
const now = new Date();

const sequence = getTodaysBuildCount(now);

const versionName = calculateReleaseName(now, sequence);
const versionNumber= calculateSfdxVersionNumber(now,sequence);

console.error(`Version Name: ${versionName}`);
console.error(`Version Number: ${versionNumber}`);

console.log(JSON.stringify({ versionName, versionNumber }));
}

if (require.main === module) {
main();
}

module.exports = {
getDateParts,
parseAsUtc,
getTodaysBuildCount,
calculateSfdxVersionNumber,
calculateReleaseName,
};