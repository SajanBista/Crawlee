/*
Order Link : https://www.fiverr.com/orders/FO521C3DF9505/activities
Client Name : ryanjigo800 
Website : https://secure.dor.wa.gov/gteunauth/_/#42
Author : Sugham Kharel
*/

/*
  Script requirement: `input.csv` in the current directory
  To search using field "Business name" and "UBI #"
 */

import {PlaywrightCrawler, ProxyConfiguration, playwrightUtils} from "crawlee";
import pkg from "csv-tools";
const { toJSON, fromJSON } = pkg;
import csv from 'csv-parser';
import * as fs from "fs";
import dotenv from "dotenv";
dotenv.config({path: '../env.config'});

import { Pipeline, Proxy, Cache } from "node_crawler_backend";

export const PROJECT_NAME = "ryanjigo800_dor";

const rotating_proxy = process.env.ROTATING_PROXY_URL;

(async () => {
  const pipeline = new Pipeline(PROJECT_NAME);
  await pipeline.initializePipeline();

  const cacheLoader = new Cache(PROJECT_NAME);

  const startUrls = [];

  startUrls.push({
    url: "https://secure.dor.wa.gov/gteunauth/_/#42",
    label: "START",
    userData: {},
  });

  let proxyList = [rotating_proxy]

  console.log("Total Proxies loaded", proxyList.length);

  const crawler = new PlaywrightCrawler({
    proxyConfiguration: new ProxyConfiguration({ proxyUrls: proxyList }),
    minConcurrency: 1,
    maxConcurrency: 2,
    maxRequestRetries: 3,

    requestHandlerTimeoutSecs: 10000, // we scrape from the same page continiously by searching items
    preNavigationHooks: [
      async (crawlingContext, gotoOptions) => {
        const { page } = crawlingContext;

        await playwrightUtils.blockRequests(page, {
          extraUrlPatterns: ["adsbygoogle.js"],
        });
      },
    ],

    launchContext: {
      launchOptions: {
        headless: false,
      },
    },
    browserPoolOptions: {
      useFingerprints: true, // true by default
      // retireBrowserAfterPageCount: 1,
      // maxOpenPagesPerBrowser: 1,
    },
  });

  async function loadInputFromCsv() {
    const inputCsvFile = "input.csv";
    const input = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(inputCsvFile)
        .pipe(csv())
        .on('data', (data) => input.push(data))
        .on('end', () => {
          console.log(input[0]);
          console.log("Total data loaded:", input.length);
          resolve(input);
        })
        .on('error', (err) => reject(err));
    });
  }

  const input = await loadInputFromCsv();

  crawler.router.addHandler("START", async ({
    crawler,
    browserController,
    parseWithCheerio,
    request,
    page,
    enqueueLinks,
    log,
  }) => {

  await page.locator('span#Dg-1-1_c').click({ timeout: 10000 });
  await page.waitForTimeout(10000);

  for (const data of input) {
    const business = data["Business name"];

    try {
      await page.locator('input[name="Dc-r"]').fill(business);
      await page.locator('input[name="Dc-s"]').fill(data["UBI #"]);
      await page.locator('input[name="Dc-w"]').fill(data["City"]);

      await page.locator('span.ButtonCaptionText').click();

      const hasResults = await page
        .waitForSelector('td.TDC.TC-Dc-n1 a', { timeout: 10000 })
        .catch(() => false);
      if (!hasResults) continue;

      const item = page.locator('td.TDC.TC-Dc-n1 a');

      // the website is buggy so retry clicking
      for (let i = 0; i < 5; i++) {
        try {
          await item.first().click();
          await page.waitForSelector("span#caption2_Dc-b", { timeout: 10000 });
          break;
        } catch {
          console.warn("Couldn't open company page, retrying...");
        }
      }

      const ownersElement = page.locator('td[headers="Dc-y1-CH"]');
      const owners = await ownersElement.allTextContents();

      owners.forEach((owner, index) => {
        data[`Owner ${index + 1}`] = owner.trim();
      });

      console.log(data);
      await pipeline.addData(data);

      for (let i = 0; i < 3; i++) {
        try {
          await page.locator('a#ManagerBackNavigation').click();
          await page.waitForSelector('input[name="Dc-r"]', { timeout: 10000 });
          break;
        } catch {
          console.warn("Couldn't go back to listing page, retrying...");
        }
      }

    } catch (err) {
      console.error(`Could not scrape data for ${business}. Error: ${err}`);
    }
  }
});

  await crawler.run(startUrls);

  // save data to csv at the end
  await pipeline.convertToCSV();

  await pipeline.closePipeline();

  await cacheLoader.close_crawler();
})();