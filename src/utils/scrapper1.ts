import puppeteer from 'puppeteer';
import { Car as CarModel, ICar } from '../models/car';
import { Car } from '../types'; // Assuming you have a Car type defined in types.ts

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function scrapePage(url: string): Promise<Car[]> {
  const cars: Car[] = [];
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.setUserAgent(getRandomUserAgent());

  // Disable images, CSS and fonts to speed up loading
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto(url, {
    waitUntil: 'networkidle0',
  });

  await page.waitForSelector('.a-card.js__a-card');

  const carCards = await page.$$eval('.a-card.js__a-card', (cards) => {
    return cards.map((card) => {
      try {
        const carName = card.querySelector('.a-card__title a')?.textContent?.trim() || '';
        const carPrice = card.querySelector('.a-card__price')?.textContent?.trim() || '';
        const carLinkElement = card.querySelector('.a-card__link');
        const carLink = carLinkElement ? (carLinkElement as HTMLAnchorElement).href : '';
        const carDescription = card.querySelector('.a-card__description')?.textContent?.trim() || '';
        const carRegion = card.querySelector('.a-card__param[data-test="region"]')?.textContent?.trim() || '';
        const carDate = card.querySelector('.a-card__param--date')?.textContent?.trim() || '';

        const photoUrls: string[] = [];
        card.querySelectorAll('.thumb-gallery__pic img').forEach((img) => {
          const photoUrl = (img as HTMLImageElement).src;
          if (photoUrl) {
            photoUrls.push(photoUrl);
          }
        });

        if (carName && carPrice && carLink && carDescription && carRegion && carDate) {
          return {
            name: carName,
            price: carPrice,
            link: carLink,
            description: carDescription,
            region: carRegion,
            date: carDate,
            photos: photoUrls,
          };
        } else {
          console.log('Missing required fields:', { carName, carPrice, carLink, carDescription, carRegion, carDate });
        }
      } catch (error) {
        console.error('Error extracting car data:', error);
      }
      return null; // Return null if any required field is missing
    }).filter(car => car !== null); // Filter out any null entries
  });

  cars.push(...carCards as Car[]); // Type assertion to avoid TypeScript error
  await browser.close();

  return cars;
}

export async function scrapeSiteWithPuppeteer(): Promise<Car[]> {
  const baseUrl = 'https://kolesa.kz/cars/';
  const pageUrls = [baseUrl]; // Add more URLs if pagination is required
  const allCars: Car[] = [];

  // Scrape pages in parallel
  const scrapePromises = pageUrls.map(url => scrapePage(url));
  const results = await Promise.all(scrapePromises);

  results.forEach(cars => allCars.push(...cars));

  const newCars: ICar[] = [];
  for (const carData of allCars) {
    try {
      const existingCar = await CarModel.findOne({ link: carData.link });
      console.log(existingCar)
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
