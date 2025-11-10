import { PlaywrightCrawler, Dataset } from 'crawlee';
import fs from 'fs';
import cheerio from 'cheerio';

class SmartDokoScraper {
    constructor() {
        this.results = [];

        this.crawler = new PlaywrightCrawler({
            maxRequestsPerCrawl: 1000,
            maxConcurrency: 2,
            requestHandlerTimeoutSecs: 300, // increased timeout
            
            headless: true,
                launchContext: {
        prePageCreateHooks: [
            async ({ page }) => {
                if (fs.existsSync('cookies.json')) {
                    const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
                    await page.context().addCookies(cookies);
                    console.log(' Loaded cookies into context');
                }
            },
        ],
    },


            requestHandler: async ({ request, page, log }) => {
                const url = request.url;
                await page.waitForLoadState('domcontentloaded');

                // Optional scroll to trigger lazy loading
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
                await page.waitForTimeout(1000);

                // Click all "More" links safely
                const maxMoreClicks = 20; // safety limit
                let clicks = 0;
                let moreLink = await page.$('div.more-btn a.view-all');

                while (moreLink && clicks < maxMoreClicks) {
                    try {
                        await moreLink.click();
                        log.info('Clicked "More" link');
                        await page.waitForTimeout(2000); // wait for new products
                        clicks++;
                    } catch (err) {
                        log.warn('Failed to click "More", stopping');
                        break;
                    }
                    moreLink = await page.$('div.more-btn a.view-all');
                }

                // Get final HTML after loading all products
                const content = await page.content();
                const $ = cheerio.load(content);

                if (url.includes('/category/')) {
                    await this.handleCategoryPage({ request, $, log });
                } else if (this.isProductUrl(url)) {
                    await this.handleProductPage({ request, $, log });
                }
            },

            failedRequestHandler: ({ request, log }) => {
                log.error(`Request failed: ${request.url}`);
            },
        });
    }

    isProductUrl(url) {
        return url.includes('/product/') || url.includes('/item/') || url.includes('/p/');
    }

    async handleCategoryPage({ request, $, log }) {
        log.info(`Processing category page: ${request.url}`);

        const productLinks = [];
        $('a[href*="/product/"], a[href*="/product-"], a[href*="/compare/"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('#')) {
                const fullUrl = new URL(href, request.loadedUrl).href;
                productLinks.push(fullUrl);
            }
        });

        const uniqueLinks = [...new Set(productLinks)];
        log.info(`Found ${uniqueLinks.length} product links`);
        await this.crawler.addRequests(uniqueLinks);

        const categoryInfo = {
            url: request.url,
            title: $('h1, .page-title, .category-title').first().text().trim(),
            productCount: uniqueLinks.length,
            scrapedAt: new Date().toISOString(),
        };

        this.results.push(categoryInfo);
        await Dataset.pushData(categoryInfo);
    }

    async handleProductPage({ request, $, log }) {
        log.info(`Processing product page: ${request.url}`);

        const productData = {
            url: request.url,
            title: this.extractText($, 'h1, .product-title, .name'),
            price: this.extractText($, '.price, .price-new, [class*="price"]'),
            originalPrice: this.extractText($, '.price-old, .old-price, [class*="price-old"]'),
            category: 'TV & Home Appliances',
            scrapedAt: new Date().toISOString(),
        };

        this.cleanProductData(productData);
        this.results.push(productData);
        await Dataset.pushData(productData);

        log.info(`✅ Saved product: ${productData.title}`);
    }

    extractText($, selector) {
        return $(selector).first().text().trim().replace(/\s+/g, ' ');
    }

    cleanProductData(product) {
        Object.keys(product).forEach(key => {
            if (typeof product[key] === 'string') {
                product[key] = product[key].replace(/\s+/g, ' ').trim();
            }
        });
    }

    async run() {
        const startUrls = [
            'https://smartdoko.com/category/tv-home-appliances-183',
        ];

        await this.crawler.run(startUrls);

        // Save results to JSON
        const filePath = './smartDoko.json';
        fs.writeFileSync(filePath, JSON.stringify(this.results, null, 2));
        console.log(`💾 Results saved to ${filePath}`);

        // Export Crawlee dataset
        const dataset = await Dataset.open();
        await dataset.exportToJSON('products');
        await dataset.exportToCSV('products');

        console.log(' Scraping completed successfully!');
    }
}

// Run the scraper
const scraper = new SmartDokoScraper();
await scraper.run();
