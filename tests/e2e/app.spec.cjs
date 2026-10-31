const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('https://browser.sentry-cdn.com/**', route => route.abort());
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
});

test('creates a family and calculates fixed flour quota and payment', async ({ page }) => {
  await page.locator('#aName').fill('عائلة الاختبار');
  await page.locator('#aMembers').fill('4');
  await page.locator('#aPage').fill('QA-01');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await expect(page.locator('#toast')).toContainText('تمت إضافة العائلة');
  await page.locator('#nav button[data-p="fam"]').click();
  const family = page.locator('#famList .card').filter({ hasText: 'عائلة الاختبار' });
  await expect(family).toContainText('36 كغم');
  await expect(family).toContainText('1,000 د.ع');
  await expect(family).toContainText('QA-01');
});

test('searches a family, records delivery, and updates monthly statistics', async ({ page }) => {
  await page.locator('#aName').fill('عائلة التوزيع');
  await page.locator('#aMembers').fill('4');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="dist"]').click();
  await page.locator('#distSearch').fill('عائلة التوزيع');
  const card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة التوزيع' });
  await expect(card).toContainText('36 كغم');
  await expect(card).toContainText('1,000 د.ع');
  await card.locator('input[id^="k_"]').check();
  await card.getByRole('button', { name: 'تسليم وتسجيل الاستلام' }).click();
  await expect(card).toContainText('مستلم بالكامل');
  await page.locator('#nav button[data-p="stats"]').click();
  await expect(page.locator('#statCards')).toContainText('1');
  await expect(page.locator('#statCards')).toContainText('1,000');
  await expect(page.locator('#statCards')).toContainText('المستلمون بالكامل');
});

test('family search filters results and escapes user-supplied HTML', async ({ page }) => {
  await page.locator('#aName').fill('<img src=x onerror=alert(1)>');
  await page.locator('#aMembers').fill('2');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="fam"]').click();
  await expect(page.locator('#famList img')).toHaveCount(0);
  await expect(page.locator('#famList')).toContainText('<img src=x onerror=alert(1)>');
  await page.locator('#famSearch').fill('اسم غير موجود');
  await expect(page.locator('#famList')).toContainText('لا توجد عوائل');
});

test('exports family backup as valid JSON', async ({ page }) => {
  await page.locator('#aName').fill('عائلة النسخة');
  await page.locator('#aMembers').fill('3');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="fam"]').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /نسخ احتياطي \(العوائل\)/ }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let raw = '';
  for await (const chunk of stream) raw += chunk.toString('utf8');
  const backup = JSON.parse(raw);
  expect(backup.type).toBe('families');
  expect(backup.families).toHaveLength(1);
  expect(backup.families[0].name).toBe('عائلة النسخة');
});


test('restores family records from a JSON backup file', async ({ page }) => {
  await page.locator('#aName').fill('عائلة الاستعادة');
  await page.locator('#aMembers').fill('5');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="fam"]').click();
  await page.locator('#famRestoreFile').setInputFiles({
    name: 'families-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      type: 'families',
      families: [{ id: 'restored-qa', name: 'عائلة مستعادة', members: 2, page: 'R-02', notes: '', share: 18, amount: 500, children: [], parentId: null }]
    }))
  });
  await expect(page.locator('#modal')).toHaveClass(/show/);
  await page.locator('#modalBox').getByRole('button', { name: 'نعم' }).click();
  await expect(page.locator('#famList')).toContainText('عائلة مستعادة');
  await expect(page.locator('#famList')).not.toContainText('عائلة الاستعادة');
});


test('handles an 81 kg quota in bag and remainder stages without losing payment balance', async ({ page }) => {
  await page.locator('#aName').fill('عائلة 81 كغم');
  await page.locator('#aMembers').fill('9');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="dist"]').click();
  await page.locator('#distSearch').fill('عائلة 81 كغم');
  let card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة 81 كغم' });
  await expect(card).toContainText('81 كغم');
  await expect(card).toContainText('1 كيس و 31 كغم');
  await card.locator('input[id^="b_"]').check();
  await card.getByRole('button', { name: 'تسليم وتسجيل الاستلام' }).click();
  card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة 81 كغم' });
  await expect(card).toContainText('مستلم جزئي');
  await expect(card).toContainText('50 كغم');
  await card.locator('input[id^="k_"]').check();
  await card.getByRole('button', { name: 'تسليم وتسجيل الاستلام' }).click();
  card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة 81 كغم' });
  await expect(card).toContainText('مستلم بالكامل');
  await expect(card).toContainText('81 كغم');
  await expect(card).toContainText('2,250 د.ع');
});

test('handles a 54 kg quota as one bag plus 4 kg remainder', async ({ page }) => {
  await page.locator('#aName').fill('عائلة 54 كغم');
  await page.locator('#aMembers').fill('6');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="dist"]').click();
  await page.locator('#distSearch').fill('عائلة 54 كغم');
  let card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة 54 كغم' });
  await expect(card).toContainText('54 كغم');
  await expect(card).toContainText('1 كيس و 4 كغم');
  await expect(card.locator('input[id^="b_"]')).toBeEnabled();
  await expect(card.locator('input[id^="k_"]')).toBeEnabled();
  await card.locator('input[id^="b_"]').check();
  await card.getByRole('button', { name: 'تسليم وتسجيل الاستلام' }).click();
  card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة 54 كغم' });
  await expect(card).toContainText('مستلم جزئي');
  await expect(card).toContainText('50 كغم');
  await card.locator('input[id^="k_"]').check();
  await card.getByRole('button', { name: 'تسليم وتسجيل الاستلام' }).click();
  card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة 54 كغم' });
  await expect(card).toContainText('مستلم بالكامل');
  await expect(card).toContainText('54 كغم');
  await expect(card).toContainText('1,500 د.ع');
});

test('editing a family member count recalculates its quota and payment', async ({ page }) => {
  await page.locator('#aName').fill('عائلة تعديل العدد');
  await page.locator('#aMembers').fill('4');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="fam"]').click();
  let card = page.locator('#famList .card').filter({ hasText: 'عائلة تعديل العدد' });
  await expect(card).toContainText('36 كغم');
  await expect(card).toContainText('1,000 د.ع');
  await card.getByRole('button', { name: 'تعديل التفاصيل بالكامل' }).click();
  await page.locator('#eMem').fill('5');
  await page.locator('#modalBox').getByRole('button', { name: 'حفظ' }).click();
  card = page.locator('#famList .card').filter({ hasText: 'عائلة تعديل العدد' });
  await expect(card).toContainText('45 كغم');
  await expect(card).toContainText('1,250 د.ع');
});

test('Sentry SDK initializes and receives handled app errors when the CDN is available', async ({ page }) => {
  await page.unroute('https://browser.sentry-cdn.com/**');
  await page.route('https://browser.sentry-cdn.com/8.47.0/bundle.min.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.Sentry = {
      init: function(options) { window.__sentryOptions = options; },
      withScope: function(callback) { callback({ setTag: function() {} }); },
      captureException: function(error) { window.__sentryCaptured = error.message; }
    };`
  }));
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__flourSentryReady)).toBe(true);
  await page.evaluate(() => window.__flourReportError(new Error('QA synthetic exception'), 'qa-test'));
  await expect.poll(() => page.evaluate(() => window.__sentryCaptured)).toBe('QA synthetic exception');
  const result = await page.evaluate(() => {
    const event = {
      user: { id: 'must-not-leave-device' },
      extra: { privateValue: 'must-not-leave-device' },
      request: { data: 'private', cookies: 'private', headers: { secret: 'private' }, query_string: 'private', url: 'https://example.test/path?name=private' },
      breadcrumbs: [{ data: { body: 'private', query: 'private', response: 'private', cookies: 'private', url: 'https://example.test/?name=private' } }]
    };
    const clean = window.__sentryOptions.beforeSend(event);
    return {
      pii: window.__sentryOptions.sendDefaultPii,
      environment: window.__sentryOptions.environment,
      beforeSend: typeof window.__sentryOptions.beforeSend,
      userRemoved: clean.user === undefined,
      extraEmpty: Object.keys(clean.extra).length === 0,
      requestDataRemoved: !('data' in clean.request) && !('cookies' in clean.request) && !('headers' in clean.request) && !('query_string' in clean.request),
      requestUrlClean: clean.request.url === 'https://example.test/path',
      breadcrumbClean: !('body' in clean.breadcrumbs[0].data) && !('query' in clean.breadcrumbs[0].data) && !('response' in clean.breadcrumbs[0].data) && !('cookies' in clean.breadcrumbs[0].data) && clean.breadcrumbs[0].data.url === 'https://example.test/'
    };
  });
  expect(result.pii).toBe(false);
  expect(result.beforeSend).toBe('function');
  expect(result.userRemoved).toBe(true);
  expect(result.extraEmpty).toBe(true);
  expect(result.requestDataRemoved).toBe(true);
  expect(result.requestUrlClean).toBe(true);
  expect(result.breadcrumbClean).toBe(true);
});

test('changing family size does not rewrite an already recorded month', async ({ page }) => {
  await page.locator('#aName').fill('عائلة سجل شهري');
  await page.locator('#aMembers').fill('4');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="dist"]').click();
  await page.locator('#distSearch').fill('عائلة سجل شهري');
  let card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة سجل شهري' });
  await card.locator('input[id^="k_"]').check();
  await card.getByRole('button', { name: 'تسليم وتسجيل الاستلام' }).click();
  card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة سجل شهري' });
  await expect(card).toContainText('مستلم بالكامل');
  await page.locator('#nav button[data-p="fam"]').click();
  const family = page.locator('#famList .card').filter({ hasText: 'عائلة سجل شهري' });
  await family.getByRole('button', { name: 'تعديل التفاصيل بالكامل' }).click();
  await page.locator('#eMem').fill('5');
  await page.locator('#modalBox').getByRole('button', { name: 'حفظ' }).click();
  await page.locator('#nav button[data-p="dist"]').click();
  card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة سجل شهري' });
  await expect(card).toContainText('عدد أفراد الأسرة');
  await expect(card).toContainText('36 كغم');
  await expect(card).toContainText('1,000 د.ع');
  await expect(card).toContainText('مستلم بالكامل');
  const next = await page.evaluate(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return { year: String(d.getFullYear()), month: String(d.getMonth() + 1) };
  });
  await page.locator('#dYear').selectOption(next.year);
  await page.locator('#dMonth').selectOption(next.month);
  card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة سجل شهري' });
  await expect(card).toContainText('45 كغم');
  await expect(card).toContainText('1,250 د.ع');
  await expect(card).toContainText('غير مستلم');
});
