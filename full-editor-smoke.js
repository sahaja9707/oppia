const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const http = require('http');
const {execFileSync} = require('child_process');
const taskDir = path.join(os.homedir(), 'codex-oppia-27784');
const repo = path.join(taskDir, 'oppia');
const puppeteer = require(path.join(repo, 'node_modules/puppeteer'));
const graphTemplate = path.join(repo, 'core/templates/pages/exploration-editor-page/editor-tab/graph-directives/state-graph-visualization.component.html');
const proof = path.join(taskDir, 'full-proof');
fs.mkdirSync(proof, {recursive: true});
const log = text => {console.log(text); fs.appendFileSync(path.join(proof, 'steps.log'), text + '\n');};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const focusSelector = '.e2e-test-delete-node[tabindex], .e2e-test-delete-node [tabindex]';
let browser;
let page;
const errors = [];
const httpErrors = [];
const results = {};
const afterOnly = process.argv.includes('--after-only');
async function clickText(text) {
  const elements = await page.$x(`//button[normalize-space(.)="${text}"] | //a[normalize-space(.)="${text}"]`);
  if (!elements.length) throw new Error('Button or link not found: ' + text);
  await elements[0].click();
}
async function createFixture() {
  log('Open creator dashboard');
  await page.goto('http://localhost:8181/creator-dashboard', {waitUntil: 'networkidle2'});
  await page.waitForSelector('.e2e-test-create-new-exploration-button', {visible: true});
  await page.click('.e2e-test-create-new-exploration-button');
  await page.waitForFunction(() => location.pathname.startsWith('/create/'));
  const welcome = await page.waitForSelector('.e2e-test-dismiss-welcome-modal', {visible: true, timeout: 15000}).catch(() => null);
  if (welcome) await welcome.click();
  const cookie = await page.$('.e2e-test-oppia-cookie-banner-accept-button');
  if (cookie) await cookie.click();
  await page.waitForSelector('.e2e-test-state-edit-content', {visible: true});
  await page.click('.e2e-test-state-edit-content');
  await page.waitForSelector('div.e2e-test-rte', {visible: true});
  await page.click('div.e2e-test-rte');
  await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
  await page.type('div.e2e-test-rte', 'Keyboard deletion verification.');
  await page.click('.e2e-test-save-state-content');
  await page.waitForSelector('div.e2e-test-rte', {hidden: true});
  await page.waitForSelector('.e2e-test-open-add-interaction-modal', {visible: true});
  await page.click('.e2e-test-open-add-interaction-modal');
  await page.waitForSelector('.e2e-test-interaction-tile-Continue', {visible: true});
  await page.click('.e2e-test-interaction-tile-Continue');
  await page.click('.e2e-test-save-interaction');
  await page.waitForSelector('.e2e-test-customize-interaction-body', {hidden: true});
  await page.waitForSelector('a.e2e-test-default-response-tab', {visible: true});
  await page.click('a.e2e-test-default-response-tab');
  await page.waitForSelector('.e2e-test-open-outcome-dest-editor', {visible: true});
  await page.click('.e2e-test-open-outcome-dest-editor');
  await page.waitForSelector('.e2e-test-destination-selector-dropdown', {visible: true});
  await page.select('.e2e-test-destination-selector-dropdown', '/');
  await page.type('.e2e-test-add-state-input', 'Review');
  await page.click('.e2e-test-save-outcome-dest');
  await page.waitForSelector(focusSelector, {visible: true});
  await delay(1000);
  log('Two-card exploration ready: ' + page.url());
}
async function cancelModal() {
  await page.waitForSelector('.e2e-test-confirm-delete-state', {visible: true});
  await page.evaluate(() => [...document.querySelectorAll('ngb-modal-window button')].find(button => button.textContent.trim() === 'Cancel').click());
  await page.waitForSelector('.e2e-test-confirm-delete-state', {hidden: true});
}
async function snapshot(variant, index, label) {
  await page.evaluate(text => {
    let observer = document.getElementById('verification-observer');
    if (!observer) {
      observer = document.createElement('aside'); observer.id = 'verification-observer';
      observer.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:999999;background:#172a3a;color:#fff;padding:12px 16px;max-width:420px;font:15px Arial;pointer-events:none';
      document.body.appendChild(observer);
    }
    observer.textContent = text;
  }, `${variant}: ${label} | Slow 3G | browser errors captured: ${errors.length}`);
  await page.screenshot({path: path.join(proof, `${variant}-${index}.png`)});
}
(async () => {
  log('Waiting for the local Oppia server');
  const readyDeadline = Date.now() + 600000;
  while (Date.now() < readyDeadline) {
    const ready = await new Promise(resolve => {
      const request = http.request('http://localhost:8181/login', {method: 'HEAD'}, response => {response.resume(); resolve(true);});
      request.on('error', () => resolve(false));
      request.setTimeout(2000, () => {request.destroy(); resolve(false);});
      request.end();
    });
    if (ready) break;
    await delay(1000);
  }
  const baseline = execFileSync('git', ['show', 'bc73ecf9cf71d53d0849f61017d8990ae25aec00:core/templates/pages/exploration-editor-page/editor-tab/graph-directives/state-graph-visualization.component.html'], {cwd: repo, encoding: 'utf8'});
  if (afterOnly) {
    const deadline = Date.now() + 180000;
    const building = () => {const text = fs.readFileSync(path.join(taskDir, 'app-server.log'), 'utf8'); return text.lastIndexOf('Generating browser application bundles') > text.lastIndexOf('Build at:');};
    while (Date.now() < deadline && building()) await delay(1000);
  }
  if (!afterOnly && fs.readFileSync(graphTemplate, 'utf8') !== baseline) {
    const idleDeadline = Date.now() + 180000;
    const isBuilding = () => {
      const text = fs.readFileSync(path.join(taskDir, 'app-server.log'), 'utf8');
      return text.lastIndexOf('Generating browser application bundles') > text.lastIndexOf('Build at:');
    };
    while (Date.now() < idleDeadline && isBuilding()) await delay(1000);
    log('Restore baseline template for the before run');
    const buildCount = () => (fs.readFileSync(path.join(taskDir, 'app-server.log'), 'utf8').match(/Build at:/g) || []).length;
    const previousCount = buildCount();
    fs.writeFileSync(graphTemplate, baseline);
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline && buildCount() <= previousCount) await delay(1000);
    assert(buildCount() > previousCount, 'Baseline Angular bundle must rebuild');
  }
  browser = await puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], userDataDir: path.join(taskDir, 'full-editor-profile')});
  page = await browser.newPage();
  await page.setViewport({width: 1440, height: 1000});
  page.setDefaultTimeout(60000);
  await page.setCacheEnabled(false);
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  page.on('response', response => {if (response.status() >= 400) {const url = new URL(response.url()); httpErrors.push({status: response.status(), url: url.origin + url.pathname});}});
  page.on('dialog', dialog => dialog.accept());
  log('Open local Oppia');
  await page.goto('http://localhost:8181/creator-dashboard', {waitUntil: 'networkidle2', timeout: 120000});
  await page.waitForFunction(() => document.querySelector('.e2e-test-create-new-exploration-button') || document.querySelector('input.e2e-test-sign-in-email-input') || document.querySelector('input.e2e-test-username-input'));
  const cookie = await page.$('.e2e-test-oppia-cookie-banner-accept-button');
  if (cookie) await cookie.click();
  const email = await page.$('input.e2e-test-sign-in-email-input');
  if (email) {
    await email.type('keyboard-verification@example.com');
    await clickText('Sign In');
    const username = await page.waitForSelector('input.e2e-test-username-input', {visible: true, timeout: 20000}).catch(() => null);
    if (username) {
      await username.type('KeyboardCheck27784');
      await page.click('.e2e-test-email-preferences-radio-no');
      await page.click('input.e2e-test-agree-to-terms-checkbox');
      await page.click('button.e2e-test-register-user:not([disabled])');
      await page.waitForSelector('input.e2e-test-username-input', {hidden: true});
    }
  }
  for (const variant of (afterOnly ? ['after'] : ['before', 'after'])) {
    if (variant === 'after' && !afterOnly) {
      log('Restore patched template and wait for Angular watch rebuild');
      const buildCount = () => (fs.readFileSync(path.join(taskDir, 'app-server.log'), 'utf8').match(/Build at:/g) || []).length;
      const old = buildCount();
      fs.copyFileSync(path.join(taskDir, 'fixed-template.html'), graphTemplate);
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline && buildCount() === old) await delay(1000);
      assert(buildCount() > old, 'Patched Angular bundle must be rebuilt');
      await delay(2000);
    }
    await createFixture();
    await page.emulateNetworkConditions(puppeteer.networkConditions['Slow 3G']);
    const focusReached = await page.$eval(focusSelector, element => {element.focus(); return element === document.activeElement;});
    if (variant === 'after') assert(focusReached, 'Patched control must receive focus');
    await snapshot(variant, '00', 'Delete control focused');
    const role = await page.$eval(focusSelector, element => element.getAttribute('role'));
    assert.strictEqual(role, variant === 'after' ? 'button' : null);
    await page.$eval(focusSelector, element => element.focus());
    await page.keyboard.press('Enter');
    if (variant === 'after') await page.waitForSelector('.e2e-test-confirm-delete-state', {visible: true});
    else await delay(1000);
    const enterConfirmation = !!(await page.$('.e2e-test-confirm-delete-state'));
    if (enterConfirmation) await page.$eval('.e2e-test-confirm-delete-state', element => element.scrollIntoView({block: 'center'}));
    await snapshot(variant, '01', enterConfirmation ? 'Enter opens confirmation' : 'Enter produces no confirmation');
    if (afterOnly) {
      assert(enterConfirmation);
      const modalData = await page.$eval('.e2e-test-confirm-delete-state', element => {
        const ancestors = []; let node = element;
        while (node && ancestors.length < 6) {ancestors.push({tag: node.tagName, classes: node.className, text: node.textContent.slice(0, 300)}); node = node.parentElement;}
        return ancestors;
      });
      fs.writeFileSync(path.join(proof, 'modal-dom.json'), JSON.stringify(modalData, null, 2));
      assert(await page.$eval('.e2e-test-confirm-delete-state', element => element.parentElement.parentElement.textContent.includes('Review')));
      await page.click('.e2e-test-confirm-delete-state');
      await page.waitForSelector('.e2e-test-exploration-graph .e2e-test-delete-node', {hidden: true});
      assert(await page.$$eval('.e2e-test-exploration-graph .e2e-test-node-label', elements => elements.length === 1 && elements[0].textContent.includes('Introduction')));
      await page.evaluate(() => window.scrollTo(0, 0));
      await snapshot(variant, '02', 'Review card removed after confirmation');
      results.after = {role, focusReached, enterConfirmation, removedAfterConfirmation: true};
      log('Patched full-editor Enter/confirmation/removal checks passed');
      break;
    }
    if (enterConfirmation) await cancelModal();
    await page.$eval(focusSelector, element => {element.focus(); element.dispatchEvent(new MouseEvent('click', {bubbles: true}));});
    if (variant === 'after') {
      await page.waitForSelector('.e2e-test-confirm-delete-state', {visible: true});
      await snapshot(variant, '02', 'Focused click opens confirmation');
      await cancelModal();
    } else {
      await delay(1000); assert.strictEqual(await page.$('.e2e-test-confirm-delete-state'), null);
      await snapshot(variant, '02', 'Focused click produces no confirmation');
    }
    await page.$eval(focusSelector, element => element.focus());
    await page.keyboard.press('Space');
    if (variant === 'after') {
      await page.waitForSelector('.e2e-test-confirm-delete-state', {visible: true});
      await snapshot(variant, '03', 'Space opens confirmation');
      assert(await page.$eval('ngb-modal-window .modal-body', element => element.textContent.includes('Review')));
      await page.click('.e2e-test-confirm-delete-state');
      await page.waitForSelector('.e2e-test-delete-node', {hidden: true});
      assert(await page.$$eval('.e2e-test-exploration-graph .e2e-test-node-label', elements => elements.length === 1 && elements[0].textContent.includes('Introduction')));
      await snapshot(variant, '04', 'Review card removed after confirmation');
    } else {
      await delay(1000); assert.strictEqual(await page.$('.e2e-test-confirm-delete-state'), null);
      await snapshot(variant, '03', 'Space produces no confirmation');
    }
    log(variant + ' full-editor checks passed');
    results[variant] = {role, focusReached, enterConfirmation, focusedClickConfirmation: variant === 'after', spaceConfirmation: variant === 'after', removedAfterConfirmation: variant === 'after'};
    await page.emulateNetworkConditions(null);
  }
  fs.writeFileSync(path.join(proof, 'browser-errors.json'), JSON.stringify(errors, null, 2));
  fs.writeFileSync(path.join(proof, 'full-editor-results.json'), JSON.stringify({browser: await browser.version(), results, errors, httpErrors}, null, 2));
  log('Full-editor smoke check completed');
  await browser.close();
})().catch(async error => {
  log(String(error));
  if (page) await page.screenshot({path: path.join(proof, 'failure.png')}).catch(() => {});
  fs.writeFileSync(path.join(proof, 'browser-errors.json'), JSON.stringify(errors, null, 2));
  fs.copyFileSync(path.join(taskDir, 'fixed-template.html'), graphTemplate);
  if (browser) await browser.close();
  process.exitCode = 1;
});
