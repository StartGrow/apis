const express = require('express');
const bypassOuo = require('./bypass');
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

app.get('/ouo', async (req, res) => {
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

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
