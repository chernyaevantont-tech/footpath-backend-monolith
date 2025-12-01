import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { Place } from '../src/places/entities/place.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisModule } from '../src/common/redis.module';

describe('Full System Flow (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let placeRepository: Repository<Place>;

  // Helper function to register and login user
  const registerAndLogin = async (email: string, password: string) => {
    // Register user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    // Login to get token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.token;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        // For testing purposes, we'll use in-memory SQLite
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          dropSchema: true,
          entities: [User, Place],
        }),
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test_secret',
          signOptions: { expiresIn: '1h' },
        }),
        RedisModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    placeRepository = moduleFixture.get<Repository<Place>>(getRepositoryToken(Place));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await placeRepository.query('DELETE FROM place');
    await userRepository.query('DELETE FROM user');
  });

  it('should complete a full user journey: register -> login -> create place -> get place -> update profile', async () => {
    // Step 1: Register a new user
    const email = 'journey@example.com';
    const password = 'password123';
    
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
    
    expect(registerResponse.body).toHaveProperty('user');
    expect(registerResponse.body).toHaveProperty('token');
    expect(registerResponse.body.user.email).toBe(email);

    const token = registerResponse.body.token;

    // Step 2: Get user profile
    const profileResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(profileResponse.body.email).toBe(email);

    // Step 3: Create a new place
    const placeData = {
      name: 'Journey Test Place',
      description: 'A place created during the journey test',
      coordinates: {
        latitude: 10.0,
        longitude: 10.0,
      },
      tagIds: [],
    };

    const createPlaceResponse = await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${token}`)
      .send(placeData)
      .expect(201);

    expect(createPlaceResponse.body).toHaveProperty('id');
    expect(createPlaceResponse.body.name).toBe(placeData.name);
    expect(createPlaceResponse.body.status).toBe('PENDING'); // Should be pending by default

    const placeId = createPlaceResponse.body.id;

    // Step 4: Update the place
    const updateData = {
      name: 'Updated Journey Test Place',
      description: 'Updated description',
    };

    const updatedPlaceResponse = await request(app.getHttpServer())
      .put(`/places/${placeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData)
      .expect(200);

    expect(updatedPlaceResponse.body.id).toBe(placeId);
    expect(updatedPlaceResponse.body.name).toBe(updateData.name);

    // Step 5: Get the specific place
    const getPlaceResponse = await request(app.getHttpServer())
      .get(`/places/${placeId}`)
      .expect(200);

    expect(getPlaceResponse.body.id).toBe(placeId);
    expect(getPlaceResponse.body.name).toBe(updateData.name);

    // Step 6: Update user profile
    const updateProfileData = {
      email: 'updated-journey@example.com',
    };

    const updatedProfileResponse = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(updateProfileData)
      .expect(200);

    expect(updatedProfileResponse.body.email).toBe(updateProfileData.email);

    // Step 7: Get updated profile to verify changes
    const finalProfileResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(finalProfileResponse.body.email).toBe(updateProfileData.email);
  });

  it('should handle password reset flow', async () => {
    // Register a user
    const email = 'reset@example.com';
    const password = 'password123';
    
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    // Request password reset
    await request(app.getHttpServer())
      .post('/auth/request-password-reset')
      .send({ email })
      .expect(200);

    // Note: In a real test, we'd need to retrieve the token from a mock email service
    // For this test, we'll just verify that the request endpoint works
  });

  it('should handle place creation and retrieval with tags', async () => {
    // Register and login
    const token = await registerAndLogin('tagtest@example.com', 'password123');

    // Create a tag first (this might require admin privileges in real app, but for test we'll assume it's allowed)
    const tagResponse = await request(app.getHttpServer())
      .post('/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'nature' })
      .expect(201);

    const tagId = tagResponse.body.id;
    expect(tagId).toBeDefined();

    // Create a place with the tag
    const placeData = {
      name: 'Tagged Place',
      description: 'A place with tags',
      coordinates: {
        latitude: 20.0,
        longitude: 20.0,
      },
      tagIds: [tagId],
    };

    const createPlaceResponse = await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${token}`)
      .send(placeData)
      .expect(201);

    expect(createPlaceResponse.body.tags).toBeInstanceOf(Array);
    expect(createPlaceResponse.body.tags.length).toBe(1);
    expect(createPlaceResponse.body.tags[0].id).toBe(tagId);

    // Retrieve the place to confirm tag association
    const placeId = createPlaceResponse.body.id;
    const getPlaceResponse = await request(app.getHttpServer())
      .get(`/places/${placeId}`)
      .expect(200);

    expect(getPlaceResponse.body.tags).toBeInstanceOf(Array);
    expect(getPlaceResponse.body.tags.length).toBe(1);
    expect(getPlaceResponse.body.tags[0].id).toBe(tagId);
  });

  it('should enforce authentication on protected endpoints', async () => {
    // Try to access a protected endpoint without token
    await request(app.getHttpServer())
      .post('/places')
      .send({
        name: 'Unauthorized Place',
        description: 'Should not be created',
        coordinates: {
          latitude: 30.0,
          longitude: 30.0,
        },
        tagIds: [],
      })
      .expect(401);

    // Try to access user profile without token
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);

    // Try to update profile without token
    await request(app.getHttpServer())
      .put('/auth/profile')
      .send({ email: 'hacker@example.com' })
      .expect(401);
  });
});