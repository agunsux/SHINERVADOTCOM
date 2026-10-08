import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

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
      console.log(`Server for Lighthouse running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function runLighthouse() {
  const server = await startServer(4321);

  const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });

  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      disabled: false,
    },
    throttlingMethod: 'provided', // use direct local network for clean evaluation without arbitrary simulated lag
  };

  const runnerResult = await lighthouse('http://localhost:4321', options);
  const report = runnerResult.lhr;

  const scores = {
    performance: Math.round(report.categories.performance.score * 100),
    accessibility: Math.round(report.categories.accessibility.score * 100),
    bestPractices: Math.round(report.categories['best-practices'].score * 100),
    seo: Math.round(report.categories.seo.score * 100),
  };

  console.log('LIGHTHOUSE_SCORES:', JSON.stringify(scores, null, 2));

  // If any audits failed, print titles
  const failedAudits = [];
  for (const [key, audit] of Object.entries(report.audits)) {
    if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'informative') {
      failedAudits.push({ id: key, title: audit.title, score: audit.score, explanation: audit.explanation || audit.description });
    }
  }

  if (failedAudits.length > 0) {
    console.log('AUDIT_NOTICES:', JSON.stringify(failedAudits, null, 2));
  }

  await chrome.kill();
  server.close();
}

runLighthouse().catch((err) => {
  console.error(err);
  process.exit(1);
});
