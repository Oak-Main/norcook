import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const expectedPaths = ['/', '/recipes/gravlaks', '/regions/vestlandet']
for (const [profile, expectedRuns] of [['mobile', 3], ['desktop', 1]]) {
  const root = `.lighthouseci/${profile}`
  const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'))
  assert.equal(manifest.profile, profile)
  assert.deepEqual(manifest.routes.map(route => new URL(route.url).pathname), expectedPaths)
  for (const route of manifest.routes) {
    assert.equal(route.runs, expectedRuns)
    assert.equal(route.runReports.length, expectedRuns)
    for (const file of [...route.runReports, route.representativeReport]) {
      assert.match(file, /^[a-z0-9-]+\.json$/)
      const report = JSON.parse(await readFile(`${root}/${file}`, 'utf8'))
      assert.ok(!report.runtimeError, `${profile}: unusable report ${file}`)
      assert.equal(typeof report.categories?.performance?.score, 'number')
      for (const metric of ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time']) {
        assert.ok(Number.isFinite(report.audits?.[metric]?.numericValue), `${profile}: missing ${metric}`)
      }
    }
  }
}
console.log('Performance receipts verified: three routes, nine mobile runs and three desktop runs.')
