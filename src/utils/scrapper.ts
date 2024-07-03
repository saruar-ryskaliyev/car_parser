import axios from 'axios';
import cheerio from 'cheerio';
import { Car as CarModel, ICar } from '../models/car';
import { Car } from '../types'; // Assuming you have a Car type defined in types.ts

async function scrapePage(url: string): Promise<Car[]> {
  const cars: Car[] = [];
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
      },
    });

    const $ = cheerio.load(data);

    $('.a-card.js__a-card').each((index, element) => {
      try {
        const carName = $(element).find('.a-card__title a').text().trim() || '';
        const carPrice = $(element).find('.a-card__price').text().trim() || '';
        const carLinkElement = $(element).find('.a-card__link');
        const carLink = carLinkElement ? carLinkElement.attr('href') : '';
        const carDescription = $(element).find('.a-card__description').text().trim() || '';
        const carRegion = $(element).find('.a-card__param[data-test="region"]').text().trim() || '';
        const carDate = $(element).find('.a-card__param--date').text().trim() || '';

        const photoUrls: string[] = [];
        $(element).find('.thumb-gallery__pic img').each((i, img) => {
          const photoUrl = $(img).attr('src');
          if (photoUrl) {
            photoUrls.push(photoUrl);
          }
        });

        if (carName && carPrice && carLink && carDescription && carRegion && carDate) {
          cars.push({
            name: carName,
            price: carPrice,
            link: carLink,
            description: carDescription,
            region: carRegion,
            date: carDate,
            photos: photoUrls,
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

export async function scrapeSiteWithCheerio(): Promise<Car[]> {
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

function getRandomUserAgent() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}