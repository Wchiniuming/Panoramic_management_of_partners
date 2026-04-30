const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('Login successful');

    // Navigate to task management
    await page.goto('http://localhost:3000/tasks', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('On tasks page');

    // Find and click first task row
    const taskRow = page.locator('.ant-table-tbody tr').first();
    if (await taskRow.isVisible()) {
      await taskRow.click();
      await page.waitForTimeout(2000);
      console.log('Task detail opened');

      // Take screenshot of drawer
      await page.screenshot({ path: '/tmp/task-detail.png', fullPage: false });
      console.log('Screenshot saved to /tmp/task-detail.png');

      // Also get the HTML of the drawer content
      const drawerContent = await page.evaluate(() => {
        const drawer = document.querySelector('.ant-drawer-body');
        return drawer ? drawer.innerHTML.substring(0, 500) : 'No drawer found';
      });
      console.log('Drawer HTML preview:', drawerContent);
    } else {
      console.log('No task rows found');
    }

    // Check what styles are applied to the info tab
    const infoTabStyles = await page.evaluate(() => {
      const tabPane = document.querySelector('[data-tab-key="info"]');
      if (!tabPane) return 'No info tab found';
      const firstDiv = tabPane.querySelector('div');
      return firstDiv ? getComputedStyle(firstDiv).cssText : 'No div found';
    });
    console.log('Info tab computed style:', infoTabStyles);

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: '/tmp/error.png' }).catch(() => {});
  }

  await browser.close();
})();
