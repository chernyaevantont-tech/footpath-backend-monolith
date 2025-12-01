import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PlacesModule } from '../src/places/places.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Place } from '../src/places/entities/place.entity';
import { User } from '../src/auth/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisModule } from '../src/common/redis.module';

describe('PlacesController (e2e)', () => {
  let app: INestApplication;
  let placeRepository: Repository<Place>;
  let userRepository: Repository<User>;

  // Helper function to create a user and get JWT token
  const createUserAndLogin = async (email: string, password: string) => {
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
        PlacesModule,
        // For testing purposes, we'll use in-memory SQLite
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          dropSchema: true,
          entities: [Place, User],
        }),
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test_secret',
          signOptions: { expiresIn: '1h' },
        }),
        RedisModule,
      ],
    })
    .overrideModule(TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      dropSchema: true,
      entities: [Place, User],
    }))
    .useModule(TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      dropSchema: true,
      entities: [Place, User],
    }))
    .compile();

    app = moduleFixture.createNestApplication();
    placeRepository = moduleFixture.get<Repository<Place>>(getRepositoryToken(Place));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
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

  it('/places (POST) - should create a new place', async () => {
    const token = await createUserAndLogin('user@example.com', 'password123');

    const createPlaceData = {
      name: 'Test Place',
      description: 'A beautiful test place',
      coordinates: {
        latitude: 1.0,
        longitude: 1.0,
      },
      tagIds: [],
    };

    return request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${token}`)
      .send(createPlaceData)
      .expect(201)
      .then(response => {
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(createPlaceData.name);
        expect(response.body.description).toBe(createPlaceData.description);
        expect(response.body.status).toBe('PENDING');
      });
  });

  it('/places (GET) - should return list of places', async () => {
    // Create a user but no need to authenticate for this test since it should return public places
    const token = await createUserAndLogin('user2@example.com', 'password123');

    // Create a place first
    const createPlaceData = {
      name: 'Public Place',
      description: 'A public place',
      coordinates: {
        latitude: 2.0,
        longitude: 2.0,
      },
      tagIds: [],
    };

    await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${token}`)
      .send(createPlaceData)
      .expect(201);

    // Get all places
    return request(app.getHttpServer())
      .get('/places')
      .expect(200)
      .then(response => {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
  });

  it('/places/:id (GET) - should return a specific place', async () => {
    const token = await createUserAndLogin('user3@example.com', 'password123');

    // Create a place
    const createPlaceData = {
      name: 'Specific Place',
      description: 'A specific place',
      coordinates: {
        latitude: 3.0,
        longitude: 3.0,
      },
      tagIds: [],
    };

    const createResponse = await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${token}`)
      .send(createPlaceData)
      .expect(201);

    const placeId = createResponse.body.id;

    // Get the specific place
    return request(app.getHttpServer())
      .get(`/places/${placeId}`)
      .expect(200)
      .then(response => {
        expect(response.body.id).toBe(placeId);
        expect(response.body.name).toBe(createPlaceData.name);
      });
  });

  it('/places/:id (PUT) - should update a place', async () => {
    const token = await createUserAndLogin('user4@example.com', 'password123');

    // Create a place
    const createPlaceData = {
      name: 'Original Place',
      description: 'Original description',
      coordinates: {
        latitude: 4.0,
        longitude: 4.0,
      },
      tagIds: [],
    };

    const createResponse = await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${token}`)
      .send(createPlaceData)
      .expect(201);

    const placeId = createResponse.body.id;

    // Update the place
    const updateData = {
      name: 'Updated Place',
      description: 'Updated description',
    };

    return request(app.getHttpServer())
      .put(`/places/${placeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData)
      .expect(200)
      .then(response => {
        expect(response.body.id).toBe(placeId);
        expect(response.body.name).toBe(updateData.name);
        expect(response.body.description).toBe(updateData.description);
      });
  });

  it('/places/:id (GET) - should return 404 for non-existent place', async () => {
    return request(app.getHttpServer())
      .get('/places/nonexistent-id')
      .expect(404);
  });

  it('/places (GET) with filters - should return filtered places', async () => {
    const token = await createUserAndLogin('user5@example.com', 'password123');

    // Create a place with name
    const createPlaceData = {
      name: 'Filtered Place',
      description: 'Place for filtering test',
      coordinates: {
        latitude: 5.0,
        longitude: 5.0,
      },
      tagIds: [],
    };

    await request(app.getHttpServer())
      .post('/places')
      .set('Authorization', `Bearer ${token}`)
      .send(createPlaceData)
      .expect(201);

    // Search by name
    return request(app.getHttpServer())
      .get('/places?name=Filtered')
      .expect(200)
      .then(response => {
        expect(response.body.data).toBeInstanceOf(Array);
        const foundPlace = response.body.data.find(p => p.name === 'Filtered Place');
        expect(foundPlace).toBeDefined();
      });
  });
});