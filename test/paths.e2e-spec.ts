import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';

describe('PathsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userToken: string;
  let userId: string;
  let placeId: string;

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
        email: 'pathstest@example.com',
        password: 'password123',
      });

    userToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // Create a place for testing with paths
    const createPlaceResponse = await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Test Place for Path',
        description: 'A place to test paths with',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        tags: ['test', 'path'],
      });

    placeId = createPlaceResponse.body.id;
  });

  it('/paths/generate (POST) - should generate a path', () => {
    return request(app.getHttpServer())
      .post('/paths/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        startCoordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        endCoordinates: {
          latitude: 40.7589,
          longitude: -73.9851,
        },
        tags: ['nature', 'park'],
        maxDuration: 60,
        maxDistance: 10,
      })
      .expect(201)
      .then(response => {
        expect(response.body.id).toBeDefined();
        expect(response.body.name).toBeDefined();
      });
  });

  it('/paths (POST) - should create a saved path', () => {
    return request(app.getHttpServer())
      .post('/paths')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'My Saved Path',
        description: 'A saved path for testing',
        places: [placeId],
        distance: 2.5,
        totalTime: 45,
      })
      .expect(201)
      .then(response => {
        expect(response.body.id).toBeDefined();
        expect(response.body.name).toBe('My Saved Path');
        expect(response.body.places).toContainEqual(expect.objectContaining({ id: placeId }));
      });
  });

  it('/paths (GET) - should get saved paths', () => {
    return request(app.getHttpServer())
      .get('/paths')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });

  it('/paths/:id (GET) - should get a specific path', async () => {
    // First create a path
    const createResponse = await request(app.getHttpServer())
      .post('/paths')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Specific Path',
        description: 'A path for specific testing',
        places: [placeId],
        distance: 3.0,
        totalTime: 50,
      });

    const pathId = createResponse.body.id;

    // Then get the path by ID
    return request(app.getHttpServer())
      .get(`/paths/${pathId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .then(response => {
        expect(response.body.id).toBe(pathId);
        expect(response.body.name).toBe('Specific Path');
      });
  });

  it('/paths/:id (PUT) - should update a path', async () => {
    // First create a path
    const createResponse = await request(app.getHttpServer())
      .post('/paths')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Update Path',
        description: 'Original description',
        places: [placeId],
        distance: 3.0,
        totalTime: 50,
      });

    const pathId = createResponse.body.id;

    // Then update the path
    return request(app.getHttpServer())
      .put(`/paths/${pathId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Updated Path',
        description: 'Updated description',
        places: [placeId],
        distance: 3.5,
        totalTime: 55,
      })
      .expect(200)
      .then(response => {
        expect(response.body.id).toBe(pathId);
        expect(response.body.name).toBe('Updated Path');
        expect(response.body.description).toBe('Updated description');
      });
  });

  it('/paths/:id (DELETE) - should delete a path', async () => {
    // First create a path
    const createResponse = await request(app.getHttpServer())
      .post('/paths')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'ToDelete Path',
        description: 'Path to be deleted',
        places: [placeId],
        distance: 2.0,
        totalTime: 30,
      });

    const pathId = createResponse.body.id;

    // Then delete the path
    return request(app.getHttpServer())
      .delete(`/paths/${pathId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });
});