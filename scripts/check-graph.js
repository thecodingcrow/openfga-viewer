import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // let canvas/layout settle
  await page.screenshot({ path: 'graph-screenshot.png', fullPage: true });
  const info = await page.evaluate(() => {
    const nodeLabels = Array.from(document.querySelectorAll('.fga-node')).map(
      (el) => el.textContent?.trim() ?? ''
    );
    const edgeEls = document.querySelectorAll('.react-flow__edge');
    const edgeIds = Array.from(edgeEls).map((e) => e.getAttribute('data-id') ?? '');
    return { nodeLabels, nodeCount: nodeLabels.length, edgeCount: edgeEls.length, edgeIds };
  });
  console.log('Nodes:', info.nodeCount);
  console.log('Edges:', info.edgeCount);
  console.log('Sample edge IDs:', info.edgeIds?.slice(0, 5));
  await browser.close();
})();
