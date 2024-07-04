import mongoose, { Schema, Document } from 'mongoose';

export interface ICar extends Document {
  name: string;
  price: string;
  link: string;
  description: string;
  region: string;
  date: string;
  photos: string[];
  generation: string;
  bodyType: string;
  engineVolume: string;
  mileage: string;
  transmission: string;
  driveType: string;
  steeringWheel: string;
  color: string;
  customsCleared: string;
}

const CarSchema: Schema = new Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  link: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  region: { type: String, required: true },
  date: { type: String, required: true },
  photos: { type: [String], required: true },
  generation: { type: String, required: false },
  bodyType: { type: String, required: false },
  engineVolume: { type: String, required: false },
  mileage: { type: String, required: false },
  transmission: { type: String, required: false },
  driveType: { type: String, required: false },
  steeringWheel: { type: String, required: false },
  color: { type: String, required: false },
  customsCleared: { type: String, required: false }
});

export const Car = mongoose.model<ICar>('Car', CarSchema);
