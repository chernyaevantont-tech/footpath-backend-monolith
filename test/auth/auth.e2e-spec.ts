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

  describe('/auth/register-moderator (POST) - Integration Tests', () => {
    let adminToken: string;

    beforeAll(async () => {
      // Login with the default admin user created by the app initializer
      const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@footpath.com';
      const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: defaultAdminEmail,
          password: defaultAdminPassword,
        })
        .expect(200);

      adminToken = loginResponse.body.token;
    });

    it('should allow admin to register a new moderator', () => {
      return request(app.getHttpServer())
        .post('/auth/register-moderator')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newmoderator@example.com',
          password: 'modPassword123',
          role: 'moderator'
        })
        .expect(201)
        .then(response => {
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('token');
          expect(response.body.user.email).toBe('newmoderator@example.com');
          expect(response.body.user.role).toBe('moderator');
        });
    });

    it('should allow admin to register a new admin', () => {
      return request(app.getHttpServer())
        .post('/auth/register-moderator')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'anotheradmin@example.com',
          password: 'adminPassword123',
          role: 'admin'
        })
        .expect(201)
        .then(response => {
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('token');
          expect(response.body.user.email).toBe('anotheradmin@example.com');
          expect(response.body.user.role).toBe('admin');
        });
    });

    it('should return 403 when non-admin tries to register moderator', async () => {
      // Login as a regular user
      const userTokenResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const userToken = userTokenResponse.body.token;

      return request(app.getHttpServer())
        .post('/auth/register-moderator')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'unauthorized@example.com',
          password: 'password123',
          role: 'moderator'
        })
        .expect(403);
    });

    it('should return 401 when no token is provided', () => {
      return request(app.getHttpServer())
        .post('/auth/register-moderator')
        .send({
          email: 'notoken@example.com',
          password: 'password123',
          role: 'moderator'
        })
        .expect(401);
    });

    it('should return 400 when invalid role is provided', () => {
      return request(app.getHttpServer())
        .post('/auth/register-moderator')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalidrole@example.com',
          password: 'password123',
          role: 'invalid_role'
        })
        .expect(400);
    });

    it('should return 400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/register-moderator')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'shortpass@example.com',
          password: '123',
          role: 'moderator'
        })
        .expect(400);
    });
  });
});