// bypassOuo.js
const { chromium } = require('playwright');

async function bypassOuo(url) {
  if (!url.includes('ouo.')) throw new Error('URL bukan ouo.io atau ouo.press');

  console.log('[INFO] Memulai browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36'
  });
  const page = await context.newPage();

  await page.route('**/*', (route) => {
    const reqUrl = route.request().url();

    // Jangan blokir OUO & Cloudflare & Google
    if (
      reqUrl.includes('ouo.') ||
      reqUrl.includes('cloudflare.com') ||
      reqUrl.includes('gstatic.com') ||
      reqUrl.includes('google.com') ||
      reqUrl.includes('recaptcha')
    ) {
      route.continue();
    } else {
      console.log('[ROUTE] Memblokir:', reqUrl);
      route.abort();
    }
  });

  try {
    console.log('[STEP 1] Membuka halaman:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Kadang ada Cloudflare Turnstile: tunggu hingga elemen tidak loading
    console.log('[STEP 2] Menunggu tombol pertama aktif...');
    await page.waitForSelector('#btn-main:not(.disabled)', { timeout: 60000 });

    console.log('[STEP 3] Klik tombol pertama...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {
        console.warn('[WARN] Navigasi pertama timeout!');
      }),
      page.click('#btn-main')
    ]);

    let currentUrl = page.url();
    console.log('[INFO] URL setelah klik pertama:', currentUrl);

    // Loop menunggu redirect ke /go/
    for (let i = 0; i < 10; i++) {
      if (currentUrl.includes('/go/')) {
        console.log('[INFO] Redirect ke halaman /go/ berhasil');
        break;
      }
      await page.waitForTimeout(1000);
      currentUrl = page.url();
      console.log(`[INFO] Cek redirect (${i + 1}/10): ${currentUrl}`);
    }

    if (!currentUrl.includes('/go/')) throw new Error('Tidak berhasil redirect ke /go/');

    console.log('[STEP 4] Menunggu tombol kedua aktif...');
    await page.waitForSelector('#btn-main:not(.disabled)', { timeout: 30000 });

    console.log('[STEP 5] Klik tombol kedua...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {
        console.warn('[WARN] Navigasi kedua timeout!');
      }),
      page.click('#btn-main')
    ]);

    const finalUrl = page.url();
    console.log('[SUCCESS] URL akhir:', finalUrl);
    return finalUrl;
  } catch (err) {
    console.error('[ERROR] Gagal:', err.message);
    throw new Error('Bypass gagal: ' + err.message);
  } finally {
    console.log('[INFO] Menutup browser...');
    await browser.close();
  }
}

module.exports = bypassOuo;
