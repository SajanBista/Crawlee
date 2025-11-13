//Check websites, and write a Node.js script for extracting data in a column.

/*Check websites, and write a Node.js script for extracting data in a column.

https://www.rottentomatoes.com/browse/movies_at_home/genres:action

scrape tile, lenght, Movie Info column ko all details in separate column, thumnail image url, hight quality preferred

 upload the data sheet (sharing.parsedom@gmail.com )
use proxies--webshare proxy, */


// Setup and Configuration
/*import fs from "fs";
import path from "path";
import {
  CheerioCrawler,
  ProxyConfiguration,
} from "crawlee";

export const START_URL = "https://www.rottentomatoes.com/browse/movies_at_home/genres:action";
export const OUTPUT_FILE = "rottentomatoes_action_movies.csv";


//Proxy yet to replace.
const proxyConfiguration = new ProxyConfiguration({
    proxyUrls: ["http://okitzyql-rotate:pxd2futo95rcc@p.webshare.io:80"],
});


// Headers 
const headers = {

    'user-agent' :
    'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
    'referer' :'https://www.rottentomatoes.com/',
    'sec-ch-ua' :' "Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile' :'?1',
    'sec-ch-ua-platform' :' "Android"',
    'cache-control':'public, max-age=86400',
    'accept': 'application/json',
}



//CSV headers
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


// Helper function to save CSV
function saveCSV(data, filePath) {
    const headerLine = csvHeaders.join(",") + "\n";
    const csvLines = data
        .map(row => csvHeaders.map(col => `"${row[col] || ""}"`).join(","))
        .join("\n");
    fs.writeFileSync(filePath, headerLine + csvLines, "utf8");
}

// Main
(async () => {
    const results = [];

    const crawler = new CheerioCrawler({
        proxyConfiguration,
        maxConcurrency: 5,
        requestHandlerTimeoutSecs: 60,
        async requestHandler({ $, request, enqueueLinks }) {
            const url = request.url;
            console.log(`Processing: ${url}`);

            // If listing page
            if (url.includes("browse/movies_at-home")) {
                // Extract all movie links
                const movieLinks = [];
                $("a.js-tile-link").each((i, el) => {
                    const link = $(el).attr("href");
                    if (link) movieLinks.push(`https://www.rottentomatoes.com${link}`);
                });

                // Enqueue movie pages
                await enqueueLinks({
                    urls: movieLinks,
                    label: "movie",
                });

                // Enqueue next page if exists
                const nextPage = $("a[data-qa='pagination-next']").attr("href");
                if (nextPage) {
                    await enqueueLinks({ urls: [`https://www.rottentomatoes.com${nextPage}`], label: "listing" });
                }
            }

            // If movie page
            if (request.userData.label === "movie") {
                const getText = (selector) => $(selector).text().trim() || "";

                const movieData = {
                    Title: getText(".flex-container .p--small"),
                    Description: getText(".no-border drawer-more rt-text"),
                    Thumbnail_URL: $("img.poster image").attr("src") || "",
                    Director: getText(".category-wrap:nth-child(1) rt-link"),
                    Producer: getText(".category-wrap:nth-child(2) rt-link"),
                    Genre: getText(".category-wrap:nth-child(6)"),
                    Runtime: getText(".category-wrap:nth-child(10)"),
                    "Original Language": getText(".category-wrap:nth-child(7)"),
                    "Release Date": getText(".category-wrap:nth-child(9)"),
                    URL: url
                };

                results.push(movieData);

                // Optional delay to avoid rate limits
                await new Promise(r => setTimeout(r, 500));
            }
        }
    });

    await crawler.run([START_URL]);

    // Save all results to CSV
    saveCSV(results, path.join(process.cwd(), "rottentomatoes_action_movies.csv"));
    console.log(`Scraping complete. Saved ${results.length} movies to ${OUTPUT_FILE}`);
})();


*/
import fs from "fs";
import path from "path";
import { CheerioCrawler, ProxyConfiguration } from "crawlee";

// Configuration
const START_URL = "https://www.rottentomatoes.com/browse/movies_at_home/genres:action";
const OUTPUT_FILE = "rottentomatoes_action_movies.csv";

// Webshare proxy
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

// Helper function to save CSV
function saveCSV(data, filePath) {
    const headerLine = csvHeaders.join(",") + "\n";
    const csvLines = data
        .map(row => csvHeaders.map(col => `"${row[col] || ""}"`).join(","))
        .join("\n");
    fs.writeFileSync(filePath, headerLine + csvLines, "utf8");
}

// Main crawler
(async () => {
    const results = [];

    const crawler = new CheerioCrawler({
        proxyConfiguration,
        maxConcurrency: 5,
        requestHandlerTimeoutSecs: 60,
        async requestHandler({ $, request, enqueueLinks }) {
            const url = request.url;
            console.log(`Processing: ${url}`);

            // If listing page
            if (url.includes("browse/movies_at-home")) {
                // Extract all movie links
                const movieLinks = [];
                $("a.js-tile-link").each((i, el) => {
                    const link = $(el).attr("href");
                    if (link) movieLinks.push(`https://www.rottentomatoes.com${link}`);
                });

                // Enqueue movie pages
                await enqueueLinks({
                    urls: movieLinks,
                    label: "movie",
                });

                // Enqueue next page if exists
                const nextPage = $("a[data-qa='pagination-next']").attr("href");
                if (nextPage) {
                    await enqueueLinks({
                        urls: [`https://www.rottentomatoes.com${nextPage}`],
                        label: "listing"
                    });
                }
            }

            // If movie page
            if (request.userData.label === "movie") {
                const getText = (selector) => $(selector).text().trim() || "";

                let thumb = $("img.posterImage").attr("src") || "";
                thumb = thumb.replace("_tmb", "_ori"); // higher quality

                const movieData = {
                    Title: getText("h1.scoreboard__title"),
                    Description: getText("div#movieSynopsis"),
                    Thumbnail_URL: thumb,
                    Director: getText("li.meta-row:contains('Director') span.meta-value"),
                    Producer: getText("li.meta-row:contains('Producer') span.meta-value"),
                    Genre: getText("li.meta-row:contains('Genre') span.meta-value"),
                    Runtime: getText("li.meta-row:contains('Runtime') span.meta-value"),
                    "Original Language": getText("li.meta-row:contains('Original Language') span.meta-value"),
                    "Release Date": getText("li.meta-row:contains('Release Date') span.meta-value"),
                    "Aspect Ratio": getText("li.meta-row:contains('Aspect Ratio') span.meta-value"),
                    URL: url
                };

                results.push(movieData);

                // Optional delay to reduce blocking
                await new Promise(r => setTimeout(r, 500));
            }
        }
    });

    await crawler.run([START_URL]);

    // Save all results to CSV
    saveCSV(results, path.join(process.cwd(), OUTPUT_FILE));
    console.log(`Scraping complete. Saved ${results.length} movies to ${OUTPUT_FILE}`);
})();
