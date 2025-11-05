import { CheerioCrawler } from 'crawlee';

const crawler = new CheerioCrawler({
    requestHandler: async ({ request, log, httpClient }) => {
        try {
            // Use the httpClient passed in the requestHandler
            const response = await httpClient.get(request.url, {
                auth: { username: 'user', password: 'passwd' },
            });

            log.info(`Status: ${response.status}`);
            log.info(await response.text());
        } catch (error) {
            log.error(`Failed to fetch ${request.url}: ${error.response?.status}`);
        }
    },
});

// Run the crawler
await crawler.run(['https://httpbin.org/basic-auth/user/passwd']);
