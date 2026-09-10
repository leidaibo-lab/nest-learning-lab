import { Injectable } from '@nestjs/common';
import { scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import * as argon2 from 'argon2';

const legacyScrypt = promisify(scryptCallback);

const argon2Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, argon2Options);
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    if (encodedHash.startsWith('$argon2')) {
      try {
        return await argon2.verify(encodedHash, password);
      } catch {
        return false;
      }
    }

    if (encodedHash.startsWith('scrypt$')) {
      return this.verifyLegacyScrypt(password, encodedHash);
    }

    return false;
  }

  needsRehash(encodedHash: string): boolean {
    if (encodedHash.startsWith('scrypt$')) {
      return true;
    }

    if (!encodedHash.startsWith('$argon2id$')) {
      return false;
    }

    return argon2.needsRehash(encodedHash, argon2Options);
  }

  private async verifyLegacyScrypt(
    password: string,
    encodedHash: string,
  ): Promise<boolean> {
    const [, salt, encodedKey] = encodedHash.split('$');
    if (!salt || !encodedKey || !/^[0-9a-f]+$/i.test(encodedKey)) {
      return false;
    }

    try {
      const expected = Buffer.from(encodedKey, 'hex');
      const actual = (await legacyScrypt(
        password,
        salt,
        expected.length,
      )) as Buffer;
      return (
        expected.length === actual.length && timingSafeEqual(expected, actual)
      );
    } catch {
      return false;
    }
  }
}
