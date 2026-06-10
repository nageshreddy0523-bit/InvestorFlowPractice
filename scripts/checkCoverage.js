const fs = require('fs');

const resultsPath = './test-results/test-result.json';
const MINIMUM_COVERAGE = 85;

if (!fs.existsSync(resultsPath)) {
  console.error('No test results found');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const coverage = results.summary.orgWideCoverage;
const coverageNumber = parseInt(coverage.replace('%', ''));

console.log(`Current coverage: ${coverage}`);
console.log(`Minimum required: ${MINIMUM_COVERAGE}%`);

if (coverageNumber < MINIMUM_COVERAGE) {
  console.error(`Coverage ${coverage} is below minimum ${MINIMUM_COVERAGE}%`);
  process.exit(1);
}

console.log('Coverage check passed');
process.exit(0);