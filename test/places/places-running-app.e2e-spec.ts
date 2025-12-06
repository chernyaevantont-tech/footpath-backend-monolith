import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../src/auth/entities/user.entity';

describe('PlacesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let regularUserToken: string;
  let regularUserId: string;
  let moderatorToken: string;
  let moderatorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear only the places and related data for test isolation
    if (dataSource) {
      // Only clean up the places and related tables - not the entire database
      await dataSource.query('DELETE FROM places_moderation_log');
      await dataSource.query('DELETE FROM places');
      await dataSource.query('DELETE FROM users WHERE email NOT IN ($1, $2, $3)', [
        'admin@footpath.com', // Keep default admin
        'regularuser@example.com',
        'moderator@example.com'
      ]);
    }

    // Register regular user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'regularuser@example.com',
        password: 'password123',
      });

    regularUserToken = registerResponse.body.token;
    regularUserId = registerResponse.body.user.id;

    // Create moderator user directly in the database with proper role and password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('moderator123', 10);
    const moderator = new User();
    moderator.email = 'moderator@example.com';
    moderator.password = hashedPassword;
    moderator.role = UserRole.MODERATOR;
    await dataSource.getRepository(User).save(moderator);

    // Login moderator to get token
    const moderatorLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'moderator@example.com',
        password: 'moderator123',
      });

    if (moderatorLoginResponse.status === 201) {
      moderatorToken = moderatorLoginResponse.body.token;
      moderatorId = moderatorLoginResponse.body.user.id;
    }
  });

  afterEach(async () => {
    // Clean up after each test - only delete places created in this test
  });

  describe('CRUD Operations', () => {
    it('/places (POST) - should create a new place', () => {
      return request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Test Place',
          description: 'A beautiful test place',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [], // Use tagIds as per DTO
        })
        .expect(201)
        .then(response => {
          expect(response.body.id).toBeDefined();
          expect(response.body.name).toBe('Test Place');
          expect(response.body.description).toBe('A beautiful test place');
          expect(response.body.status).toBe('pending');
          expect(response.body.creatorId).toBe(regularUserId);
          expect(response.body.coordinates).toBeDefined();
        });
    });

    it('/places/:id (GET) - should get a specific place', async () => {
      // First create a place
      const createResponse = await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Specific Place',
          description: 'A place for specific testing',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [],
        });

      const placeId = createResponse.body.id;

      // Then get the place by ID
      return request(app.getHttpServer())
        .get(`/places/${placeId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200)
        .then(response => {
          expect(response.body.id).toBe(placeId);
          expect(response.body.name).toBe('Specific Place');
          expect(response.body.description).toBe('A place for specific testing');
        });
    });

    it('/places/:id (GET) - should return 404 for non-existent place', () => {
      return request(app.getHttpServer())
        .get('/places/nonexistent-place-id')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(404)
        .then(response => {
          expect(response.body.message).toBe('Place with ID nonexistent-place-id not found');
        });
    });

    it('/places/:id (PUT) - should update a place', async () => {
      // First create a place
      const createResponse = await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Update Place',
          description: 'Original description',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [],
        });

      const placeId = createResponse.body.id;

      // Then update the place
      return request(app.getHttpServer())
        .put(`/places/${placeId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Updated Place',
          description: 'Updated description',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [],
        })
        .expect(200)
        .then(response => {
          expect(response.body.id).toBe(placeId);
          expect(response.body.name).toBe('Updated Place');
          expect(response.body.description).toBe('Updated description');
        });
    });

    it('/places (GET) - should search places with filters', async () => {
      // Create several test places
      await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Central Park',
          description: 'A large public park',
          coordinates: {
            latitude: 40.7829,
            longitude: -73.9654,
          },
          tagIds: ['tag1', 'tag2'],
        });

      await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Times Square',
          description: 'A major commercial intersection',
          coordinates: {
            latitude: 40.7580,
            longitude: -73.9855,
          },
          tagIds: ['tag1', 'tag3'],
        });

      // Search with location filter
      return request(app.getHttpServer())
        .get('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .query({
          latitude: 40.7580,
          longitude: -73.9855,
          radius: 5000, // 5km radius
        })
        .expect(200)
        .then(response => {
          expect(response.body.data).toBeInstanceOf(Array);
          expect(response.body.data.length).toBeGreaterThan(0);
          expect(response.body.meta).toBeDefined();
          expect(response.body.meta.page).toBe(1);
          expect(response.body.meta.limit).toBe(10);
        });
    });
  });

  describe('Moderation Operations', () => {
    it('PUT /places/:id/approve - should approve a place (moderator access)', async () => {
      // First create a place
      const createResponse = await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Place for Approval',
          description: 'This place needs approval',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [],
        });

      const placeId = createResponse.body.id;

      // Verify the place is pending
      const initialPlace = await request(app.getHttpServer())
        .get(`/places/${placeId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);
      expect(initialPlace.body.status).toBe('pending');

      // Approve the place using moderator token
      return request(app.getHttpServer())
        .put(`/places/${placeId}/approve`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ reason: 'Approved by moderator' })
        .expect(200)
        .then(response => {
          expect(response.body.id).toBe(placeId);
          expect(response.body.status).toBe('approved');
          expect(response.body.moderatorId).toBe(moderatorId);
        });
    });

    it('PUT /places/:id/reject - should reject a place (moderator access)', async () => {
      // First create a place
      const createResponse = await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Place for Rejection',
          description: 'This place will be rejected',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [],
        });

      const placeId = createResponse.body.id;

      // Verify the place is pending
      const initialPlace = await request(app.getHttpServer())
        .get(`/places/${placeId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);
      expect(initialPlace.body.status).toBe('pending');

      // Reject the place using moderator token
      return request(app.getHttpServer())
        .put(`/places/${placeId}/reject`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ reason: 'Rejected by moderator' })
        .expect(200)
        .then(response => {
          expect(response.body.id).toBe(placeId);
          expect(response.body.status).toBe('rejected');
          expect(response.body.moderatorId).toBe(moderatorId);
        });
    });

    it('PUT /places/:id/approve - should fail when regular user tries to approve', async () => {
      // First create a place
      const createResponse = await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Place for Approval Test',
          description: 'Testing regular user approval attempt',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [],
        });

      const placeId = createResponse.body.id;

      // Try to approve with regular user token (should fail)
      return request(app.getHttpServer())
        .put(`/places/${placeId}/approve`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ reason: 'Should not work' })
        .expect(403)
        .then(response => {
          expect(response.body.statusCode).toBe(403);
          expect(response.body.message).toContain('insufficient permissions');
        });
    });

    it('PUT /places/:id/reject - should fail when regular user tries to reject', async () => {
      // First create a place
      const createResponse = await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Place for Rejection Test',
          description: 'Testing regular user rejection attempt',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [],
        });

      const placeId = createResponse.body.id;

      // Try to reject with regular user token (should fail)
      return request(app.getHttpServer())
        .put(`/places/${placeId}/reject`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ reason: 'Should not work' })
        .expect(403)
        .then(response => {
          expect(response.body.statusCode).toBe(403);
          expect(response.body.message).toContain('insufficient permissions');
        });
    });
  });

  describe('Filtering and Search', () => {
    it('/places (GET) - should search places by name', async () => {
      // Create test places with different names
      await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Central Park',
          description: 'A large public park',
          coordinates: {
            latitude: 40.7829,
            longitude: -73.9654,
          },
          tagIds: [],
        });

      await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Times Square',
          description: 'A busy commercial square',
          coordinates: {
            latitude: 40.7580,
            longitude: -73.9855,
          },
          tagIds: [],
        });

      // Search for places containing 'Central'
      return request(app.getHttpServer())
        .get('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .query({ name: 'Central' })
        .expect(200)
        .then(response => {
          expect(response.body.data).toBeInstanceOf(Array);
          expect(response.body.data.length).toBe(1);
          expect(response.body.data[0].name).toBe('Central Park');
        });
    });

    it('/places (GET) - should filter places by tag IDs', async () => {
      // Create test places with different tags
      await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Place with Nature Tag',
          description: 'A place tagged with nature',
          coordinates: {
            latitude: 40.7829,
            longitude: -73.9654,
          },
          tagIds: ['nature-uuid-1', 'outdoor-uuid-1'],
        });

      await request(app.getHttpServer())
        .post('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Place with City Tag',
          description: 'A place tagged with city',
          coordinates: {
            latitude: 40.7580,
            longitude: -73.9855,
          },
          tagIds: ['city-uuid-1', 'urban-uuid-1'],
        });

      // Filter by nature tag
      return request(app.getHttpServer())
        .get('/places')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .query({ tagIds: 'nature-uuid-1' })
        .expect(200)
        .then(response => {
          expect(response.body.data).toBeInstanceOf(Array);
          expect(response.body.data.length).toBe(1);
          expect(response.body.data[0].name).toBe('Place with Nature Tag');
        });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for creating a place', () => {
      return request(app.getHttpServer())
        .post('/places')
        .send({
          name: 'Unauthorized Place',
          description: 'This should fail without auth',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
          tagIds: [],
        })
        .expect(401);
    });

    it('should require authentication for getting a place', () => {
      return request(app.getHttpServer())
        .get('/places/some-place-id')
        .expect(401);
    });

    it('should require authentication for updating a place', () => {
      return request(app.getHttpServer())
        .put('/places/some-place-id')
        .send({
          name: 'Updated Place',
        })
        .expect(401);
    });

    it('should require authentication for searching places', () => {
      return request(app.getHttpServer())
        .get('/places')
        .expect(401);
    });
  });
});