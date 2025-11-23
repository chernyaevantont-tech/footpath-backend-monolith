import * as bcrypt from 'bcrypt';

export class PasswordUtil {
  static async hash(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  static async compare(password: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(password, hashed);
  }
}