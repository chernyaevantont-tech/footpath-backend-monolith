import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new Logger(), // Custom Winston-based logger
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Enable CORS
  app.enableCors();

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('FootPath API')
    .setDescription(`
# FootPath Monolith API Documentation

## Overview
FootPath is a monolithic application for creating personalized walking routes. The API provides functionality for authentication, place management, friend relationships, walk planning, notifications, and recommendations.

## Authentication
Most endpoints require a JWT token in the Authorization header: \`Authorization: Bearer <token>\`

## API Categories
- **Authentication** (\`/auth\`): User registration, login, profile management
- **Places** (\`/places\`): Points of interest management with moderation
- **Friends** (\`/friends\`): Social connections and relationships
- **Paths** (\`/paths\`): Route generation and management
- **Walks** (\`/walks\`): Walk planning and participation
- **Notifications** (\`/notifications\`): User notifications
- **Recommendations** (\`/recommendations\`): Personalized place recommendations

## Base URL
\`\`\`
http://localhost:3000
\`\`\`

## Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Server Error
    `)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token in the format: Bearer <token>',
      },
      'access-token' // This is the name of the security scheme
    )
    .addTag('Authentication', 'User registration, login, and profile management endpoints')
    .addTag('Places', 'Points of Interest management and moderation')
    .addTag('Friends', 'Social connections and friend requests')
    .addTag('Paths', 'Route generation and management')
    .addTag('Walks', 'Walk planning and participation')
    .addTag('Notifications', 'User notification system')
    .addTag('Recommendations', 'Personalized place recommendations')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0', () => {
    console.log(`FootPath monolith is running on port ${port}`);
    console.log(`API Documentation available at: http://localhost:${port}/api/docs`);
  });
}
bootstrap();