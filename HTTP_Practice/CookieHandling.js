import { CheerioCrawler } from 'crawlee';

const crawler = new CheerioCrawler({
    requestHandler: async ({ request, log, httpClient }) => {
        // First request sets the cookie
        const setCookieResponse = await httpClient.get('https://httpbin.org/cookies/set?theme=light');
        const setCookie = setCookieResponse.headers['set-cookie'];
        log.info('Set-Cookie header:');
        log.info(setCookie);

        // Second request includes cookie
        const cookieResponse = await httpClient.get('https://httpbin.org/cookies', {
            headers: { Cookie: setCookie.join('; ') },
        });
        log.info('Response JSON:');
        log.info(await cookieResponse.text());
    },
});

await crawler.run(['https://httpbin.org/cookies/set?theme=light']);
