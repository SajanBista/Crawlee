import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({

    async requestHandler({page, request, log}){
    log.info('scraping ${request.url}');

    const title = await page.title();

    console.log('page title :', title)
    },
});

await crawler.run(['https://example.com'])