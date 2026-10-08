import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const screenshotsDir = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Minimal static file server for dist
function startServer(port = 4321) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml',
    '.webmanifest': 'application/manifest+json',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    let filePath = path.join(distDir, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Static server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function run() {
  const server = await startServer(4321);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const targets = [
    { name: 'shinerva-390.png', width: 390, height: 844 },
    { name: 'shinerva-768.png', width: 768, height: 1024 },
    { name: 'shinerva-1440.png', width: 1440, height: 900 },
  ];

  const results = [];

  for (const target of targets) {
    const page = await browser.newPage({
      viewport: { width: target.width, height: target.height },
      deviceScaleFactor: 2,
    });

    await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });

    // Evaluate horizontal overflow
    const overflowInfo = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const elements = Array.from(document.querySelectorAll('*'));
      const overflowing = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 1) {
          overflowing.push({
            tag: el.tagName,
            id: el.id,
            className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
            right: rect.right,
            width: rect.width,
          });
        }
      }

      return {
        hasOverflow: docWidth > winWidth,
        scrollWidth: docWidth,
        innerWidth: winWidth,
        overflowingElementsCount: overflowing.length,
        sampleOverflow: overflowing.slice(0, 3),
      };
    });

    // Scroll through the page to trigger IntersectionObserver animations and verify render
    await page.evaluate(async () => {
      document.querySelectorAll('[data-fade-up]').forEach((el) => {
        el.classList.add('fade-up-visible');
        el.classList.remove('fade-up-init');
      });
    });
    await page.waitForTimeout(300);

    const screenshotPath = path.join(screenshotsDir, target.name);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    results.push({
      target: target.name,
      viewport: `${target.width}x${target.height}`,
      overflowInfo,
      screenshotPath,
    });

    await page.close();
  }

  // Also check 375px specifically for mobile safety
  const page375 = await browser.newPage({
    viewport: { width: 375, height: 667 },
  });
  await page375.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  const overflow375 = await page375.evaluate(() => {
    return {
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
  await page375.close();

  await browser.close();
  server.close();

  console.log('RESULTS:', JSON.stringify({ results, overflow375 }, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
