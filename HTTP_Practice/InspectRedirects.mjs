//Fetch Google's homepage using plain HTTP and observe redirects.

/* the best way to use it is in command line:

first command for it is :
 curl -I http://google.com //-I flag asks cURL to fetch only the headers

 now again for redirect manually

 curl -I http://www.googole.com
 */

 import { CheerioCrawler, Dataset, KeyValueStore } from 'crawlee';
 import axios from 'axios';
 import fs from 'fs';

 const startUrls=['https://google.com'];
 
 const crawler = new CheerioCrawler({
    async requestHandler({$, request, log}){
        log.info(`Starting request: ${request.url}`);

        try{
            const response = await axios.get(request.url,{
                maxRedirect: 0,
                validateStatus: null,

            });
            // checking 300 above to less than 400 error
            if(response.status >=300&& response.status <= 400){
                const redirectUrl = response.headers.location;
                log.info(`Redirect detected! Statius code: ${response.status}`);
                log.info(`Location header : ${redirectUrl}`);
                
                //follow the redirected link manually
                const finalResponse = await axios.get(redirectUrl);
                const finalContent = finalResponse.data;

                //save final content
                await Dataset.pushData({
                    originalUrls: request.url,
                    finalUrls: redirectUrl,
                    status: finalResponse.status,
                    preview: finalContent.substring(0,200),
                });

                log.info(`manually followed redirect to: ${redirectUrl} `);
                log.info(`saved preview of content`);
            }else{
                const content = response.data;
                await Dataset.pushData({
                    originalUrl: request.url,
                    finalUrl: request.url,
                    status: response.status,
                    preview: content.substring(0, 200),
            });
            log.info(`No redirect. Saved preview of content`);
        }
        

    }catch (error) {
            log.error(`Error fetching ${request.url}: ${error.message}`);
        }
    },

 });

 await crawler.run(startUrls);


const dataset = await Dataset.open();
const {items} = await dataset.getData();

fs.writeFileSync('./ inspectRedirect.json', JSON.stringify(items, null, 2));


