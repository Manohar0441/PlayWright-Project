/* ============================================================================
   tests/artifact-reporter.js — print each test's artifacts (incl. tracer logs)
   ----------------------------------------------------------------------------
   A tiny custom Playwright reporter. After each test finishes, it logs the
   files Playwright produced for it: the screenshot, the video (failures only),
   and the trace ("tracer logs"). This is what makes every test visibly RETURN
   its trace — open any trace.zip with:  npx playwright show-trace <path>
   ============================================================================ */

class ArtifactReporter {
  onTestEnd(test, result) {
    const name = test.titlePath().filter(Boolean).join(' > ');
    console.log(`\n  [${result.status.toUpperCase()}] ${name}  (${result.duration} ms)`);

    if (!result.attachments.length) {
      console.log('     (no artifacts)');
      return;
    }
    for (const a of result.attachments) {
      const where = a.path || `[inline ${a.contentType}]`;
      console.log(`     - ${a.name}: ${where}`);
    }
  }

  onEnd(result) {
    console.log(`\n  Run finished: ${result.status}. ` +
      'HTML report: npx playwright show-report  |  Trace: npx playwright show-trace <trace.zip>\n');
  }
}

module.exports = ArtifactReporter;
