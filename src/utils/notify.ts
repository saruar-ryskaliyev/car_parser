import notifier from 'node-notifier';
import { Car } from '../types';

export async function sendNotification(newCars: Car[]) {
  const carList = newCars.map(car => `${car.name} - ${car.price}`).join('\n');

  notifier.notify({
    title: 'New Cars Available',
    message: `The following new cars have been found:\n\n${carList}`,
    sound: true,
    wait: true
  });

  return newCars;


}
