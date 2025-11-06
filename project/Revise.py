import os
import re
import json
import pandas as pd

# third party imports
import scrapy

from scrapy.crawler import CrawlerProcess
from scrapy import Selector
from scrapy.utils.project import get_project_settings
import scrapy
from decouple import config

# private modules
from parsedom_crawler.crawler.spiders.base_crawler import ParsedomBaseCrawler

class trackzio__numista(ParsedomBaseCrawler):
    # Your spider definition
    name = "trackzio__numista"  # name of our project. This will enable other features in future

    page = 1
    year = 2025 
    total_records_scraped = 0 
    max_records = 300000
    min_year = 0

    custom_settings = {
        'LOG_LEVEL': 'DEBUG',
        'DUPEFILTER_CLASS' : 'scrapy.dupefilters.BaseDupeFilter',
        'CONCURRENT_REQUESTS':2,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [403, 429],
        # 'FEED_FORMAT': 'json',
        'FEED_EXPORT_ENCODING': 'utf-8', 
        # 'FEED_URI': 'scraped_data/' + 'trackzio__numista/' + datetime.now().strftime('%Y_%m_%d__%H_%M_%S') + 'trackzio__numista.json',
        'DOWNLOADER_MIDDLEWARES': {
            'scrapy.downloadermiddlewares.retry.RetryMiddleware': 140,
            'parsedom_crawler.crawler.middlewares.RandomUserAgents': 81,
            'scrapy.downloadermiddlewares.httpproxy.HttpProxyMiddleware': 110,
        },
    }

    headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=0, i",
    "referer": "https://en.numista.com/catalogue/index.php?r=&st=147&cat=y&im1=&im2=&ru=&ie=&ca=3&no=&v=&a=&dg=&i=&b=&m=&f=&t=&t2=&w=&mt=&u=&g=",
    "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
    "sec-ch-ua-arch": "\"x86\"",
    "sec-ch-ua-bitness": "\"64\"",
    "sec-ch-ua-full-version": "\"135.0.7049.96\"",
    "sec-ch-ua-full-version-list": "\"Google Chrome\";v=\"135.0.7049.96\", \"Not-A.Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"135.0.7049.96\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": "\"\"",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-ch-ua-platform-version": "\"15.0.0\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
}

    if config('APP_ENV', 'DEV').upper() == 'PRD':
        custom_settings['LOG_FILE'] = f'logs/{name}.log'

    def clean_whitespace(self, text):
        return re.sub(r'\s+', ' ', text).strip()

    def start_requests(self):
        # for i in range(214812, 214819):
        # urls = ["https://en.numista.com/catalogue/note202331.html"]
        # for url in urls:
        #     # url = f"https://en.numista.com/catalogue/note{i}.html"
        #     yield scrapy.Request(
        #         url=url,
        #         callback=self.details,
        #         headers=self.headers,
        #         meta={
        #             "proxy":config('PREMIUM_PROXY'),
        #         }
        #     )
        # for i in range(1,4787):
        #     url = f'https://en.numista.com/catalogue/index.php?r=&st=147&cat=y&im1=&im2=&ru=&ie=&ca=3&no=&v=&a=&dg=&i=&b=&m=&f=&t=&t2=&w=&mt=&u=&g=&p={i}'
        #     yield scrapy.Request(
        #         url,
        #         callback=self.parse,
        #         headers=self.headers,
        #         meta={
        #             "proxy":config("PREMIUM_PROXY")
        #         }
        #     )
        # df = pd.read_csv('locationfilters.csv')
        # for id in df['id']:
        #     yield scrapy.Request(
        #         url=f"https://en.numista.com/catalogue/index.php?e={id}&r=&st=147&cat=y&im1=&im2=&ru=&ie=&ca=3&no=&v=&a=2025&dg=&i=&b=&m=&f=&t=&t2=&w=&mt=&u=&g=&p=1",
        #         callback=self.parse,
        #         headers=self.headers,
        #         meta={
        #             "proxy":config('PREMIUM_PROXY'),
        #             'id' : id,
        #             'year' : 2025,
        #             'page' : 1
        #         }
        #     )

        count = 470000
        for id in range(50080,count):
            url = f"https://en.numista.com/catalogue/pieces{id}.html"
            if self.cache_handler.check_cache(url):
                self.logger.info(f"URL: {url} already scraped")
                continue

            yield scrapy.Request(
                url=url,
                callback=self.details,
                meta={
                    "proxy":config('PREMIUM_PROXY')
                }
            )

# parse is not used in this version

    def parse(self, response):
        year = response.meta['year']
        page = response.meta['page']

        urls = response.css('.description_piece strong a::attr(href)').getall()  
        
        for url in urls:
            if self.total_records_scraped >= self.max_records:
                self.logger.info("Scraping limit reached. Stopping process.")
                return
            if self.cache_handler.check_cache(f"https://en.numista.com{url}"):
                self.logger.info(f"URL: https://en.numista.com{url} already scraped")
                continue
            yield scrapy.Request(
                url=f"https://en.numista.com{url}",
                callback=self.details,
                meta={
                    "proxy":config('PREMIUM_PROXY')
                }
            )

        
        id = response.meta['id']
        if len(response.css("a[rel='next']")) > 0:
            page += 1
            yield scrapy.Request(
                url=f"https://en.numista.com/catalogue/index.php?e={id}&r=&st=147&cat=y&im1=&im2=&ru=&ie=&ca=3&no=&v=&a={year}&dg=&i=&b=&m=&f=&t=&t2=&w=&mt=&u=&g=&p={self.page}",
                callback=self.parse,
                headers=self.headers,
                meta={
                    'year' : year,
                    'page' : page,
                    'id' : id,
                    "proxy":config('PREMIUM_PROXY')
                }
            )
        else:
            if year > 0:
                year -= 1
                page = 1
                print("Year changed to ",year)
                yield scrapy.Request(
                    url=f"https://en.numista.com/catalogue/index.php?e={id}&r=&st=147&cat=y&im1=&im2=&ru=&ie=&ca=3&no=&v=&a={year}&dg=&i=&b=&m=&f=&t=&t2=&w=&mt=&u=&g=&p={page}",
                    callback=self.parse,
                    headers=self.headers,
                    meta={
                        'year' : year,
                        'page' : page,
                        'id' : id,
                        "proxy":config('PREMIUM_PROXY'),
                    }
                )
        
        

    def details(self,response):
        # if self.total_records_scraped >= self.max_records:
        #     return  
        result = {"URL":response.url}
        obverse_text = response.xpath('//h3[font/font[contains(text(), "Obverse")] or contains(text(), "Obverse")]/following-sibling::p//text()').getall()
        reverse_text = response.xpath('//h3[font/font[contains(text(), "Reverse")] or contains(text(), "Reverse")]/following-sibling::p//text()').getall()
        # breakpoint()
        obverse_text_combined = ' '.join(obverse_text)
        reverse_text_combined = ' '.join(reverse_text)

        # Remove reverse text from obverse text
        obverse_text_without_reverse = obverse_text_combined.replace(reverse_text_combined, '').strip()
        result["Obverse"] = self.clean_whitespace(obverse_text_without_reverse)
        result["Reverse"] = self.clean_whitespace(reverse_text_combined)
        

        rows = response.css("#fiche_caracteristiques tr")
        for row in rows:
            title = row.css("th::text").get('').strip()
            value = " ".join([x.strip() for x in row.xpath("td//text()").getall()]).strip()
            result[title] = self.clean_whitespace(value)

        result["Note name"] = self.clean_whitespace(response.css("#main_title h1::text").get('').strip())
        result["Image urls"] = response.css('#fiche_photo img::attr(src)').getall()
        
        description = response.css('#fiche_descriptions').get('')
        description_headers = response.css('#fiche_descriptions h3::text').getall()
        for index,header in enumerate(description_headers):
            if "See also" in header:
                continue
            if index == len(description_headers)-1:
                body = description.split("<h3>"+header+"</h3>")[1]
            else:
                body = description.split("<h3>"+description_headers[index]+"</h3>")[1].split("<h3>"+description_headers[index+1]+"</h3>")[0]

            body = re.sub(r'<script.*?>.*?</script>', '', body, flags=re.DOTALL | re.IGNORECASE)    
            body_slector = Selector(text=body)
            result[header] = {}
            if "<strong>" in body:
                result[header]["Details"] = self.clean_whitespace(" ".join([x.strip() for x in body_slector.xpath(".//p[not(*)]//text()").getall()]).strip())
                body_headers = body_slector.css('strong::text').getall()
                for body_header in body_headers:
                    sanitized_body_header = body_header.replace('"', '').strip()
                    try:
                        body_para = " ".join([
                            x.strip() for x in body_slector.xpath(
                                f'.//strong[contains(text(),"{sanitized_body_header}")]/ancestor::p[1]//text()'
                            ).getall()
                        ])
                    except ValueError as e:
                        # Handle the XPath error gracefully
                        print(f"Error in XPath expression: {e}")
                        body_para = ""
                    # body_para = " ".join([x.strip() for x in body_slector.xpath(f'.//strong[contains(text(),"{body_header}")]/ancestor::p[1]//text()').getall()])
                    # result[header][body_header] = self.clean_whitespace(body_para.replace(body_header,'').strip())
            else:
                body_para = " ".join([x.strip() for x in body_slector.xpath('.//text()').getall()])
                result[header] = self.clean_whitespace(body_para.strip())

        collection_table = response.css('.collection tbody')
        headings = response.css('.collection')[0].xpath('.//tr/th').xpath('normalize-space()').getall()
        result['Collection'] = []
        for row in collection_table:
            values = [' '.join(td.xpath('.//text()').getall()).strip() for td in row.xpath('.//td[not(@colspan)]')] 
            if not values or 'Undetermined' in values:
                continue
            data = {}
            for i in range(min(len(headings), len(values))):
                if headings[i]:
                    data[headings[i]] = self.clean_whitespace(values[i])

            comments = row.xpath('.//td[@class="comment"]//text()').get(default='').strip()
            if comments:
                data['Comments'] = self.clean_whitespace(comments)

            frequency = row.xpath('.//td[@class="own_stat"]/span/text()').get(default='').strip()
            if frequency:
                data['Frequency'] = self.clean_whitespace(frequency)

            if data:
                result['Collection'].append(data)
        result['Numista Rarity index'] = self.clean_whitespace(response.xpath("//div[contains(text(),'Numista Rarity index')]/strong[1]/text()").get('').strip())


        filename = f"scraped_data/trackzio__numista/{response.url.split('/')[-1].split('.')[0]}.json"
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=4)
        
        self.cache_handler.update_cache(response.url)
        # self.total_records_scraped += 1


settings_file_path = 'parsedom_crawler.crawler.settings'
os.environ.setdefault('SCRAPY_SETTINGS_MODULE', settings_file_path)
settings = get_project_settings()

filename = trackzio__numista.custom_settings.get('FEED_URI')
process = CrawlerProcess(settings)
process.crawl(trackzio__numista)
process.start()