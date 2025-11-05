// Fetch the HTML from a static site and print the first 200 characters.

import { CheerioCrawler, Dataset } from 'crawlee';
import fs from 'fs';

const startUrls = ['https:example.com'];
/*const customDataset = await Dataset.open('my-dataset-name', {
    storageDir: '/path/to/custom/dataset/storage'}); */


const crawler = new CheerioCrawler({
        async requestHandler({$, request, log}){
            log.info('Crawling: ${request.url}');

            const textContent = $('body').text().trim();

            const first200Chars = textContent.substring(0,200);

            console.log(first200Chars);

            await Dataset.pushData({
                url : request.url,
                preview: first200Chars,
            })

        }
    });

await crawler.run(startUrls);


const dataset = await Dataset.open();
const { items } = await dataset.getData();

fs.writeFileSync('./result.json', JSON.stringify(items, null, 2));

console.log("Exported data in the form of json format");