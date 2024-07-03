import mongoose, { Schema, Document } from 'mongoose';

export interface ICar extends Document {
  name: string;
  price: string;
  link: string;
  description: string;
  region: string;
  date: string;
  photos: string[];
}

const CarSchema: Schema = new Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  link: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  region: { type: String, required: true },
  date: { type: String, required: true },
  photos: { type: [String], required: true },
});

export const Car = mongoose.model<ICar>('Car', CarSchema);
