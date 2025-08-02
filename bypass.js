const { chromium } = require('playwright');

async function bypassOuo(url) {
  if (!url.includes('ouo.')) throw new Error('URL bukan ouo.io atau ouo.press');

  console.log('[INFO] Memulai browser...');
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
      console.log('[ROUTE] Memblokir:', reqUrl);
      route.abort();
    }
  });

  try {
    console.log('[STEP 1] Membuka halaman:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('[STEP 2] Menunggu tombol pertama aktif...');
    await page.waitForSelector('#btn-main:not(.disabled)', { timeout: 30000 });

    console.log('[STEP 3] Mengklik tombol pertama...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {
        console.warn('[WARN] Navigasi pertama timeout!');
      }),
      page.click('#btn-main')
    ]);

    let currentUrl = page.url();
    console.log('[INFO] URL setelah klik pertama:', currentUrl);

    // Loop sampai masuk /go/
    for (let i = 0; i < 10; i++) {
      if (currentUrl.includes('/go/')) {
        console.log('[INFO] Berhasil redirect ke halaman /go/');
        break;
      }
      console.log(`[INFO] Menunggu redirect ke /go/ (${i + 1}/10)...`);
      await page.waitForTimeout(1000);
      currentUrl = page.url();
    }

    if (!currentUrl.includes('/go/')) throw new Error('Gagal redirect ke /go/');

    console.log('[STEP 4] Menunggu tombol kedua aktif di halaman /go/...');
    await page.waitForSelector('#btn-main:not(.disabled)', { timeout: 20000 });

    console.log('[STEP 5] Mengklik tombol kedua...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {
        console.warn('[WARN] Navigasi kedua timeout!');
      }),
      page.click('#btn-main')
    ]);

    const finalUrl = page.url();
    console.log('[SUCCESS] URL tujuan akhir:', finalUrl);
    return finalUrl;
  } catch (err) {
    console.error('[ERROR] Proses bypass gagal:', err.message);
    throw new Error('Bypass gagal: ' + err.message);
  } finally {
    console.log('[INFO] Menutup browser...');
    await browser.close();
  }
}

module.exports = bypassOuo;
