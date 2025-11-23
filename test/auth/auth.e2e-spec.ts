import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../src/auth/entities/user.entity';
import { PasswordResetToken } from '../../src/auth/entities/password-reset-token.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'test_db',
          entities: [User, PasswordResetToken],
          synchronize: true, // Only for testing
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    email: 'test@example.com',
    password: 'TestPass123!',
  };

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .then(response => {
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('token');
          expect(response.body.user.email).toBe(testUser.email);
        });
    });

    it('should return error if user already exists', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(400);
    });

    it('should return error if password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new@example.com',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login a user with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('token');
          expect(response.body.user.email).toBe(testUser.email);
        });
    });

    it('should return error for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let token: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);
      
      token = response.body.token;
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('email');
          expect(response.body.email).toBe(testUser.email);
        });
    });

    it('should return error without valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('/auth/request-password-reset (POST)', () => {
    it('should accept password reset request', () => {
      return request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({
          email: testUser.email,
        })
        .expect(200);
    });
  });
});