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

    // wait until at least one product name appears
    await page.waitForSelector('.product-card__name');

    const products = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.product-card__name');
        return Array.from(nodes).map(el =>
            Array.from(el.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .join('')
        );
    });

    console.log(products);

<<<<<<< HEAD
        // The correct CSS Selector, no typos
        const cssSelector = 'a[href^="tel:"]'; 

        // Wait for the element to appear
        await page.waitForSelector(cssSelector, { visible: true, timeout: 45000 });

        // Extract the text content
        const phoneNumber = await page.$eval(cssSelector, el => el.textContent.trim()); 

        if (phoneNumber) {
            console.log(' Phone Number Found (via Puppeteer):');
            // Clean up the output to show only the essential part of the number
            const cleanedNumber = phoneNumber.split('/')[0].trim();
            console.log(cleanedNumber);
        } else {
            console.log(' Element found, but text content was empty.');
        }

    } catch (error) {
        console.error(' An error occurred during scraping:', error.message);
    } finally {
        await browser.close();
    }
=======
    await browser.close();
>>>>>>> 2e6220c (puppeteer)
})();
