import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnection, DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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
  });

  it('/auth/register (POST) - should register a new user', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201)
      .then(response => {
        expect(response.body.user).toBeDefined();
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe('test@example.com');
      });
  });

  it('/auth/login (POST) - should login a user', () => {
    // First register a user
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'login@example.com',
        password: 'password123',
      })
      .then(() => {
        // Then try to login
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'login@example.com',
            password: 'password123',
          })
          .expect(200)
          .then(response => {
            expect(response.body.user).toBeDefined();
            expect(response.body.token).toBeDefined();
            expect(response.body.user.email).toBe('login@example.com');
          });
      });
  });

  it('/auth/login (POST) - should fail with invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      })
      .expect(401);
  });

  it('/auth/me (GET) - should get authenticated user profile', () => {
    // Register and login first
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'profile@example.com',
        password: 'password123',
      })
      .then(registerResponse => {
        const token = registerResponse.body.token;

        return request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .then(response => {
            expect(response.body.email).toBe('profile@example.com');
          });
      });
  });

  it('/auth/profile (PUT) - should update user profile', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'update@example.com',
        password: 'password123',
      })
      .then(registerResponse => {
        const token = registerResponse.body.token;

        return request(app.getHttpServer())
          .put('/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            email: 'updated@example.com',
          })
          .expect(200)
          .then(response => {
            expect(response.body.message).toBe('Profile updated successfully');
            expect(response.body.user.email).toBe('updated@example.com');
          });
      });
  });
});