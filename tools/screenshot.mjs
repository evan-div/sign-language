/**
 * Visual QC: load the running app and capture screenshots.
 *
 * The geometric assertions in the test suite prove a sign has the right
 * measurements; they cannot prove it reads correctly on screen. Everything the
 * tests missed in earlier milestones -- a clipped salute, a camera framing the
 * wrong part of the body, a hand that measures fine and looks like a slab --
 * was found here.
 *
 * Run the dev server first.
 *
 *   pnpm dev
 *   node tools/screenshot.mjs [outDir] [sentence]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? '.screenshots';
const sentence = process.argv[3] ?? 'hello my name is Evan';
mkdirSync(outDir, { recursive: true });

// SwiftShader: these containers have no GPU, so WebGL needs a software backend.
// CHROMIUM_PATH lets a sandbox point at a preinstalled browser whose build
// number does not match this Playwright release.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
/**
 * Keep the pixel count low.
 *
 * These containers render WebGL in software, and cost scales with pixels. At
 * deviceScaleFactor 2 the canvas is 2560x1640 and frames effectively stop
 * presenting -- which also strands the UI state that mirrors the playback
 * clock, so play/pause stops responding.
 */
const page = await browser.newPage({
  viewport: { width: 1280, height: 860 },
  deviceScaleFactor: Number(process.env.SHOT_DPR ?? 1),
});

const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(`PAGEERROR: ${e.message}`));

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

/**
 * Seek to an exact time while paused.
 *
 * Clicking a word starts playback, which makes any screenshot a race against
 * the clock. Driving the scrub input directly is deterministic.
 */
const seekTo = async (ms) => {
  await page.evaluate((target) => {
    const slider = document.querySelector('.scrub');
    const total = Number(slider.dataset.durationMs);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(slider, String(target / total));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }, ms);
  // Software WebGL (SwiftShader) draws slowly; give it time to present a frame.
  await page.waitForTimeout(Number(process.env.SETTLE_MS ?? 700));
};

/**
 * Pause, and confirm it took.
 *
 * A single conditional click is not enough: the button's label comes from React
 * state that only updates on a rendered frame, and under software WebGL frames
 * are scarce. If playback is still running, the seek below drifts.
 */
const ensurePaused = async () => {
  for (let attempt = 0; attempt < 8; attempt++) {
    if ((await page.getAttribute('.play', 'aria-label')) === 'Play') return;
    await page.click('.play');
    await page.waitForTimeout(220);
  }
  throw new Error('could not pause playback');
};

const shoot = async (name) => {
  const box = await page.locator('.viewport').boundingBox();
  await page.screenshot({ path: `${outDir}/${name}.png`, clip: box });
};

// --- the sentence pipeline ---------------------------------------------
await page.fill('#sentence', sentence);
await page.click('.primary');
await page.waitForTimeout(500);
await ensurePaused();

const glosses = await page.locator('.gloss__item').allTextContents();
const total = Number(await page.getAttribute('.scrub', 'data-duration-ms'));
if (!Number.isFinite(total) || total <= 0) throw new Error('scrub control is missing its duration');

for (const [i, gloss] of glosses.entries()) {
  await ensurePaused();
  // Sample each sign at the middle of its share of the timeline.
  await seekTo((total * (i + 0.5)) / glosses.length);
  await shoot(`sentence-${i}-${gloss.replace(/[^\w-]/g, '')}`);
}

// Overview frame, parked on the first sign rather than at the end of playback,
// where the hands are already back at rest and the shot says nothing.
await ensurePaused();
await seekTo(total * (0.5 / glosses.length));
await page.screenshot({ path: `${outDir}/app.png` });

// --- the vocabulary browser --------------------------------------------
const signs = (process.env.SHOT_SIGNS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
if (signs.length > 0) {
  await page.click('.tab:has-text("Vocabulary")');
  await page.waitForTimeout(200);
  for (const gloss of signs) {
    await page.fill('#vocab-search', gloss);
    await page.waitForTimeout(150);
    // Prefer an exact gloss match: searching "DAY" also matches TODAY.
    const exact = page.locator('.vocab', { has: page.locator(`.vocab__gloss:text-is("${gloss}")`) });
    const target = (await exact.count()) > 0 ? exact.first() : page.locator('.vocab').first();
    if ((await target.count()) === 0) { problems.push(`no vocabulary entry for "${gloss}"`); continue; }
    await target.click();
    await page.waitForTimeout(400);
    await ensurePaused();
    const duration = Number(await page.getAttribute('.scrub', 'data-duration-ms'));
    await seekTo(duration * 0.5);
    await shoot(`sign-${gloss.replace(/[^\w-]/g, '')}`);
  }
  await page.screenshot({ path: `${outDir}/vocabulary.png` });
}

console.log(`gloss: ${glosses.join(' ')}`);
console.log(problems.length ? `console errors:\n  ${problems.slice(0, 8).join('\n  ')}` : 'console errors: none');
await browser.close();
