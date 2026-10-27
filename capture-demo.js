const os = require('os');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const http = require('http');
const taskDir = path.join(os.homedir(), 'codex-oppia-27784');
const {firefox} = require(path.join(taskDir, 'browser-validation/node_modules/playwright'));

(async () => {
  const readyDeadline = Date.now() + 180000;
  while (Date.now() < readyDeadline) {
    const ready = await new Promise(resolve => {
      const request = http.request('http://127.0.0.1:9877/', {method: 'HEAD'}, response => {response.resume(); resolve(true);});
      request.on('error', () => resolve(false));
      request.setTimeout(2000, () => {request.destroy(); resolve(false);});
      request.end();
    });
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const outputDir = path.join(taskDir, 'proof');
  fs.mkdirSync(outputDir, {recursive: true});
  const browser = await firefox.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1040, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  await page.goto('http://127.0.0.1:9877/', {timeout: 180000});
  const iframe = await page.waitForSelector('iframe#context');
  await iframe.evaluate(element => {
    element.style.cssText = 'display:block!important;visibility:visible!important;width:100%;height:800px;border:0;';
  });
  const frame = await iframe.contentFrame();
  const results = {browser: browser.version(), errors, variants: {}};
  for (const variant of ['before', 'after']) {
    await frame.waitForSelector(`body[data-demo-ready="${variant}"]`, {timeout: 120000});
    await frame.evaluate(() => {document.body.tabIndex = -1; document.body.focus();});
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const focused = await frame.evaluate(() => document.activeElement.matches('.e2e-test-delete-node, .e2e-test-delete-node [tabindex]'));
      if (focused) break;
    }
    const focusSelector = '.e2e-test-delete-node[tabindex], .e2e-test-delete-node [tabindex]';
    const control = frame.locator(focusSelector);
    assert(await control.evaluate(element => element === document.activeElement), 'Delete control must be reached with Tab');
    const role = await control.getAttribute('role');
    const counts = {};
    const accessibleButtonCount = await frame.getByRole('button', {name: 'Delete Review card', exact: true}).count();
    let step = 0;
    const capture = async label => {
      const count = await frame.locator('#demo-shell').getAttribute('data-count');
      await frame.locator('#step').evaluate((element, text) => {element.textContent = text;}, label);
      await frame.locator('#output').evaluate((element, data) => {
        element.textContent = `Delete actions emitted: ${data.count}\nFocus role: ${data.role || '(no button role)'}\nBrowser errors captured: ${data.errors}`;
      }, {count, role, errors: errors.length});
      await frame.locator('#demo-shell').screenshot({path: path.join(outputDir, `${variant}-${String(step++).padStart(2, '0')}.png`)});
      return Number(count);
    };
    await capture('Tab to the delete control');
    await page.keyboard.press('Enter');
    counts.enter = await capture('Press Enter on the focused delete control');
    await control.dispatchEvent('click', {bubbles: true});
    counts.focusedClick = await capture('Dispatch click on the focused control (assistive activation route)');
    await page.keyboard.press('Space');
    counts.space = await capture('Press and release Space on the focused delete control');
    await frame.locator('.e2e-test-delete-node rect').click();
    counts.pointerClick = await capture('Click the existing rectangle hit target');
    results.variants[variant] = {role, accessibleButtonCount, counts};
    await frame.evaluate(() => window.dispatchEvent(new Event('demo-finish')));
  }
  assert.deepStrictEqual(results.variants.before.counts, {enter: 1, focusedClick: 1, space: 1, pointerClick: 2});
  assert.deepStrictEqual(results.variants.after.counts, {enter: 1, focusedClick: 2, space: 3, pointerClick: 4});
  assert.strictEqual(results.variants.after.role, 'button');
  assert.strictEqual(results.variants.before.accessibleButtonCount, 0);
  assert.strictEqual(results.variants.after.accessibleButtonCount, 1);
  assert.strictEqual(errors.length, 0);
  fs.writeFileSync(path.join(outputDir, 'browser-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(error => {console.error(error); process.exitCode = 1;});
