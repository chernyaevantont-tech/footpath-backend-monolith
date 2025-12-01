import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisModule } from '../src/common/redis.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        // For testing purposes, we'll use in-memory SQLite or a test database configuration
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          dropSchema: true,
          entities: [User],
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await userRepository.query('DELETE FROM user');
  });

  it('/auth/register (POST) - should register a new user', async () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
    };

    return request(app.getHttpServer())
      .post('/auth/register')
      .send(registerData)
      .expect(201)
      .then(response => {
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe(registerData.email);
      });
  });

  it('/auth/register (POST) - should return 400 for invalid data', async () => {
    const registerData = {
      email: 'invalid-email',
      password: '123', // Too short
    };

    return request(app.getHttpServer())
      .post('/auth/register')
      .send(registerData)
      .expect(400);
  });

  it('/auth/login (POST) - should login existing user', async () => {
    // First register a user
    const registerData = {
      email: 'login@example.com',
      password: 'password123',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerData)
      .expect(201);

    // Then try to login
    const loginData = {
      email: registerData.email,
      password: registerData.password,
    };

    return request(app.getHttpServer())
      .post('/auth/login')
      .send(loginData)
      .expect(200)
      .then(response => {
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe(loginData.email);
      });
  });

  it('/auth/login (POST) - should return 401 for invalid credentials', async () => {
    const loginData = {
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    };

    return request(app.getHttpServer())
      .post('/auth/login')
      .send(loginData)
      .expect(401);
  });

  it('/auth/me (GET) - should return user profile with valid token', async () => {
    // First register and login to get a token
    const registerData = {
      email: 'profile@example.com',
      password: 'password123',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerData)
      .expect(201);

    const token = registerResponse.body.token;

    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .then(response => {
        expect(response.body.email).toBe(registerData.email);
      });
  });

  it('/auth/me (GET) - should return 401 without valid token', async () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('/auth/profile (PUT) - should update user profile', async () => {
    // Register and login
    const registerData = {
      email: 'update@example.com',
      password: 'password123',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerData)
      .expect(201);

    const token = registerResponse.body.token;

    const updateData = {
      email: 'updated@example.com',
    };

    return request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(updateData)
      .expect(200)
      .then(response => {
        expect(response.body.email).toBe(updateData.email);
      });
  });
});