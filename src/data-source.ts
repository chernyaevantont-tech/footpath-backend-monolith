import { DataSource } from 'typeorm';
import { join } from 'path';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'footpath',
  entities: [join(__dirname, './**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, './migrations/**/*{.ts,.js}')],
  synchronize: process.env.NODE_ENV !== 'production', // Only for development
  logging: process.env.NODE_ENV === 'development',
  extra: {
    // Enable PostGIS extension
    postgis: true,
  },
});