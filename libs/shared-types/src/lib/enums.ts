// ผู้ใช้งานสามารถมีบทบาทต่างๆ ดังนี้
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  MEMBER = 'MEMBER',
}

// ตรวจสอบว่าบทบาทของผู้ใช้งานถูกต้องหรือไม่
export function isUserRole(value: string): value is UserRole {
  return (Object.values(UserRole) as string[]).includes(value);
}

// ข้อมูลผู้ใช้งานที่ต้องการตรวจสอบการเข้าถึงระบบ
export interface AuthenticatedUserClaims {
  userId: string;
  role: UserRole;
}