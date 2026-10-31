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

test('handles an exact 50 kg quota as one bag with no remainder checkbox', async ({ page }) => {
  await page.locator('#aName').fill('عائلة 50 كغم');
  await page.locator('#aMembers').fill('6');
  await page.getByRole('button', { name: 'إضافة عائلة' }).click();
  await page.locator('#nav button[data-p="dist"]').click();
  await page.locator('#distSearch').fill('عائلة 50 كغم');
  const card = page.locator('#distList .card.sub').filter({ hasText: 'عائلة 50 كغم' });
  await expect(card).toContainText('50 كغم');
  await expect(card.locator('input[id^="b_"]')).toBeEnabled();
  await expect(card.locator('input[id^="k_"]')).toBeDisabled();
  await card.locator('input[id^="b_"]').check();
  await card.getByRole('button', { name: 'تسليم وتسجيل الاستلام' }).click();
  await expect(page.locator('#distList .card.sub').filter({ hasText: 'عائلة 50 كغم' })).toContainText('مستلم بالكامل');
});
