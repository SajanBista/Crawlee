import puppeteer from 'puppeteer';

(async () => {
    // Replace this path with the *actual* path to your Brave executable!
    const braveExecutablePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'; 
    
    const browser = await puppeteer.launch({ 
        headless: false, // Use headless for scraping speed
        executablePath: braveExecutablePath, // <-- THIS IS THE FIX
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            // Add --user-data-dir if you want to use caching
            '--user-data-dir=./temp-cache' 
        ],
    });
    const page = await browser.newPage();
    const url = "https://www.newsummit.edu.np/";
    
    // OPTIMIZATION: Block heavy resources to speed up page load
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        // Use 'networkidle2' to wait for JavaScript to finish loading
        await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 90000 // Increased timeout for robustness
        });

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
})();
