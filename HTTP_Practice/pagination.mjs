import { PuppeteerCrawler, Dataset } from 'crawlee';

const startUrl = 'https://www.daraz.com.np/smartphones/';
const maxProducts = 100;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const crawler = new PuppeteerCrawler({
    launchContext: { launchOptions: { headless: true } },
    maxRequestRetries: 3,
    requestHandler: async ({ page, request, log }) => {
        log.info(`Crawling: ${request.url}`);

        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept-Language': 'en-US,en;q=0.9',
        });

        await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for product items using stable selector
        await page.waitForSelector('a[data-qa-locator="product-item"]', { timeout: 30000 });

        let productsCollected = 0;
        let previousHeight = 0;

        while (productsCollected < maxProducts) {
            const products = await page.$$eval('a[data-qa-locator="product-item"]', items =>
                items.map(item => ({
                    title: item.innerText || null,
                    link: item.href || null
                }))
            );

            for (const product of products.slice(productsCollected)) {
                await Dataset.pushData(product);
            }

            productsCollected = products.length;

            previousHeight = await page.evaluate(() => document.body.scrollHeight);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await delay(2500); // wait for new items to load

            const newHeight = await page.evaluate(() => document.body.scrollHeight);
            if (newHeight === previousHeight) break; // no more items
        }

        log.info(`Scraped ${productsCollected} products from ${request.url}`);
    },
});

await crawler.run([startUrl]);
