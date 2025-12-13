import dotenv from 'dotenv';
import path from 'path';

// Load .env file at the very beginning
const envPath = process.env.NODE_ENV === 'production' 
  ? path.resolve(__dirname, '../../.env')
  : path.resolve(__dirname, '../.env');
  
dotenv.config({ path: envPath });
