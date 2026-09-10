import { PasswordService } from './password.service';
import { promisify } from 'node:util';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';

const scrypt = promisify(scryptCallback);

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password without storing the plaintext', async () => {
    const encoded = await service.hash('password123');

    expect(encoded).toMatch(/^\$argon2id\$/);
    expect(encoded).not.toContain('password123');
    await expect(service.verify('password123', encoded)).resolves.toBe(true);
    await expect(service.verify('wrong-password', encoded)).resolves.toBe(
      false,
    );
  });

  it('rejects malformed hashes', async () => {
    await expect(service.verify('password123', 'invalid')).resolves.toBe(false);
  });

  it('verifies legacy scrypt hashes and marks them for upgrade', async () => {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt('password123', salt, 64)) as Buffer;
    const legacyHash = `scrypt$${salt}$${derivedKey.toString('hex')}`;

    await expect(service.verify('password123', legacyHash)).resolves.toBe(true);
    expect(service.needsRehash(legacyHash)).toBe(true);
  });

  it('does not mark current Argon2id hashes for upgrade', async () => {
    const encoded = await service.hash('password123');

    expect(service.needsRehash(encoded)).toBe(false);
  });
});
