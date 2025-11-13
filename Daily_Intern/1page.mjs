import fs from "fs";
import path from "path";
import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";

// Constants
const START_URL = "https://www.rottentomatoes.com/browse/movies_at_home/genres:action";
const OUTPUT_FILE = "rottentomatoes_action_movies.csv";

// Proxy configuration (replace credentials)
const proxyConfiguration = new ProxyConfiguration({
    proxyUrls: ["http://okitzyql-rotate:pxd2futo95rcc@p.webshare.io:80"],
});

// CSV headers
const csvHeaders = [
    "Title",
    "Description",
    "Thumbnail_URL",
    "Director",
    "Producer",
    "Genre",
    "Runtime",
    "Original Language",
    "Release Date",
    "Aspect Ratio",
    "URL"
];

// Helper to save CSV
function saveCSV(data, filePath) {
    const headerLine = csvHeaders.join(",") + "\n";
    const csvLines = data
        .map(row => csvHeaders.map(col => `"${row[col] || ""}"`).join(","))
        .join("\n");
    fs.writeFileSync(filePath, headerLine + csvLines, "utf8");
}

// Main logic
(async () => {
    const results = [];

    const crawler = new PlaywrightCrawler({
        proxyConfiguration,
        maxConcurrency: 3,
        launchContext: {
            launchOptions: {
                headless: true, // set false if you want to see browser
            },
        },
        requestHandlerTimeoutSecs: 90,

        async requestHandler({ page, request, enqueueLinks, log }) {
            const url = request.url;
            log.info(`Processing: ${url}`);

            // --- Listing Page ---
            if (url.includes("/browse/")) {
                // Wait for movie tiles to load
                await page.waitForSelector("a[data-qa='discovery-media-list-item-caption']");
                const movieLinks = await page.$$eval(
                    "a[data-qa='discovery-media-list-item-caption']",
                    (els) => els.map(el => el.href)
                );

                log.info(`Found ${movieLinks.length} movies on this page.`);

                // Enqueue movie pages
                for (const link of movieLinks) {
                    await enqueueLinks({ urls: [link], userData: { label: "movie" } });
                }

                // Enqueue next page if available
                const nextButton = await page.$("button[aria-label='next']");
                if (nextButton) {
                    await nextButton.click();
                    await page.waitForTimeout(2000); // allow content load
                    const nextUrl = page.url();
                    await enqueueLinks({ urls: [nextUrl], userData: { label: "listing" } });
                }
            }

            // --- Movie Page ---
            if (request.userData.label === "movie") {
                await page.waitForSelector("h1.scoreboard__title", { timeout: 10000 }).catch(() => null);

                const getText = async (selector) => {
                    const el = await page.$(selector);
                    if (!el) return "";
                    return (await page.textContent(selector))?.trim() || "";
                };

                // Extract movie data
                const movieData = {
                    Title: await getText("h1.scoreboard__title"),
                    Description: await getText("#movieSynopsis"),
                    Thumbnail_URL: (await page.$eval("img.posterImage", el => el.src)).replace("_tmb", "_ori"),
                    Director: await getText("li.meta-row:has-text('Director') span.meta-value"),
                    Producer: await getText("li.meta-row:has-text('Producer') span.meta-value"),
                    Genre: await getText("li.meta-row:has-text('Genre') span.meta-value"),
                    Runtime: await getText("li.meta-row:has-text('Runtime') span.meta-value"),
                    "Original Language": await getText("li.meta-row:has-text('Original Language') span.meta-value"),
                    "Release Date": await getText("li.meta-row:has-text('Release Date') span.meta-value"),
                    "Aspect Ratio": await getText("li.meta-row:has-text('Aspect Ratio') span.meta-value"),
                    URL: url,
                };

                results.push(movieData);
                log.info(`✅ Scraped: ${movieData.Title}`);
                await page.waitForTimeout(500); // small delay
            }
        },
    });

    // Start the crawler
    await crawler.run([START_URL]);

    // Save results
    saveCSV(results, path.join(process.cwd(), OUTPUT_FILE));
    console.log(`\n✅ Scraping complete. Saved ${results.length} movies to ${OUTPUT_FILE}\n`);
})();
