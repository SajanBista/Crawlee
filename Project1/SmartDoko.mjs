import { PlaywrightCrawler, Dataset } from 'crawlee';
import fs from 'fs';
import cheerio from 'cheerio';

class SmartDokoScraper {
    constructor() {
        this.results = []; // store results

        this.crawler = new PlaywrightCrawler({
            maxRequestsPerCrawl: 1000,
            maxConcurrency: 5,
            requestHandlerTimeoutSecs: 60,
            headless: true,

            requestHandler: async ({ request, page, log }) => {
                const url = request.url;
                await page.waitForLoadState('domcontentloaded');

                // Scroll to load lazy-loaded products
                const scrollDelay = 1000;
                const maxScrolls = 10;
                for (let i = 0; i < maxScrolls; i++) {
                    const previousHeight = await page.evaluate('document.body.scrollHeight');
                    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                    await page.waitForTimeout(scrollDelay);
                    const newHeight = await page.evaluate('document.body.scrollHeight');
                    if (newHeight === previousHeight) break;
                }

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

        const nextPageUrl = this.extractNextPageUrl($, request.loadedUrl);
        if (nextPageUrl) await this.crawler.addRequests([nextPageUrl]);

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

    extractNextPageUrl($, baseUrl) {
        const nextLink = $('a.next, a[rel="next"], .pagination a:contains("Next")').attr('href');
        return nextLink ? new URL(nextLink, baseUrl).href : null;
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

        // Save to JSON file
        const filePath = './smartDoko.json';
        fs.writeFileSync(filePath, JSON.stringify(this.results, null, 2));
        console.log(`💾 Results saved to ${filePath}`);

        // Optional: export Crawlee dataset
        const dataset = await Dataset.open();
        await dataset.exportToJSON('products');
        await dataset.exportToCSV('products');

        console.log('✅ Scraping completed successfully!');
    }
}

// Run the scraper
const scraper = new SmartDokoScraper();
await scraper.run();
