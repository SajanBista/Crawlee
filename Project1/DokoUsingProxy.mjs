import { CheerioCrawler, Dataset } from 'crawlee';

const crawler = new CheerioCrawler({
    // Use proxies for better success rates
    useSessionPool: true,
    persistCookiesPerSession: true,
    
    // Proxy configuration
    // proxyConfiguration: new ProxyConfiguration({
    //     proxyUrls: ['http://proxy1:port', 'http://proxy2:port']
    // }),
    
    // Session handling for better resistance to blocking
    sessionPoolOptions: {
        maxPoolSize: 100,
        sessionOptions: {
            maxUsageCount: 50,
        },
    },
    
    // Request configuration
    requestHandler: async ({ request, $, log }) => {
        log.info(`Processing ${request.url}`);
        
        // Your scraping logic here
        const products = [];
        
        $('.product-item').each((i, element) => {
            const product = {
                title: $(element).find('.title').text().trim(),
                price: $(element).find('.price').text().trim(),
                // Add more fields as needed
            };
            
            if (product.title) products.push(product);
        });
        
        await Dataset.pushData({
            url: request.url,
            products: products,
            timestamp: new Date().toISOString()
        });
    },
    
    // Handle failed requests
    failedRequestHandler: async ({ request, log }) => {
        log.error(`Request ${request.url} failed`);
    },
});

await crawler.run(['https://smartdoko.com/category/tv-home-appliances-183']);