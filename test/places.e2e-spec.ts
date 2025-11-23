import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';

describe('PlacesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get the DataSource instance
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    if (dataSource) {
      await dataSource.dropDatabase();
      await dataSource.synchronize(true);
    }

    // Register a user and get a token for authentication
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'placestest@example.com',
        password: 'password123',
      });

    userToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  it('/places (POST) - should create a new place', () => {
    return request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Test Place',
        description: 'A beautiful test place',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        tags: ['test', 'place'],
      })
      .expect(201)
      .then(response => {
        expect(response.body.id).toBeDefined();
        expect(response.body.name).toBe('Test Place');
        expect(response.body.description).toBe('A beautiful test place');
        expect(response.body.status).toBe('pending');
      });
  });

  it('/places (GET) - should get places with filters', () => {
    return request(app.getHttpServer())
      .get('/places')
      .set('Authorization', `Bearer ${userToken}`)
      .query({
        radius: 1000,
        latitude: 40.7128,
        longitude: -74.0060,
      })
      .expect(200);
  });

  it('/places/:id (GET) - should get a specific place', async () => {
    // First create a place
    const createResponse = await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Specific Place',
        description: 'A place for specific testing',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        tags: ['test', 'specific'],
      });

    const placeId = createResponse.body.id;

    // Then get the place by ID
    return request(app.getHttpServer())
      .get(`/places/${placeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .then(response => {
        expect(response.body.id).toBe(placeId);
        expect(response.body.name).toBe('Specific Place');
      });
  });

  it('/places/:id (PUT) - should update a place', async () => {
    // First create a place
    const createResponse = await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Update Place',
        description: 'Original description',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        tags: ['test', 'update'],
      });

    const placeId = createResponse.body.id;

    // Then update the place
    return request(app.getHttpServer())
      .put(`/places/${placeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Updated Place',
        description: 'Updated description',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        tags: ['test', 'updated'],
      })
      .expect(200)
      .then(response => {
        expect(response.body.id).toBe(placeId);
        expect(response.body.name).toBe('Updated Place');
        expect(response.body.description).toBe('Updated description');
      });
  });
});