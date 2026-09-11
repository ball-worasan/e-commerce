// บทบาทของผู้ใช้งาน
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  MEMBER = 'MEMBER',
}

// ตรวจสอบว่าบทบาทของผู้ใช้งานถูกต้องหรือไม่
export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}