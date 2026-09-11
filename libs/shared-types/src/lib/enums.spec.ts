import { isUserRole, UserRole } from './enums.js';

describe('Validate User Role', () => {
  it('should return true for valid user roles', () => {
    expect(isUserRole(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isUserRole(UserRole.ADMIN)).toBe(true);
    expect(isUserRole(UserRole.SELLER)).toBe(true);
    expect(isUserRole(UserRole.MEMBER)).toBe(true);
  });

  it('should return false for unknown user roles', () => {
    expect(isUserRole('unknown')).toBe(false);
  });
});