const { chromium } = require('playwright');

async function bypassOuo(url) {
  if (!url.includes('ouo.')) throw new Error('URL bukan ouo.io atau ouo.press');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36'
  });
  const page = await context.newPage();

  await page.route('**/*', (route) => {
    const reqUrl = route.request().url();
    if (reqUrl.includes('ouo')) {
      route.continue();
    } else {
      route.abort();
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#btn-main:not(.disabled)', { timeout: 30000 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
      page.click('#btn-main')
    ]);

    let currentUrl = page.url();

    // Looping jika belum kembali ke /go/
    for (let i = 0; i < 10; i++) {
      if (currentUrl.includes('/go/')) break;
      await page.waitForTimeout(1000);
      currentUrl = page.url();
    }

    if (!currentUrl.includes('/go/')) throw new Error('Gagal redirect ke /go/');

    await page.waitForSelector('#btn-main:not(.disabled)', { timeout: 20000 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {}),
      page.click('#btn-main')
    ]);

    return page.url();
  } catch (err) {
    throw new Error('Bypass gagal: ' + err.message);
  } finally {
    await browser.close();
  }
}

module.exports = bypassOuo;
