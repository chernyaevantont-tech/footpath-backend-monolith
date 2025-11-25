import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './auth/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { PasswordUtil } from './auth/utils/password.util';

@Injectable()
export class AppInitializerService implements OnModuleInit {
  private readonly logger = new Logger(AppInitializerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing application...');
    await this.ensureDefaultAdminUser();
  }

  private async ensureDefaultAdminUser(): Promise<void> {
    try {
      // Get admin credentials from environment variables
      const defaultAdminEmail = this.configService.get<string>('DEFAULT_ADMIN_EMAIL') || 'admin@footpath.com';
      const defaultAdminPassword = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') || 'admin123';

      this.logger.log('Checking for default admin user...');

      // Check if admin user already exists
      const existingAdmin = await this.userRepository.findOne({
        where: { 
          email: defaultAdminEmail,
          role: UserRole.ADMIN 
        },
      });

      if (existingAdmin) {
        this.logger.log(`Default admin user already exists with email: ${defaultAdminEmail}`);
        return;
      }

      // Create new admin user
      this.logger.log(`Creating default admin user with email: ${defaultAdminEmail}`);

      const hashedPassword = await PasswordUtil.hash(defaultAdminPassword);

      const adminUser = new User();
      adminUser.email = defaultAdminEmail;
      adminUser.password = hashedPassword;
      adminUser.role = UserRole.ADMIN;

      await this.userRepository.save(adminUser);

      this.logger.log(`Default admin user created successfully with email: ${defaultAdminEmail}`);

    } catch (error) {
      this.logger.error('Error ensuring default admin user:', error);
      throw error;
    }
  }
}