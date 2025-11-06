import { PuppeteerCrawler, Dataset, log } from 'crawlee';

const startId = 1; // start scraping from this id
const endId = 5;  // end scraping here

// Custom headers (same as your Python spider)
const headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.8",
    "referer": "https://en.numista.com/catalogue/index.php?r=&st=147&cat=y&im1=&im2=&ru=&ie=&ca=3&no=&v=&a=&dg=&i=&b=&m=&f=&t=&t2=&w=&mt=&u=&g=",
    "sec-ch-ua": '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?1",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36"
};

const crawler = new PuppeteerCrawler({
    maxConcurrency: 2,
    headless: true,
    launchContext: {
        launchOptions: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    },

    requestHandler: async ({ page, request, log }) => {
        log.info(`Scraping ${request.url}`);

        try {
            await page.setExtraHTTPHeaders(headers);
            await page.goto(request.url, { waitUntil: 'domcontentloaded' });

            // Extract note name
            await page.waitForSelector('#description_piece strong a', { timeout: 5000 });
            const noteName = await page.$eval('#main_title h1', el => el.textContent.trim());

            // Extract images
            const imageUrls = await page.$$eval('#photo_avers img', imgs => imgs.map(i => i.src));

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
    }
});

// Generate start URLs
const startUrls = [];
for (let id = startId; id < endId; id++) {
    // startUrls.push(`https://en.numista.com/catalogue/pieces${id}.html`);
    startUrls.push(`https://en.numista.com/catalogue/index.php?r=/new7/&p=${id}&q=200`);
}

await crawler.run(startUrls);

console.log('Crawling complete!');
