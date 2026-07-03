import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../docs-site/images/02-ai-breakdown.png');

const mockBreakdown = {
  issues: [
    {
      title: '新規顧客獲得チャネルの確立',
      tasks: [
        'ターゲットペルソナを3パターン定義する',
        'SEO記事を月4本公開する',
        'SNS広告のA/Bテストを実施する',
      ],
    },
    {
      title: '既存顧客単価（ARPU）の向上',
      tasks: [
        'アップセル提案資料を作成する',
        '既存顧客アンケートを実施する',
      ],
    },
  ],
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.route('**/api/ai/breakdown', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockBreakdown),
  });
});

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

const board = page.locator('div.flex.h-full.overflow-hidden').first();
await board.waitFor({ state: 'visible', timeout: 15000 });

// Ensure a KGI is selected
const goalCard = board.locator('[class*="rounded-xl"][class*="cursor-pointer"]').first();
if (await goalCard.count()) {
  await goalCard.click();
}

// Open AI breakdown in KPI pane
const aiButton = page.getByRole('button', { name: 'AIでKPI/KDIを提案' });
await aiButton.waitFor({ state: 'visible', timeout: 15000 });
await aiButton.click();

// Wait for preview panel
await page.getByText('AI提案（プレビュー）').waitFor({ state: 'visible', timeout: 10000 });
await page.waitForTimeout(600);

// Board children: KGI | handle | KPI | handle | KDI | handle | Review
const kgiPane = board.locator('> div').nth(0);
const kpiPane = board.locator('> div').nth(2);

const kgiBox = await kgiPane.boundingBox();
const kpiBox = await kpiPane.boundingBox();
if (!kgiBox || !kpiBox) throw new Error('Could not find pane bounding boxes');

const clip = {
  x: kgiBox.x,
  y: Math.min(kgiBox.y, kpiBox.y),
  width: kgiBox.width + kpiBox.width + 8,
  height: Math.max(kgiBox.height, kpiBox.height),
};

await page.screenshot({ path: outPath, clip });
console.log('Saved:', outPath);

await browser.close();
