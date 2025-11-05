import { PuppeteerCrawler, Dataset } from 'crawlee';

const crawler = new PuppeteerCrawler({
    launchContext: {
        launchOptions: {
            headless: true, // set false to see the browser
        },
    },
    maxRequestRetries: 5, // retry failed requests
    requestHandler: async ({ page, request, log }) => {
        log.info(`Crawling: ${request.url}`);

        try {
            // Set custom headers to mimic a real browser
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html',
            });

            // Navigate to the page
            const response = await page.goto(request.url, {
                waitUntil: 'networkidle2', // wait for network to be idle
                timeout: 30000,
            });

            // Handle 503 / 429 status codes
            const status = response.status();
            if ([503, 429].includes(status)) {
                log.warn(`Received status ${status}. Will retry.`);
                throw new Error(`${status} Service Unavailable`);
            }

            // Wait for body content
            await page.waitForSelector('body');

            // Get page content
            const content = await page.content();

            // Save preview of HTML to dataset
            await Dataset.pushData({
                url: request.url,
                status,
                preview: content.substring(0, 200),
            });

            log.info(`Saved preview for ${request.url}`);
        } catch (error) {
            log.error(`Failed to fetch ${request.url}: ${error.message}`);
            throw error; // ensures Crawlee retries failed requests
        }
    },
});

await crawler.run([
    'https://www.daraz.com.np/', // Replace/add more URLs here
]);
