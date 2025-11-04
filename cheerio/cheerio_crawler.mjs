import { CheerioCrawler, Dataset } from 'crawlee';  // Use 'crawlee' instead of 'apify' for modern setup

const startUrls = [
    'https://example.com',
    'https://en.wikipedia.org/wiki/Web_scraping',
];

const crawler = new CheerioCrawler({
    async requestHandler({ $, request, log }) {
        log.info(`Crawling: ${request.url}`);

        const title = $('title').text().trim();
        const description = $('meta[name="description"]').attr('content') || 'No description';

        const result = {
            url: request.url,
            title,
            description,
        };

        await Dataset.pushData(result);
        log.info(`Extracted data: ${JSON.stringify(result)}`);
    },
    maxRequestsPerCrawl: 5,
    maxConcurrency: 3,
});

crawler.run(startUrls);
