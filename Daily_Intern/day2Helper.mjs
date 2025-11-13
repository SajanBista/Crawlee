import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import { parse } from "json2csv";

const START_URL = "https://www.rottentomatoes.com/browse/movies_at_home/genres:action";
const BASE_URL = "https://www.rottentomatoes.com";
const OUTPUT_FILE = "./output/rottentomatoes_action_movies.csv";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: BASE_URL,
};

function ensureFolderExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Scrape individual movie page
async function scrapeMoviePage(url) {
  try {
    const { data } = await axios.get(url, { headers: HEADERS });
    const $ = cheerio.load(data);

    const title = $("h1[data-qa='score-panel-movie-title']").text().trim();
    const length = $("p.scoreboard__info").text().trim();
    const description = $("div[data-qa='movie-info-synopsis'] p").text().trim();
    const thumbnail =
      $("img.posterImage").attr("src") || $("meta[property='og:image']").attr("content");

    const movieInfo = {};
    $("li.meta-row").each((_, el) => {
      const label = $(el).find(".meta-label").text().trim().replace(":", "");
      const value = $(el).find(".meta-value").text().trim().replace(/\s+/g, " ");
      if (label && value) movieInfo[label] = value;
    });

    return {
      Title: title,
      Length: length,
      Description: description,
      Thumbnail: thumbnail,
      Director: movieInfo["Director"] || "",
      Producer: movieInfo["Producer"] || "",
      Screenwriter: movieInfo["Screenwriter"] || "",
      Distributor: movieInfo["Distributor"] || "",
      Genre: movieInfo["Genre"] || "",
      "Original Language": movieInfo["Original Language"] || "",
      "Release Date (Streaming)": movieInfo["Release Date (Streaming)"] || "",
      Runtime: movieInfo["Runtime"] || "",
      "Aspect Ratio": movieInfo["Aspect Ratio"] || "",
      URL: url,
    };
  } catch (err) {
    console.error(`❌ Failed to scrape: ${url}`);
    return null;
  }
}

// Scrape the listing page and get all movie links
async function scrapeListPage(url) {
  console.log(`Fetching list page: ${url}`);
  try {
    const { data } = await axios.get(url, { headers: HEADERS });
    const $ = cheerio.load(data);

    // Cheerio selector for movie links on the page
    const movieLinks = [];
    $("a.js-tile-link").each((_, el) => {
      const href = $(el).attr("href");
      if (href) movieLinks.push(BASE_URL + href);
    });

    // Scrape each movie
    const results = [];
    for (const link of movieLinks) {
      const movieData = await scrapeMoviePage(link);
      if (movieData) results.push(movieData);
      // small delay to prevent blocking
      await new Promise(r => setTimeout(r, 500));
    }

    // Pagination: find next page link
    const nextPage = $("a[data-qa='pagination-next']").attr("href");
    if (nextPage) {
      const nextResults = await scrapeListPage(BASE_URL + nextPage);
      results.push(...nextResults);
    }

    return results;
  } catch (err) {
    console.error("Error scraping list page:", err.message);
    return [];
  }
}

// Main function
(async () => {
  try {
    ensureFolderExists(OUTPUT_FILE);
    const allMovies = await scrapeListPage(START_URL);

    const fields = [
      "Title",
      "Length",
      "Description",
      "Thumbnail",
      "Director",
      "Producer",
      "Screenwriter",
      "Distributor",
      "Genre",
      "Original Language",
      "Release Date (Streaming)",
      "Runtime",
      "Aspect Ratio",
      "URL",
    ];

    const csv = parse(allMovies, { fields });
    fs.writeFileSync(OUTPUT_FILE, csv, "utf-8");
    console.log(`✅ Scraped ${allMovies.length} movies → ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("❌ Error in main scraper:", err.message);
  }
})();
