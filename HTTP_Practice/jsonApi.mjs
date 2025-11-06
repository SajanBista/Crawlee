import { CheerioCrawler, Dataset } from 'crawlee';

import fs from 'fs';

const crawler = new CheerioCrawler({
  async requestHandler({ $, request, log }) {
    log.info(`Crawling ${request.url}`);

    $('.Box-row').each((_, el) => {
      const title = $(el).find('h2 a').text().trim();
      const url = 'https://github.com' + $(el).find('h2 a').attr('href');
      Dataset.pushData({ title, url });
    });
  }
});

await crawler.run(['https://github.com/trending']);



