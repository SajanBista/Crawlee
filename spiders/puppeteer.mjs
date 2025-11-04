import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
    );

    const url = 'https://www.daraz.com.np/earphones-headsets/';
    await page.goto(url, { waitUntil: 'networkidle2' });

    const products = await page.evaluate(() => {
        // select all product name divs
        const nodes = document.querySelectorAll('.product-card__name');
        return Array.from(nodes).map(el =>
            Array.from(el.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .join('')
        );
    });

    console.log(products);

    await browser.close();
})();
