import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppInitializerService } from './app-initializer.service';
import { AuthModule } from './auth/auth.module';
import { PlacesModule } from './places/places.module';
import { PathsModule } from './paths/paths.module';
import { FriendsModule } from './friends/friends.module';
import { WalksModule } from './walks/walks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RedisModule } from './common/redis.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM configuration for PostgreSQL with PostGIS
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'footpath',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production', // Only for development
      autoLoadEntities: true,
      logging: process.env.NODE_ENV === 'development',
      extra: {
        // Enable PostGIS extension
        postgis: true,
      },
    }),

    // Import all feature modules
    AuthModule,
    PlacesModule,
    PathsModule,
    FriendsModule,
    WalksModule,
    NotificationsModule,
    RecommendationsModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppInitializerService],
})
export class AppModule {}