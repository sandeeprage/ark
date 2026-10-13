import { readFile } from "node:fs/promises";

// Full reports can contain temporary signed media URLs. Export only these fields.
const results = [];
for (const path of process.argv.slice(2)) {
  const report = JSON.parse(await readFile(path, "utf8"));
  const url = new URL(report.finalDisplayedUrl || report.finalUrl);
  results.push({
    url: `${url.origin}${url.pathname}`,
    measured_at: report.fetchTime,
    lighthouse_version: report.lighthouseVersion,
    form_factor: report.configSettings.formFactor,
    throttling_method: report.configSettings.throttlingMethod,
    performance: Math.round(report.categories.performance.score * 100),
    automated_accessibility: Math.round(report.categories.accessibility.score * 100),
    lcp_ms: report.audits["largest-contentful-paint"].numericValue,
    fcp_ms: report.audits["first-contentful-paint"].numericValue,
    tbt_ms: report.audits["total-blocking-time"].numericValue,
    cls: report.audits["cumulative-layout-shift"].numericValue,
  });
}
console.log(JSON.stringify(results, null, 2));
