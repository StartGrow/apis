const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const cp = require('child_process');

const app = express();
app.use(express.json());

const utils = {
  formatSize(size) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(2)} ${units[i]}`;
  }
};

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

app.get('/api/bypass', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.includes('ouo.')) {
    return res.status(400).json({ error: 'URL tidak valid atau bukan ouo.io/ouo.press' });
  }

  try {
    console.log('[API] Bypass:', url);
    const finalUrl = await bypassOuo(url);
    res.json({ success: true, url: finalUrl });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.all('/', (_, res) => {
  const status = {};
  try {
    status['diskUsage'] = cp.execSync('du -sh').toString().split('M')[0] + ' MB';
  } catch {
    status['diskUsage'] = 'N/A';
  }

  const used = process.memoryUsage();
  for (let x in used) status[x] = utils.formatSize(used[x]);

  const totalmem = os.totalmem();
  const freemem = os.freemem();
  status['memoryUsage'] = `${utils.formatSize(totalmem - freemem)} / ${utils.formatSize(totalmem)}`;

  const id = process.env.SPACE_ID;
  res.json({
    message: id
      ? `Go to https://hf.co/spaces/${id}/discussions for discuss`
      : 'Hello World!',
    uptime: new Date(process.uptime() * 1000).toUTCString().split(' ')[4],
    status
  });
});

const PORT = process.env.PORT || 3111;
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
