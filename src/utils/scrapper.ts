import axios from 'axios';
import cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Car as CarModel, ICar } from '../models/car';
import { Car } from '../types'; // Assuming you have a Car type defined in types.ts

const PROXIES = [
  'http://saruarryskaliev:B6IDCILVBL@45.151.98.230:51523',
  'http://saruarryskaliev:B6IDCILVBL@94.137.91.141:51523',
  'http://saruarryskaliev:B6IDCILVBL@149.126.221.240:51523',
  'http://saruarryskaliev:B6IDCILVBL@149.126.218.133:51523',
  'http://saruarryskaliev:B6IDCILVBL@45.134.12.50:51523',
  'http://saruarryskaliev:B6IDCILVBL@94.137.79.104:51523',
  'http://saruarryskaliev:B6IDCILVBL@149.126.223.38:51523',
  'http://saruarryskaliev:B6IDCILVBL@149.126.220.44:51523',
  'http://saruarryskaliev:B6IDCILVBL@46.3.132.51:51523',
  'http://saruarryskaliev:B6IDCILVBL@194.110.14.62:51523',
  'http://saruarryskaliev:B6IDCILVBL@212.8.229.226:51523',
  'http://saruarryskaliev:B6IDCILVBL@149.126.216.164:51523',
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  // Add more user agents as needed
];

const getRandomProxy = () => PROXIES[Math.floor(Math.random() * PROXIES.length)];
const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

function getHeaders() {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testProxies() {
  for (const proxy of PROXIES) {
    try {
      const agent = new HttpsProxyAgent(proxy);
      const { data } = await axios.get('https://httpbin.org/ip', {
        httpsAgent: agent,
        headers: getHeaders(),
        timeout: 10000, // 10 seconds timeout
      });
      console.log(`Proxy ${proxy} is working:`, data);
    } catch (error) {
      console.error(`Proxy ${proxy} failed:`, error);
    }
  }
}

async function scrapePage(url: string): Promise<Car[]> {
  const cars: Car[] = [];
  try {
    const proxyUrl = getRandomProxy();
    const agent = new HttpsProxyAgent(proxyUrl);

    console.log(`Fetching page: ${url} with proxy: ${proxyUrl}`);

    const { data } = await axios.get(url, {
      httpsAgent: agent,
      headers: getHeaders(),
      timeout: 10000, // 10 seconds timeout
    });

    const $ = cheerio.load(data);

    $('.a-card.js__a-card').each((index, element) => {
      try {
        const isFromDealer = $(element).find('.a-labels__item--dealer').length > 0;
        if (isFromDealer) return;

        const carName = $(element).find('.a-card__title a').text().trim() || '';
        const carPrice = $(element).find('.a-card__price').text().trim() || '';
        const carLinkElement = $(element).find('.a-card__link');
        const carLink = carLinkElement ? 'https://kolesa.kz' + carLinkElement.attr('href') : '';
        const carDescription = $(element).find('.a-card__description').text().trim() || '';
        const carRegion = $(element).find('.a-card__param[data-test="region"]').text().trim() || '';
        const carDate = $(element).find('.a-card__param--date').text().trim() || '';

        if (carName && carPrice && carLink && carDescription && carRegion && carDate) {
          cars.push({
            name: carName,
            price: carPrice,
            link: carLink,
            description: carDescription,
            region: carRegion,
            date: carDate,
            photos: [],
            sellerComments: '',
            generation: '',
            bodyType: '',
            engineVolume: '',
            mileage: '',
            transmission: '',
            driveType: '',
            steeringWheel: '',
            color: '',
            customsCleared: ''
          });
        } else {
          console.log('Missing required fields:', { carName, carPrice, carLink, carDescription, carRegion, carDate });
        }
      } catch (error) {
        console.error('Error extracting car data:', error);
      }
    });
  } catch (error) {
    console.error(`Error fetching page: ${url}`, error);
  }

  return cars;
}

async function scrapeCarDetails(url: string): Promise<Partial<Car>> {
  const details: Partial<Car> = {};
  try {
    const proxyUrl = getRandomProxy();
    const agent = new HttpsProxyAgent(proxyUrl);

    console.log(`Fetching car details: ${url} with proxy: ${proxyUrl}`);

    const { data } = await axios.get(url, {
      httpsAgent: agent,
      headers: getHeaders(),
      timeout: 10000, // 10 seconds timeout
    });

    const $ = cheerio.load(data);

    const carDescription = $('.offer__description').text().trim() || '';
    const carPhotos: string[] = [];
    const sellerComments = $('.offer__sidebar-contacts-wrap .offer__description').text().trim() || '';

    $('.gallery__main, .gallery__thumbs-list img').each((index, img) => {
      let thumbUrl = $(img).attr('data-href') || $(img).attr('src');
      if (thumbUrl) {
        thumbUrl = thumbUrl.replace('120x90', '750x470');
        carPhotos.push(thumbUrl);
      }
    });

    details.description = carDescription;
    details.photos = carPhotos;
    details.sellerComments = sellerComments;

    $('.offer__parameters').find('dl').each((index, element) => {
      const title = $(element).find('dt.value-title').text().trim();
      const value = $(element).find('dd.value').text().trim();

      switch (title) {
        case 'Поколение':
          details.generation = value;
          break;
        case 'Кузов':
          details.bodyType = value;
          break;
        case 'Объем двигателя, л':
          details.engineVolume = value;
          break;
        case 'Пробег':
          details.mileage = value;
          break;
        case 'Коробка передач':
          details.transmission = value;
          break;
        case 'Привод':
          details.driveType = value;
          break;
        case 'Руль':
          details.steeringWheel = value;
          break;
        case 'Цвет':
          details.color = value;
          break;
        case 'Растаможен в Казахстане':
          details.customsCleared = value;
          break;
      }
    });

  } catch (error) {
    console.error(`Error fetching car details from: ${url}`, error);
  }

  return details;
}

export async function scrapeSiteWithCheerio(): Promise<Car[]> {
  const baseUrl = 'https://kolesa.kz/cars/';
  const pageUrls = [baseUrl]; // Add more URLs if pagination is required
  const allCars: Car[] = [];

  for (const url of pageUrls) {
    const cars = await scrapePage(url);
    for (const car of cars) {
      await delay(Math.floor(Math.random() * 2000) + 1000); // Random delay between 1-3 seconds
      const carDetails = await scrapeCarDetails(car.link);
      if (carDetails.photos && carDetails.photos.length > 0) {
        Object.assign(car, carDetails);
        allCars.push(car);
      }
    }
  }

  const newCars: ICar[] = [];
  for (const carData of allCars) {
    try {
      const existingCar = await CarModel.findOne({ link: carData.link });
      if (!existingCar) {
        const newCar = new CarModel(carData);
        newCars.push(newCar);
        await newCar.save();
      }
    } catch (error) {
      console.error(`Error saving car ${carData.name}:`, error);
    }
  }

  return allCars;
}

// Test the proxies before starting the scraping
testProxies().then(() => {
  scrapeSiteWithCheerio().then(cars => {
    console.log('Scraping completed. Total cars:', cars.length);
  }).catch(error => {
    console.error('Error in scraping site:', error);
  });
});
