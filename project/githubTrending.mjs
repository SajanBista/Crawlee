// github-trending-single-file.mjs
import { CheerioCrawler } from 'crawlee';
import fs from 'fs';
import { parse } from 'json2csv';

const START_URL = 'https://github.com/trending';
const results = []; // Collect all data here

const crawler = new CheerioCrawler({
    maxConcurrency: 5,
    requestHandlerTimeoutSecs: 60,

    async requestHandler({ $, request, log }) {
        log.info(`Crawling ${request.url}`);

        $('.Box-row').each((_, el) => {
            const title = $(el).find('h2 a').text().trim().replace(/\s/g, '');
            const url = 'https://github.com' + $(el).find('h2 a').attr('href');
            const description = $(el).find('p').text().trim() || null;
            const stars = $(el).find(`.Link--muted[href$="/stargazers"]`).text().trim();
            const language = $(el).find('[itemprop="programmingLanguage"]').text().trim() || null;

            results.push({ title, url, description, stars, language });
        });

        // Enqueue other trending periods (daily, weekly, monthly)
        const periods = ['daily', 'weekly', 'monthly'];
        for (const period of periods) {
            const nextUrl = `https://github.com/trending?since=${period}`;
            if (nextUrl !== request.url) {
                await crawler.addRequests([nextUrl]);
            }
        }
    },

    failedRequestHandler({ request, log }) {
        log.error(`Request failed too many times: ${request.url}`);
    }
});

(async () => {
    console.log('Starting GitHub Trending scraper...');
    await crawler.run([START_URL]);

    // Save all results in a single JSON file
    fs.writeFileSync('github_trending.json', JSON.stringify(results, null, 2));
    console.log(`Scraping finished. Total repos: ${results.length}`);
    console.log('Saved to github_trending.json');

    const csv = parse(results, { fields: ['title', 'url', 'description', 'stars', 'language'] });

    // Save to a single CSV file
    fs.writeFileSync('github_trending.csv', csv);

})();
