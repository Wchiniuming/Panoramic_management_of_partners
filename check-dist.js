const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('Login OK');

    await page.goto('http://localhost:3002/tasks', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('On tasks page');

    const taskRow = page.locator('.ant-table-tbody tr').first();
    if (await taskRow.isVisible()) {
      await taskRow.click();
      await page.waitForTimeout(3000);
      console.log('Drawer opened');

      const drawerHTML = await page.evaluate(() => {
        const drawer = document.querySelector('.ant-drawer-body');
        return drawer ? drawer.innerHTML.substring(0, 1000) : 'No drawer';
      });
      console.log('Drawer HTML:', drawerHTML);

      const infoTabCheck = await page.evaluate(() => {
        const tabPane = document.querySelector('.ant-tabs-tabpane-active');
        if (!tabPane) return 'No active tab';
        const firstGrid = tabPane.querySelector('[style*="grid"]');
        return firstGrid ? 'HAS GRID STYLES: ' + firstGrid.getAttribute('style').substring(0, 200) : 'NO GRID - using Descriptions';
      });
      console.log('Info tab check:', infoTabCheck);
    } else {
      console.log('No task rows');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  await browser.close();
})();
