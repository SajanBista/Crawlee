// import { PlaywrightCrawler } from 'crawlee';

// const crawler = new PlaywrightCrawler({

//     async requestHandler({page, request, log}){
//     log.info('scraping ${request.url}');

//     const title = await page.title();

//     console.log('page title :', title)
//     },
// });

// await crawler.run(['https://example.com'])

import  { ProxyConfiguration, CheerioCrawler } from  'crawlee';

const proxyConfiguration = new ProxyConfiguration({
    proxyUrls: ['https://username:password@proxy-server.com:8000'],
});

const crawler = new CheerioCrawler({
    proxyConfiguration,
    async requestHandler({ request }){
        console.log(`using proxy for ${request.url}`);
    }
});


await crawler.run(['https://example.com']);