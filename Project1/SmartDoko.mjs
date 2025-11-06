import { CheerioCrawler, Dataset, KeyValueStore } from 'crawlee';
import { Actor } from 'apify';

class SmartDokoScraper {
    constructor() {
        this.crawler = new CheerioCrawler({
            // Configuration
            maxRequestsPerCrawl: 1000,
            maxConcurrency: 10,
            requestHandlerTimeoutSecs: 30,
            
            // Autoscaled pool configuration
            autoscaledPoolOptions: {
                maxConcurrency: 10,
                minConcurrency: 1,
            },
            
            // Request processing
            async requestHandler({ request, $, log, sendRequest }) {
                const url = request.url;
                
                // Check if it's a category page or product page
                if (url.includes('/category/')) {
                    await this.handleCategoryPage({ request, $, log });
                } else if (this.isProductUrl(url)) {
                    await this.handleProductPage({ request, $, log, sendRequest });
                }
            },
            
            // Error handling
            failedRequestHandler({ request, log }) {
                log.error(`Request failed: ${request.url}`);
            },
        });
    }
    
    isProductUrl(url) {
        return url.includes('/product/') || url.includes('/item/') || url.includes('/p/');
    }
    
    async handleCategoryPage({ request, $, log }) {
        log.info(`Processing category page: ${request.url}`);
        
        // Extract product links
        const productLinks = [];
        $('a[href*="/product/"], a[href*="/item/"], a[href*="/p/"]').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullUrl = new URL(href, request.loadedUrl).href;
                productLinks.push(fullUrl);
            }
        });
        
        // Remove duplicates
        const uniqueLinks = [...new Set(productLinks)];
        log.info(`Found ${uniqueLinks.length} product links`);
        
        // Add product URLs to queue
        await this.crawler.addRequests(uniqueLinks);
        
        // Handle pagination
        const nextPageUrl = this.extractNextPageUrl($, request.loadedUrl);
        if (nextPageUrl) {
            await this.crawler.addRequests([nextPageUrl]);
        }
        
        // Save category info
        const categoryInfo = {
            url: request.url,
            title: $('h1, .page-title, .category-title').first().text().trim(),
            productCount: uniqueLinks.length,
            scrapedAt: new Date().toISOString()
        };
        
        await Dataset.pushData(categoryInfo);
    }
    
    async handleProductPage({ request, $, log, sendRequest }) {
        log.info(`Processing product page: ${request.url}`);
        
        const productData = {
            url: request.url,
            title: this.extractText($, 'h1, .product-title, .title'),
            price: this.extractText($, '.price, .product-price, [class*="price"]'),
            originalPrice: this.extractText($, '.original-price, .old-price, [class*="original"]'),
            discount: this.extractText($, '.discount, .sale, [class*="discount"]'),
            rating: this.extractText($, '.rating, .stars, [class*="rating"]'),
            reviewCount: this.extractText($, '.review-count, .reviews, [class*="review"]'),
            availability: this.extractText($, '.stock, .availability, [class*="stock"]'),
            description: this.extractText($, '.description, .product-description, [class*="description"]'),
            specifications: this.extractSpecifications($),
            images: this.extractImages($),
            category: 'TV & Home Appliances',
            scrapedAt: new Date().toISOString()
        };
        
        // Clean the data
        this.cleanProductData(productData);
        
        // Save to dataset
        await Dataset.pushData(productData);
        
        log.info(`Saved product: ${productData.title}`);
    }
    
    extractText($, selector) {
        return $(selector).first().text().trim().replace(/\s+/g, ' ');
    }
    
    extractSpecifications($) {
        const specs = {};
        
        // Try different common specification structures
        $('table tr, .specification li, .feature li').each((i, element) => {
            const $row = $(element);
            const key = $row.find('td:first-child, th:first-child, .key, .label').text().trim();
            const value = $row.find('td:last-child, .value').text().trim();
            
            if (key && value) {
                specs[key.replace(/[:：]/g, '')] = value;
            }
        });
        
        return specs;
    }
    
    extractImages($) {
        const images = [];
        
        $('img[src*="product"], .product-image img, .gallery img').each((i, element) => {
            const src = $(element).attr('src');
            const alt = $(element).attr('alt');
            
            if (src && !src.includes('logo') && !src.includes('icon')) {
                images.push({
                    url: src,
                    alt: alt || ''
                });
            }
        });
        
        return images;
    }
    
    extractNextPageUrl($, baseUrl) {
        const nextLink = $('a.next, a[rel="next"], .pagination a:contains("Next")').attr('href');
        return nextLink ? new URL(nextLink, baseUrl).href : null;
    }
    
    cleanProductData(product) {
        Object.keys(product).forEach(key => {
            if (typeof product[key] === 'string') {
                product[key] = product[key].replace(/\s+/g, ' ').trim();
            }
        });
    }
    
    async run() {
        const startUrls = [
            'https://smartdoko.com/category/tv-home-appliances-183'
        ];
        
        await this.crawler.run(startUrls);
        
        // Export results
        const dataset = await Dataset.open();
        await dataset.exportToJSON('products');
        await dataset.exportToCSV('products');
        
        console.log('Scraping completed!');
    }
}

// Run the scraper
const scraper = new SmartDokoScraper();
await scraper.run();