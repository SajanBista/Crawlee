// github-trending-single-file.mjs
import { CheerioCrawler, Dataset, PuppeteerCrawler } from 'crawlee';
import fs from 'fs';
import { parse } from 'json2csv';
import { headers } from './Numista.mjs';

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

})();export const crawler = new PuppeteerCrawler({
    maxConcurrency: 10,
    mxRequestPerMinute: 60,
    maxRequestRetries: 3,
    useSessionPool: true,
    headless: true,

    //Error handling 
    failedRequestHandler: async ({ request }) => {
        console.log(`Request ${request.url} failed too many time`);
    }
},

    requestHandler, async ({ page, request, log }) => {
        log.info(`Scraping ${request.url}`);

        try {
            await page.setExtraHTTPHeaders(headers);
            await page.goto(request.url, { waitUntil: 'domcontentloaded' });

            // Extract note name
            // await page.waitForSelector('#description_piece strong a', { timeout: 5000 });
            const noteName = await page.$$('.description_piece strong a');
            if (items.length === 0) {
                console.warn(`No coins found on ${page.url()}`);
                return;
            }
            // Extract images
            const avers = await page.$$eval('.photo_avers img', imgs => imgs.map(i => i.src));

            const revers = await page.$$eval('.photo_revers img', imgs => imgs.map(i => i.src));

            // Extract obverse/reverse
            const obverse = await page.$$eval('h3', headers => {
                const h = headers.find(h => /Obverse/i.test(h.textContent));
                return h?.nextElementSibling?.textContent.trim() || '';
            });

            const reverse = await page.$$eval('h3', headers => {
                const h = headers.find(h => /Reverse/i.test(h.textContent));
                return h?.nextElementSibling?.textContent.trim() || '';
            });

            // Extract characteristics table
            const characteristics = await page.$$eval('#fiche_caracteristiques tr', rows => {
                const obj = {};
                rows.forEach(row => {
                    const key = row.querySelector('th')?.textContent.trim();
                    const value = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim()).join(' ');
                    if (key) obj[key] = value;
                });
                return obj;
            });

            // Extract description sections
            const descriptions = await page.$$eval('#fiche_descriptions h3', headers => {
                const data = {};
                headers.forEach(headerEl => {
                    const header = headerEl.textContent.trim();
                    if (header.includes('See also')) return;

                    let sibling = headerEl.nextElementSibling;
                    let content = '';
                    while (sibling && sibling.tagName !== 'H3') {
                        content += sibling.textContent.trim() + ' ';
                        sibling = sibling.nextElementSibling;
                    }
                    data[header] = content.trim();
                });
                return data;
            });

            // Extract collection table
            const collection = await page.$$eval('.collection tbody tr', rows => {
                const allRows = [];
                rows.forEach(row => {
                    const cols = row.querySelectorAll('td');
                    if (!cols.length) return;

                    const data = {};
                    cols.forEach((td, idx) => {
                        const text = td.textContent.trim();
                        if (text && !text.includes('Undetermined')) data[`col${idx}`] = text;
                    });
                    if (Object.keys(data).length) allRows.push(data);
                });
                return allRows;
            });

            // Numista Rarity index
            const rarityIndex = await page.$eval("div:has-text('Numista Rarity index') strong", el => el.textContent.trim()).catch(() => '');

            // Save to dataset (Crawlee JSON)
            await Dataset.pushData({
                URL: request.url,
                noteName,
                imageUrls,
                obverse,
                reverse,
                characteristics,
                descriptions,
                collection,
                rarityIndex
            });

            log.info(`Scraped successfully: ${request.url}`);

        } catch (err) {
            log.error(`Error scraping ${request.url}: ${err.message}`);
        }
    });

