/*
Order Link : https://www.fiverr.com/orders/FO835CA0C0B08/activities
Client Name : virtucircle
Website : http://daynurseries.co.uk/groups
Author : Raksha Karn
*/

import {
  PlaywrightCrawler,
  ProxyConfiguration,
  playwrightUtils,
} from "crawlee";

import * as fs from "fs";
import { Pipeline, Cache } from "node_crawler_backend";

export const BASE_URL = "http://daynurseries.co.uk/groups";
export const PROJECT_NAME = "daynurseries_groups";

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

let groupsData = [];
let currentGroupIndex = 0;
let totalNurseriesScraped = 0;

(async () => {
  const groupPipeline = new Pipeline(PROJECT_NAME + "_groups");
  const nurseryPipeline = new Pipeline(PROJECT_NAME + "_nurseries");

  await groupPipeline.initializePipeline();
  await nurseryPipeline.initializePipeline();

  const groupCache = new Cache(PROJECT_NAME + "_groups");
  const nurseryCache = new Cache(PROJECT_NAME + "_nurseries");

  const startUrls = [{ url: BASE_URL, label: "START", userData: {} }];

  const proxyList = [
    "http://customer-Proxy_4pvyY:Haodw82_aahuu@de-pr.oxylabs.io:30000",
  ];
  console.log("🚀 Starting fresh scrape with proxy count:", proxyList.length);

  const crawler = new PlaywrightCrawler({
    proxyConfiguration: new ProxyConfiguration({ proxyUrls: proxyList }),
    minConcurrency: 1,
    maxConcurrency: 1,
    maxRequestRetries: 5,
    preNavigationHooks: [
      async ({ page, session, log }, gotoOptions) => {
        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
        gotoOptions.userAgent = ua;

        await page.addInitScript(() => {
          Object.defineProperty(navigator, "webdriver", { get: () => false });
        });

        await playwrightUtils.blockRequests(page, {
          extraUrlPatterns: [
            "adsbygoogle.js",
            "google-analytics.com",
            "gtag/js",
          ],
        });

        log.info(`Using User-Agent: ${ua}`);
      },
    ],
    launchContext: { launchOptions: { headless: true } },
  });

  crawler.router.addHandler(
    "START",
    async ({ request, page, parseWithCheerio, log, crawler }) => {
      try {
        log.info("STEP 1: Collecting all nursery groups...");

        await page.waitForSelector(
          "ul.groups-list-listings.groups-list-main li",
          { timeout: 100000 },
        );
        const $ = await parseWithCheerio();

        const groupElements = $(
          "ul.groups-list-listings.groups-list-main li",
        ).toArray();
        log.info(`Found ${groupElements.length} total groups`);

        for (const el of groupElements) {
          try {
            const url = $(el).find("> a").attr("href")?.trim() || "";
            const fullUrl = url ? new URL(url, request.url).href : "";
            const name = $(el).find("h3").text().trim() || "";
            if (!fullUrl || !name) continue;

            const isCached = await groupCache.checkCache(fullUrl);
            if (isCached) {
              log.info(`Already scraped group: ${name}`);
              continue;
            }
            const rating = $(el).find("div.review-score").text().trim() || "";

            const smallText = $(el).find("div > small").text().trim() || "";
            let number_of_nurseries = "";
            let provider_type = "";

            if (smallText) {
              const match = smallText.match(
                /^(\d+)\s+Nurseries\s*\(([^)]+)\)/i,
              );
              if (match) {
                number_of_nurseries = match[1] || "";
                provider_type = match[2] || "";
              }
            }

            if (fullUrl && name) {
              const groupData = {
                URL: fullUrl,
                group_name: name,
                rating,
                number_of_nurseries: parseInt(number_of_nurseries || "0", 10),
                provider_type,
                nurseries_scraped: 0,
              };

              groupsData.push(groupData);

              await groupPipeline.addData({
                URL: fullUrl,
                group_name: name,
                rating,
                number_of_nurseries: number_of_nurseries,
                provider_type,
              });
              await groupCache.addCache(fullUrl);

              log.info(
                `Collected group: ${name} (Expected: ${number_of_nurseries} nurseries)`,
              );
            }
          } catch (err) {
            log.error(`Error collecting group: ${err.message}`);
          }
        }

        log.info(`STEP 1 COMPLETE: Collected ${groupsData.length} groups`);
        log.info("STEP 2: Starting sequential nursery scraping...");

        if (groupsData.length > 0) {
          const firstGroup = groupsData[0];
          await crawler.addRequests([
            {
              url: firstGroup.URL,
              label: "PROCESS_GROUP_SEQUENTIALLY",
              userData: {
                groupIndex: 0,
                group_name: firstGroup.group_name,
                provider_type: firstGroup.provider_type,
                expected_count: firstGroup.number_of_nurseries,
                pageNumber: 1,
                nurseriesScrapedForThisGroup: 0,
              },
            },
          ]);
        }
      } catch (err) {
        log.error(`Error in START handler: ${err.message}`);
      }
    },
  );

  crawler.router.addHandler(
    "PROCESS_GROUP_SEQUENTIALLY",
    async ({ request, page, parseWithCheerio, log, crawler }) => {
      try {
        const {
          groupIndex,
          group_name,
          expected_count,
          pageNumber,
          nurseriesScrapedForThisGroup,
        } = request.userData;

        log.info(
          `Processing Group ${groupIndex + 1}/${groupsData.length}: ${group_name}`,
        );
        log.info(
          `Page ${pageNumber} | Expected total: ${expected_count} | Scraped so far: ${nurseriesScrapedForThisGroup}`,
        );

        await page.waitForSelector("div.sr", { timeout: 60000 });
        await page.waitForTimeout(2000);

        const $ = await parseWithCheerio();
        const nurseryElements = $("div.sr").toArray();
        log.info(
          `Found ${nurseryElements.length} nurseries on page ${pageNumber}`,
        );

        let scrapedThisPage = 0;

        for (const el of nurseryElements) {
          try {
            const nurseryUrl =
              $(el).find("header div > a").attr("href")?.trim() || "";
            const fullNurseryUrl = nurseryUrl
              ? new URL(nurseryUrl, request.url).href
              : "";
            if (!nurseryUrl) continue;

            const isCached = await nurseryCache.checkCache(fullNurseryUrl);
            if (isCached) {
              log.info(
                `Already scraped nursery: ${$(el).find("header div > a").text().trim()}`,
              );
              continue;
            }
            const nurseryName =
              $(el).find("header div > a").text().trim() || "";
            const fullAddress =
              $(el).find("header div > p").text().trim() || "";

            if (!nurseryName) continue;

            let address = fullAddress;
            let postcode = "";
            if (fullAddress) {
              const parts = fullAddress.trim().split(/\s+/);
              if (parts.length >= 2) {
                postcode = parts.slice(-2).join(" ");
                address = parts.slice(0, -2).join(" ");
              }
            }

            const capacityText =
              $(el).find("li.sr-rooms strong").text().trim() || "";
            const capacityMatch = capacityText.match(/\d+/);
            const capacity = capacityMatch ? capacityMatch[0] : "";

            const nurseryType =
              $(el).find("ul.sr-extras li").eq(1).text().trim() || "";
            const reviewScore =
              $(el)
                .find("a[data-gtm-button-type='Review Rating'] > span")
                .text()
                .trim() || "";
            const totalReviewsText =
              $(el)
                .find("a[data-gtm-button-type='Review Rating'] > em")
                .text()
                .trim() || "";
            const totalReviews = totalReviewsText.replace(/\D/g, "");

            const nurseryData = {
              URL: fullNurseryUrl,
              group_name: request.userData.group_name,
              provider_type: request.userData.provider_type,
              nursery_name: nurseryName,
              address,
              postcode,
              capacity,
              nursery_type: nurseryType,
              review_score: reviewScore,
              total_reviews: totalReviews,
            };

            await nurseryPipeline.addData(nurseryData);
            await nurseryCache.addCache(fullNurseryUrl);
            scrapedThisPage++;
            totalNurseriesScraped++;

            log.info(`[${scrapedThisPage}] Scraped: ${nurseryName}`);
          } catch (err) {
            log.error(`Error scraping nursery: ${err.message}`);
          }
        }

        const totalScrapedForGroup =
          nurseriesScrapedForThisGroup + scrapedThisPage;
        log.info(
          `Page ${pageNumber} complete: ${scrapedThisPage} nurseries scraped`,
        );
        log.info(
          `Group progress: ${totalScrapedForGroup}/${expected_count} nurseries`,
        );

        await page.waitForTimeout(1500);

        const nextBtn = await page.$("li.pagination-end a[aria-label*='next']");
        const hasNextPage =
          nextBtn &&
          !(await nextBtn.evaluate(
            (el) =>
              el.classList.contains("disabled") ||
              el.getAttribute("disabled") !== null,
          ));

        if (hasNextPage) {
          const nextUrl = await nextBtn.getAttribute("href");
          if (nextUrl) {
            const fullNextUrl = new URL(nextUrl, request.url).href;
            log.info(
              `➡️ Moving to page ${pageNumber + 1} for group: ${group_name}`,
            );

            await crawler.addRequests([
              {
                url: fullNextUrl,
                label: "PROCESS_GROUP_SEQUENTIALLY",
                userData: {
                  ...request.userData,
                  pageNumber: pageNumber + 1,
                  nurseriesScrapedForThisGroup: totalScrapedForGroup,
                },
              },
            ]);
            return;
          }
        }

        groupsData[groupIndex].nurseries_scraped = totalScrapedForGroup;

        log.info(`GROUP ${groupIndex + 1} COMPLETE: ${group_name}`);
        log.info(
          `Expected: ${expected_count} | Actually scraped: ${totalScrapedForGroup}`,
        );

        if (totalScrapedForGroup !== expected_count) {
          log.warn(
            `⚠️ MISMATCH: Expected ${expected_count} but scraped ${totalScrapedForGroup}`,
          );
        }

        const nextGroupIndex = groupIndex + 1;
        if (nextGroupIndex < groupsData.length) {
          const nextGroup = groupsData[nextGroupIndex];
          log.info(`Starting next group: ${nextGroup.group_name}`);

          await crawler.addRequests([
            {
              url: nextGroup.URL,
              label: "PROCESS_GROUP_SEQUENTIALLY",
              userData: {
                groupIndex: nextGroupIndex,
                group_name: nextGroup.group_name,
                provider_type: nextGroup.provider_type,
                expected_count: nextGroup.number_of_nurseries,
                pageNumber: 1,
                nurseriesScrapedForThisGroup: 0,
              },
            },
          ]);
        } else {
          log.info("ALL GROUPS COMPLETED!");
          await generateFinalReport(log);
        }
      } catch (err) {
        log.error(
          `Error in PROCESS_GROUP_SEQUENTIALLY handler: ${err.message}`,
        );
      }
    },
  );

  async function generateFinalReport(log) {
    log.info("FINAL SCRAPING REPORT:");
    log.info(`Total Groups: ${groupsData.length}`);
    log.info(`Total Nurseries Scraped: ${totalNurseriesScraped}`);

    let expectedTotal = 0;
    let matchingGroups = 0;
    let mismatchGroups = 0;

    for (const group of groupsData) {
      expectedTotal += group.number_of_nurseries;
      if (group.nurseries_scraped === group.number_of_nurseries) {
        matchingGroups++;
      } else {
        mismatchGroups++;
        log.info(
          `⚠️ ${group.group_name}: Expected ${group.number_of_nurseries}, Got ${group.nurseries_scraped}`,
        );
      }
    }

    log.info(`Expected Total Nurseries: ${expectedTotal}`);
    log.info(`Actual Total Nurseries: ${totalNurseriesScraped}`);
    log.info(`Groups with exact match: ${matchingGroups}`);
    log.info(`Groups with mismatch: ${mismatchGroups}`);

    const accuracy = ((totalNurseriesScraped / expectedTotal) * 100).toFixed(2);
    log.info(`Scraping Accuracy: ${accuracy}%`);
  }

  await crawler.run(startUrls);
  await groupCache.close_crawler();
  await nurseryCache.close_crawler();

  await groupPipeline.convertToCSV();
  await nurseryPipeline.convertToCSV();

  await groupPipeline.closePipeline();
  await nurseryPipeline.closePipeline();

  console.log("Scraping completed!");
})();