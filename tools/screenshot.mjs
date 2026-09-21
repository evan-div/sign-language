/**
 * Visual QC: load the running app and capture screenshots.
 *
 * The geometric assertions in the test suite prove a handshape has the right
 * measurements; they cannot prove it reads correctly on screen. This closes
 * that loop cheaply. Run the dev server first.
 *
 *   pnpm dev
 *   node tools/screenshot.mjs [outDir] [word]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? '.screenshots';
const word = process.argv[3] ?? 'EVAN';
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
  viewport: { width: 1280, height: 820 },
  deviceScaleFactor: Number(process.env.SHOT_DPR ?? 1),
});

const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(`PAGEERROR: ${e.message}`));

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.fill('#word', word);
await page.click('.primary');
await page.waitForTimeout(400);

/**
 * Seek to an exact time while paused.
 *
 * Clicking a letter starts playback, which makes any screenshot a race against
 * the clock. Driving the scrub input directly is deterministic: each letter
 * button carries its hold window, so we can land in the middle of it.
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
 * are scarce. If playback is still running, the seek below drifts and the
 * capture shows the wrong letter.
 */
const ensurePaused = async () => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const label = await page.getAttribute('.play', 'aria-label');
    if (process.env.DEBUG_SHOT) {
      const t = (await page.textContent('.time'))?.trim();
      console.log(`  ensurePaused attempt ${attempt}: aria=${label} time=${t}`);
    }
    if (label === 'Play') return;
    await page.click('.play');
    await page.waitForTimeout(220);
  }
  throw new Error('could not pause playback');
};

await ensurePaused();

const segments = await page.$$eval('.letter', (nodes) =>
  nodes.map((n) => ({
    letter: n.textContent,
    start: Number(n.dataset.holdStart),
    end: Number(n.dataset.holdEnd),
  })));

const total = Number(await page.getAttribute('.scrub', 'data-duration-ms'));
if (!Number.isFinite(total) || total <= 0) throw new Error('scrub control is missing its duration');

for (const [i, seg] of segments.entries()) {
  await ensurePaused();
  await seekTo((seg.start + seg.end) / 2);
  // Confirm we actually landed on this letter before trusting the capture.
  const highlighted = await page.locator('.letter--active').textContent().catch(() => null);
  if (highlighted !== seg.letter) {
    problems.push(`seek landed on "${highlighted}" while capturing "${seg.letter}"`);
  }
  const box = await page.locator('.viewport').boundingBox();
  await page.screenshot({ path: `${outDir}/letter-${i}-${seg.letter}.png`, clip: box });
}

// Overview frame, parked on the first letter rather than at the end of playback.
await seekTo((segments[0].start + segments[0].end) / 2);
await page.screenshot({ path: `${outDir}/app.png` });

console.log(`letters: ${(await page.locator('.letter').allTextContents()).join('')}`);
console.log(problems.length ? `console errors:\n  ${problems.slice(0, 8).join('\n  ')}` : 'console errors: none');
await browser.close();
