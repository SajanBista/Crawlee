import { PuppeteerCrawler, Dataset } from 'crawlee';
import fs from 'fs';

const startId = 7;
const endId = 8;
const crawler = new PuppeteerCrawler({
    requestHandler: async ({ page, request }) => {
        const noteName = await page.$eval('.description_piece strong a', el => el.textContent.trim()).catch(() => '');
        
        const avers = await page.$$eval('.photo_avers img', imgs => imgs[0]?.src ? [imgs[0].src] : []);
        const revers = await page.$$eval('.photo_revers img', imgs => imgs[0]?.src ? [imgs[0].src] : []);

        // Save each coin to Crawlee dataset
        await Dataset.pushData({
            noteName,
            imageUrls: { avers, revers }
        });
    }
});

const startUrls = [];
for (let id = startId; id < endId; id++) {
    startUrls.push(`https://en.numista.com/catalogue/index.php?r=/new7/&p=${id}&q=200`);
}

await crawler.run(startUrls);


// After crawler finishes, export the dataset to a single JSON file
const data = await Dataset.getData();
fs.writeFileSync('numista_data.json', JSON.stringify(data.items, null, 2));

console.log('Scraping complete! Saved in numista_data.json');





