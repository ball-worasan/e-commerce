# แผนการพัฒนา Foundation (Monorepo + Auth Service)

> **สำหรับ agentic worker:** ต้องใช้ sub-skill: superpowers:subagent-driven-development (แนะนำ) หรือ superpowers:executing-plans เพื่อ implement แผนนี้ทีละ task ขั้นตอนต่างๆ ใช้ checkbox (`- [ ]`) สำหรับติดตามความคืบหน้า

**เป้าหมาย:** สร้าง Nx monorepo, custom service generator ที่ใช้ซ้ำได้, และ `auth-service` ที่ทำงานได้จริงครบวงจร (สมัครสมาชิก, ล็อกอิน, OAuth, JWT RS256) พร้อม shared libs เพื่อให้ `catalog-service` (Plan 2) มีฐานและรูปแบบมาตรฐานให้ต่อยอด

**สถาปัตยกรรม:** Nx monorepo (pnpm) โดยมี `apps/auth-service` (NestJS) ที่สร้างผ่าน custom Nx generator (`libs/tools/service-generator`) เชื่อมกับ Postgres ของตัวเองผ่าน Prisma และออก JWT เซ็นด้วย RS256 โค้ดที่ใช้ร่วมกันอยู่ใน `libs/shared-types`, `libs/shared-config`, `libs/auth-guards`

**Tech Stack:** Nx, pnpm, TypeScript, NestJS, Prisma + PostgreSQL, Passport (Google/Facebook OAuth), bcrypt, jsonwebtoken, zod, Jest

**อ้างอิงเอกสาร spec:** `docs/superpowers/specs/2026-09-11-foundation-catalog-design.md`

## ข้อจำกัดร่วมทั้งแผน (Global Constraints)

- Package manager: ใช้ **pnpm** เท่านั้น — ห้ามใช้คำสั่ง `npm`/`yarn` (spec §3, confirmed แล้ว)
- Monorepo tool: **Nx** — service backend ใหม่ทุกตัวต้องสร้างผ่าน custom generator `service-generator` ไม่ใช่เรียก `nx g @nx/nest:application` ตรงๆ เพื่อให้ทุก service มีรูปแบบ health-check/Dockerfile เหมือนกัน (spec §12, confirmed แล้ว)
- Database: **PostgreSQL + Prisma** โดย **หนึ่ง database ต่อหนึ่ง service** — auth-service และ catalog-service ห้ามใช้ Postgres instance หรือ schema ร่วมกัน (spec §3, §10)
- JWT signing algorithm: **RS256** private key จะถูกโหลดที่ `auth-service` เท่านั้น (spec §16.10)
- เปิด TypeScript strict mode ทุกโปรเจกต์ (เป็นข้อสมมติของผม — ไม่ได้ระบุไว้ตรงๆ ใน spec จึงขอบันทึกไว้ให้เห็นชัด ปรับได้ถ้าไม่ต้องการ)
- npm scope สำหรับ internal package: `@ecommerce/*` (เช่น `@ecommerce/shared-types`) — เป็นการตั้งชื่อในการ implement เท่านั้น ไม่เกี่ยวกับชื่อโฟลเดอร์ `e-commerce`

---

### Task 1: ตั้งค่า Nx workspace เริ่มต้น

**ไฟล์:**
- สร้าง: Nx workspace ทั้งหมดที่ root ของ repo (`package.json`, `nx.json`, `tsconfig.base.json`, `apps/`, `libs/`, `pnpm-workspace.yaml`)
- คงไว้: โฟลเดอร์ `docs/` ที่มีอยู่เดิม (มีเอกสาร spec อยู่แล้ว) — ห้ามเขียนทับ

**Interface:**
- ผลลัพธ์: Nx workspace ที่รันได้ผ่าน `pnpm nx <command>`, npm scope เป็น `@ecommerce`, โฟลเดอร์ `apps/` และ `libs/` ว่างพร้อมสำหรับ task ถัดไป

- [ ] **ขั้นตอนที่ 1: สร้าง workspace ในโฟลเดอร์ชั่วคราวข้างๆ**

```bash
cd /Users/thanaporn/Documents
npx create-nx-workspace@latest ecommerce-tmp --preset=apps --packageManager=pnpm --nxCloud=skip
```

ผลลัพธ์ที่คาดหวัง: ได้โฟลเดอร์ใหม่ `Documents/ecommerce-tmp/` ที่มี `package.json`, `nx.json`, `apps/`, `libs/`, `pnpm-workspace.yaml`

- [ ] **ขั้นตอนที่ 2: ย้ายไฟล์ที่สร้างเข้าไปใน project root เดิม โดยไม่แตะ `docs/`**

```bash
cd /Users/thanaporn/Documents
rsync -a --exclude 'docs' ecommerce-tmp/ e-commerce/
rm -rf ecommerce-tmp
```

- [ ] **ขั้นตอนที่ 3: ตั้งค่า npm scope เป็น `@ecommerce`**

แก้ไข `/Users/thanaporn/Documents/e-commerce/package.json` ให้เป็น:
```json
{
  "name": "@ecommerce/source"
}
```

แก้ไข `/Users/thanaporn/Documents/e-commerce/nx.json` ให้มีค่านี้:
```json
{
  "npmScope": "ecommerce"
}
```
(ถ้า `create-nx-workspace` เดา scope จากชื่ออื่นไปแล้ว ขั้นตอนนี้จะแก้ให้เป็น `ecommerce`)

- [ ] **ขั้นตอนที่ 4: ตรวจสอบว่า workspace ใช้งานได้**

```bash
cd /Users/thanaporn/Documents/e-commerce
pnpm install
pnpm nx --version
```

ผลลัพธ์ที่คาดหวัง: แสดงเลขเวอร์ชัน Nx (เช่น `Local: v19.x.x` / `Global: v19.x.x`) ไม่มี error

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git init
git add -A
git commit -m "$(cat <<'EOF'
chore: initialize Nx monorepo workspace with pnpm

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `libs/shared-types` — enum และ type guard สำหรับ role

**ไฟล์:**
- สร้าง: `libs/shared-types/src/lib/enums.ts`
- สร้าง: `libs/shared-types/src/lib/enums.spec.ts`
- แก้ไข: `libs/shared-types/src/index.ts` (barrel export)

**Interface:**
- ผลลัพธ์: `UserRole` enum (`CUSTOMER`, `SELLER`, `ADMIN`), type guard `isUserRole(value: string): value is UserRole`, interface `AuthenticatedUserClaims { userId: string; role: UserRole }` — ทุกที่ import ผ่าน `@ecommerce/shared-types`

- [ ] **ขั้นตอนที่ 1: สร้าง library**

```bash
pnpm nx g @nx/js:lib shared-types --directory=libs/shared-types --bundler=tsc --unitTestRunner=jest --importPath=@ecommerce/shared-types
```

- [ ] **ขั้นตอนที่ 2: เขียน failing test**

สร้าง `libs/shared-types/src/lib/enums.spec.ts`:
```typescript
import { UserRole, isUserRole } from './enums';

describe('isUserRole', () => {
  it('returns true for every UserRole value', () => {
    expect(isUserRole('CUSTOMER')).toBe(true);
    expect(isUserRole('SELLER')).toBe(true);
    expect(isUserRole('ADMIN')).toBe(true);
  });

  it('returns false for an unknown string', () => {
    expect(isUserRole('SUPERADMIN')).toBe(false);
    expect(isUserRole('')).toBe(false);
  });
});

describe('UserRole', () => {
  it('has exactly three roles', () => {
    expect(Object.values(UserRole)).toHaveLength(3);
  });
});
```

- [ ] **ขั้นตอนที่ 2: รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test shared-types
```
ผลลัพธ์ที่คาดหวัง: FAIL — `Cannot find module './enums'`

- [ ] **ขั้นตอนที่ 3: เขียน implementation**

สร้าง `libs/shared-types/src/lib/enums.ts`:
```typescript
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

export function isUserRole(value: string): value is UserRole {
  return (Object.values(UserRole) as string[]).includes(value);
}

export interface AuthenticatedUserClaims {
  userId: string;
  role: UserRole;
}
```

อัปเดต `libs/shared-types/src/index.ts`:
```typescript
export * from './lib/enums';
```

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test shared-types
```
ผลลัพธ์ที่คาดหวัง: PASS (3 tests)

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git add libs/shared-types
git commit -m "$(cat <<'EOF'
feat(shared-types): add UserRole enum and claims interface

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `libs/shared-config` — ตัวโหลด environment ที่ผ่านการ validate

**ไฟล์:**
- สร้าง: `libs/shared-config/src/lib/env.ts`
- สร้าง: `libs/shared-config/src/lib/env.spec.ts`
- แก้ไข: `libs/shared-config/src/index.ts`
- แก้ไข: `package.json` ที่ root (เพิ่ม dependency `zod`)

**Interface:**
- Consumes: ไม่มี dependency จาก task อื่น
- ผลลัพธ์: `envSchema` (zod schema), type `Env`, ฟังก์ชัน `loadEnv(raw?: NodeJS.ProcessEnv): Env` — throw `Error` พร้อมข้อความอ่านง่ายเมื่อค่าที่ให้มาไม่ถูกต้อง/ขาดหาย ฟิลด์ที่มี: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`

- [ ] **ขั้นตอนที่ 1: สร้าง library และเพิ่ม zod**

```bash
pnpm nx g @nx/js:lib shared-config --directory=libs/shared-config --bundler=tsc --unitTestRunner=jest --importPath=@ecommerce/shared-config
pnpm add zod
```

- [ ] **ขั้นตอนที่ 2: เขียน failing test**

สร้าง `libs/shared-config/src/lib/env.spec.ts`:
```typescript
import { loadEnv } from './env';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/auth',
  JWT_PRIVATE_KEY_PATH: '/secrets/jwt-private.pem',
  JWT_PUBLIC_KEY_PATH: '/secrets/jwt-public.pem',
};

describe('loadEnv', () => {
  it('parses a valid environment', () => {
    const env = loadEnv(validEnv as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3001);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.NODE_ENV).toBe('test');
  });

  it('defaults PORT to 3000 when missing', () => {
    const { PORT, ...rest } = validEnv;
    const env = loadEnv(rest as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3000);
  });

  it('throws when DATABASE_URL is missing', () => {
    const { DATABASE_URL, ...rest } = validEnv;
    expect(() => loadEnv(rest as NodeJS.ProcessEnv)).toThrow(
      'Invalid environment configuration'
    );
  });
});
```

- [ ] **ขั้นตอนที่ 2: รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test shared-config
```
ผลลัพธ์ที่คาดหวัง: FAIL — `Cannot find module './env'`

- [ ] **ขั้นตอนที่ 3: เขียน implementation**

สร้าง `libs/shared-config/src/lib/env.ts`:
```typescript
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_PRIVATE_KEY_PATH: z.string().min(1),
  JWT_PUBLIC_KEY_PATH: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')}`
    );
  }
  return result.data;
}
```

อัปเดต `libs/shared-config/src/index.ts`:
```typescript
export * from './lib/env';
```

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test shared-config
```
ผลลัพธ์ที่คาดหวัง: PASS (3 tests)

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git add libs/shared-config package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(shared-config): add zod-validated environment loader

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `libs/auth-guards` — guard สำหรับเช็ค claims จาก Kong และ guard เช็ค role

**ไฟล์:**
- สร้าง: `libs/auth-guards/src/lib/kong-claims.guard.ts`
- สร้าง: `libs/auth-guards/src/lib/kong-claims.guard.spec.ts`
- สร้าง: `libs/auth-guards/src/lib/roles.guard.ts`
- สร้าง: `libs/auth-guards/src/lib/roles.guard.spec.ts`
- สร้าง: `libs/auth-guards/src/lib/roles.decorator.ts`
- แก้ไข: `libs/auth-guards/src/index.ts`

**Interface:**
- Consumes: `UserRole`, `isUserRole` จาก `@ecommerce/shared-types` (Task 2)
- ผลลัพธ์: `KongClaimsGuard` (อ่าน header `x-consumer-custom-id` / `x-user-role` แล้วตั้งค่า `request.user`), `RolesGuard` (อ่าน metadata จาก `@Roles(...)`), decorator `Roles(...roles: UserRole[])` — นี่คือสิ่งที่ทุก service ในอนาคต (catalog-service, order-service, ...) จะ import ไปใช้บังคับสิทธิ์ signature ห้ามเปลี่ยนโดยไม่แก้ Task 5 ของแผนนี้และ Plan 2 ตามไปด้วย

- [ ] **ขั้นตอนที่ 1: สร้าง library**

```bash
pnpm nx g @nx/js:lib auth-guards --directory=libs/auth-guards --bundler=tsc --unitTestRunner=jest --importPath=@ecommerce/auth-guards
pnpm add @nestjs/common @nestjs/core reflect-metadata rxjs
```

- [ ] **ขั้นตอนที่ 2: เขียน failing test**

สร้าง `libs/auth-guards/src/lib/kong-claims.guard.spec.ts`:
```typescript
import { ExecutionContext } from '@nestjs/common';
import { KongClaimsGuard } from './kong-claims.guard';

function makeContext(headers: Record<string, string>): ExecutionContext {
  const request: any = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('KongClaimsGuard', () => {
  const guard = new KongClaimsGuard();

  it('rejects when headers are missing', () => {
    expect(guard.canActivate(makeContext({}))).toBe(false);
  });

  it('rejects when role header is not a valid UserRole', () => {
    const ctx = makeContext({ 'x-consumer-custom-id': 'u1', 'x-user-role': 'BOSS' });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('accepts valid headers and attaches request.user', () => {
    const ctx = makeContext({ 'x-consumer-custom-id': 'u1', 'x-user-role': 'SELLER' });
    expect(guard.canActivate(ctx)).toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.user).toEqual({ userId: 'u1', role: 'SELLER' });
  });
});
```

สร้าง `libs/auth-guards/src/lib/roles.guard.spec.ts`:
```typescript
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

function makeContext(role: string | undefined, requiredRoles?: string[]): ExecutionContext {
  const request: any = { user: role ? { userId: 'u1', role } : undefined };
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext & { __reflector: Reflector };
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext('CUSTOMER', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when the user role matches', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SELLER', 'ADMIN']);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext('SELLER');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when the user role does not match', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext('CUSTOMER');
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
```
หมายเหตุ: `ROLES_KEY` ที่ import จาก `./roles.decorator` — mock ด้านบนข้าม logic การอ่าน metadata จริงของ reflector ไปแล้ว ดังนั้น constant ตัวนี้แค่ต้องมีอยู่จริงและถูก export ออกมาก็พอ

- [ ] **ขั้นตอนที่ 2: รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test auth-guards
```
ผลลัพธ์ที่คาดหวัง: FAIL — `Cannot find module './kong-claims.guard'` เป็นต้น

- [ ] **ขั้นตอนที่ 3: เขียน implementation**

สร้าง `libs/auth-guards/src/lib/roles.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@ecommerce/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

สร้าง `libs/auth-guards/src/lib/kong-claims.guard.ts`:
```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isUserRole } from '@ecommerce/shared-types';

@Injectable()
export class KongClaimsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-consumer-custom-id'];
    const role = request.headers['x-user-role'];

    if (!userId || !role || !isUserRole(role)) {
      return false;
    }

    request.user = { userId, role };
    return true;
  }
}
```

สร้าง `libs/auth-guards/src/lib/roles.guard.ts`:
```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@ecommerce/shared-types';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    return requiredRoles.includes(request.user?.role);
  }
}
```

อัปเดต `libs/auth-guards/src/index.ts`:
```typescript
export * from './lib/kong-claims.guard';
export * from './lib/roles.guard';
export * from './lib/roles.decorator';
```

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test auth-guards
```
ผลลัพธ์ที่คาดหวัง: PASS (6 tests)

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git add libs/auth-guards package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(auth-guards): add Kong claims guard and role-based guard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `libs/tools/service-generator` — custom Nx generator สำหรับสร้าง service ใหม่

**ไฟล์:**
- สร้าง: `libs/tools/service-generator/src/generators/service/schema.json`
- สร้าง: `libs/tools/service-generator/src/generators/service/schema.d.ts`
- สร้าง: `libs/tools/service-generator/src/generators/service/generator.ts`
- สร้าง: `libs/tools/service-generator/src/generators/service/generator.spec.ts`
- สร้าง: `libs/tools/service-generator/src/generators/service/files/src/app/health/health.controller.ts`
- สร้าง: `libs/tools/service-generator/src/generators/service/files/Dockerfile`
- แก้ไข: `libs/tools/service-generator/generators.json`

**Interface:**
- ผลลัพธ์: คำสั่ง `nx g @ecommerce/service-generator:service --name=<service-name>` — จะสร้าง NestJS app ที่ `apps/<service-name>` (ผ่าน application generator ของ `@nx/nest`) พร้อม `HealthController` (`GET /health` → `{ status: 'ok' }`) และ `Dockerfile` ทั้ง Task 6 ในแผนนี้ และ task ของ catalog-service ใน Plan 2 ต้องพึ่งคำสั่งนี้ให้ทำงานได้

- [ ] **ขั้นตอนที่ 1: Scaffold ตัว plugin และ generator**

```bash
pnpm add -D @nx/plugin @nx/nest
pnpm nx g @nx/plugin:plugin tools --directory=libs/tools --importPath=@ecommerce/service-generator
pnpm nx g @nx/plugin:generator service --project=tools
```
ผลลัพธ์ที่คาดหวัง: สร้าง `libs/tools/service-generator/src/generators/service/{schema.json,schema.d.ts,generator.ts,generator.spec.ts}` และลงทะเบียนไว้ใน `libs/tools/service-generator/generators.json`

- [ ] **ขั้นตอนที่ 2: เขียน failing test ของ generator**

แทนที่ `libs/tools/service-generator/src/generators/service/generator.spec.ts`:
```typescript
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { serviceGenerator } from './generator';

describe('service generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('generates a NestJS app with a health controller and Dockerfile', async () => {
    await serviceGenerator(tree, { name: 'ping-service' });

    expect(tree.exists('apps/ping-service/src/main.ts')).toBe(true);
    expect(tree.exists('apps/ping-service/src/app/health/health.controller.ts')).toBe(true);
    expect(tree.exists('apps/ping-service/Dockerfile')).toBe(true);

    const health = tree.read(
      'apps/ping-service/src/app/health/health.controller.ts',
      'utf-8'
    );
    expect(health).toContain('HealthController');
    expect(health).toContain("'health'");
  });
});
```

- [ ] **ขั้นตอนที่ 2: รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test service-generator
```
ผลลัพธ์ที่คาดหวัง: FAIL — ไฟล์ health controller / Dockerfile ยังไม่มี

- [ ] **ขั้นตอนที่ 3: เขียน implementation ของ generator**

แทนที่ `libs/tools/service-generator/src/generators/service/schema.json`:
```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "Service",
  "title": "Generate a NestJS backend service",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Service name, e.g. catalog-service",
      "$default": { "$source": "argv", "index": 0 },
      "x-prompt": "What name would you like to use for the service?"
    }
  },
  "required": ["name"]
}
```

แทนที่ `libs/tools/service-generator/src/generators/service/schema.d.ts`:
```typescript
export interface ServiceGeneratorSchema {
  name: string;
}
```

แทนที่ `libs/tools/service-generator/src/generators/service/generator.ts`:
```typescript
import { Tree, formatFiles, generateFiles, joinPathFragments } from '@nx/devkit';
import { applicationGenerator as nestApplicationGenerator } from '@nx/nest';
import { ServiceGeneratorSchema } from './schema';

export async function serviceGenerator(tree: Tree, options: ServiceGeneratorSchema) {
  await nestApplicationGenerator(tree, {
    directory: `apps/${options.name}`,
    name: options.name,
  });

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    `apps/${options.name}`,
    { name: options.name }
  );

  await formatFiles(tree);
}

export default serviceGenerator;
```

สร้าง `libs/tools/service-generator/src/generators/service/files/src/app/health/health.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

สร้าง `libs/tools/service-generator/src/generators/service/files/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm nx build <%= name %>

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/apps/<%= name %> ./
EXPOSE 3000
CMD ["node", "main.js"]
```

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test service-generator
```
ผลลัพธ์ที่คาดหวัง: PASS (1 test)

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git add libs/tools
git commit -m "$(cat <<'EOF'
feat(service-generator): add custom Nx generator for backend services

Scaffolds a NestJS app with a health endpoint and Dockerfile so every
service (auth, catalog, order, payment, gacha) shares the same shape.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: สร้าง `auth-service` และเชื่อม health controller

**ไฟล์:**
- สร้าง: `apps/auth-service/` (ผ่าน generator จาก Task 5)
- แก้ไข: `apps/auth-service/src/app/app.module.ts` (import `HealthController`)
- สร้าง: `apps/auth-service/src/app/app.e2e.spec.ts`

**Interface:**
- Consumes: `serviceGenerator` (Task 5)
- ผลลัพธ์: NestJS app ที่รันด้วย env var `PORT`, `GET /health` → `200 { status: 'ok' }` — นี่คือ app ที่ทุก auth task ถัดไป (7-11) จะเพิ่ม module เข้าไป

- [ ] **ขั้นตอนที่ 1: เขียน failing e2e test**

สร้าง `apps/auth-service/src/app/app.e2e.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **ขั้นตอนที่ 2: สร้าง app แล้วรัน test เพื่อดูว่า fail**

```bash
pnpm nx g @ecommerce/service-generator:service --name=auth-service
pnpm add -D supertest @types/supertest
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: FAIL — `HealthController` ยังไม่ได้ลงทะเบียนใน `AppModule` (ได้ 404 ที่ `/health`)

- [ ] **ขั้นตอนที่ 3: ลบ controller เริ่มต้นที่ generator สร้างมาให้ แล้วลงทะเบียน health controller**

application generator ของ `@nx/nest` (ที่ถูกเรียกใช้ภายใน `service-generator`) จะ scaffold `app.controller.ts`, `app.service.ts` และไฟล์ spec ของมันมาให้ ซึ่งเราไม่ต้องใช้:
```bash
rm apps/auth-service/src/app/app.controller.ts \
   apps/auth-service/src/app/app.controller.spec.ts \
   apps/auth-service/src/app/app.service.ts
```

แก้ไข `apps/auth-service/src/app/app.module.ts` ให้ใช้ health controller ที่ generator สร้างมาให้แทน:
```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
```

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: PASS (1 test)

- [ ] **ขั้นตอนที่ 5: ตรวจสอบว่า app บูตได้จริง**

```bash
PORT=3001 pnpm nx serve auth-service &
sleep 3
curl -s http://localhost:3001/health
kill %1
```
ผลลัพธ์ที่คาดหวัง: `{"status":"ok"}`

- [ ] **ขั้นตอนที่ 6: Commit**

```bash
git add apps/auth-service
git commit -m "$(cat <<'EOF'
feat(auth-service): scaffold app via service-generator with health check

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Prisma schema และการเชื่อมต่อฐานข้อมูลของ auth-service

**ไฟล์:**
- สร้าง: `apps/auth-service/prisma/schema.prisma`
- สร้าง: `apps/auth-service/src/prisma/prisma.service.ts`
- สร้าง: `apps/auth-service/src/prisma/prisma.service.spec.ts`
- แก้ไข: `package.json` ที่ root (เพิ่ม `prisma`, `@prisma/client`)

**Interface:**
- ผลลัพธ์: `PrismaService` (extend จาก `PrismaClient` ที่ generate มา, implement `OnModuleInit`/`OnModuleDestroy` เพื่อ connect/disconnect), model `User` และ `Seller` — Task 8 (register) และ Task 9 (login) ต้องพึ่ง `PrismaService.user`

- [ ] **ขั้นตอนที่ 1: เพิ่ม Prisma และเขียน schema**

```bash
pnpm add -D prisma
pnpm add @prisma/client
```

สร้าง `apps/auth-service/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../../../libs/prisma-client-auth/src/generated"
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String?
  oauthProvider String?
  oauthId       String?
  role          Role     @default(CUSTOMER)
  createdAt     DateTime @default(now())
  seller        Seller?

  @@unique([oauthProvider, oauthId])
}

model Seller {
  id        String       @id @default(uuid())
  userId    String       @unique
  user      User         @relation(fields: [userId], references: [id])
  storeName String
  status    SellerStatus @default(ACTIVE)
}

enum Role {
  CUSTOMER
  SELLER
  ADMIN
}

enum SellerStatus {
  ACTIVE
  SUSPENDED
}
```

- [ ] **ขั้นตอนที่ 2: ตั้ง Postgres เครื่อง local สำหรับ auth-service แล้วรัน migration**

```bash
docker run -d --name ecommerce-auth-db \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=auth \
  -p 5433:5432 postgres:16
sleep 3
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/auth"
npx prisma migrate dev --schema=apps/auth-service/prisma/schema.prisma --name init
```
ผลลัพธ์ที่คาดหวัง: แสดงข้อความ `Your database is now in sync with your schema` และ generate client ไว้ที่ `libs/prisma-client-auth/src/generated`

- [ ] **ขั้นตอนที่ 3: เขียน failing test สำหรับ `PrismaService`**

สร้าง `apps/auth-service/src/prisma/prisma.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects and can query the User table', async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5433/auth';

    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    const prisma = moduleRef.get(PrismaService);
    await prisma.onModuleInit();
    const count = await prisma.user.count();
    expect(typeof count).toBe('number');
    await prisma.onModuleDestroy();
  });
});
```

- [ ] **ขั้นตอนที่ 2 (ซ้ำ): รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: FAIL — `Cannot find module './prisma.service'`

- [ ] **ขั้นตอนที่ 4: เขียน implementation ของ `PrismaService`**

สร้าง `apps/auth-service/src/prisma/prisma.service.ts`:
```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@ecommerce/prisma-client-auth';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

เพิ่ม path mapping ใน `tsconfig.base.json` (เพิ่มเข้าไปใน `"paths"`):
```json
"@ecommerce/prisma-client-auth": ["libs/prisma-client-auth/src/generated"]
```

- [ ] **ขั้นตอนที่ 5: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: PASS (2 tests รวม — health + Prisma)

- [ ] **ขั้นตอนที่ 6: Commit**

```bash
git add apps/auth-service tsconfig.base.json package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(auth-service): add Prisma schema (User, Seller) and PrismaService

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: คู่กุญแจ JWT แบบ RS256 และตัวโหลดกุญแจใน `shared-config`

**ไฟล์:**
- สร้าง: `secrets/jwt-private.pem`, `secrets/jwt-public.pem` (ใช้ local dev เท่านั้น อยู่ใน gitignore)
- แก้ไข: `.gitignore`
- สร้าง: `libs/shared-config/src/lib/jwt-keys.ts`
- สร้าง: `libs/shared-config/src/lib/jwt-keys.spec.ts`
- แก้ไข: `libs/shared-config/src/index.ts`

**Interface:**
- ผลลัพธ์: `loadJwtKeys(env: Env): { privateKey: string; publicKey: string }` — อ่านไฟล์ PEM จาก path ที่อยู่ใน `Env` ทั้ง Task 9 (login เซ็นด้วย `privateKey`) และ config ของ Kong ใน Plan 2 (ตรวจสอบด้วย `publicKey`) ต้องใช้รูปแบบนี้

- [ ] **ขั้นตอนที่ 1: สร้างคู่กุญแจแล้วสั่งให้ git ไม่สนใจไฟล์นี้**

```bash
mkdir -p secrets
openssl genrsa -out secrets/jwt-private.pem 2048
openssl rsa -in secrets/jwt-private.pem -pubout -out secrets/jwt-public.pem
echo "secrets/" >> .gitignore
```

- [ ] **ขั้นตอนที่ 2: เขียน failing test**

สร้าง `libs/shared-config/src/lib/jwt-keys.spec.ts`:
```typescript
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadJwtKeys } from './jwt-keys';

describe('loadJwtKeys', () => {
  it('reads private and public key files from disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jwt-test-'));
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, 'FAKE-PRIVATE-KEY');
    writeFileSync(publicPath, 'FAKE-PUBLIC-KEY');

    const keys = loadJwtKeys({
      JWT_PRIVATE_KEY_PATH: privatePath,
      JWT_PUBLIC_KEY_PATH: publicPath,
    } as any);

    expect(keys.privateKey).toBe('FAKE-PRIVATE-KEY');
    expect(keys.publicKey).toBe('FAKE-PUBLIC-KEY');
  });

  it('throws a readable error when a key file does not exist', () => {
    expect(() =>
      loadJwtKeys({
        JWT_PRIVATE_KEY_PATH: '/nonexistent/private.pem',
        JWT_PUBLIC_KEY_PATH: '/nonexistent/public.pem',
      } as any)
    ).toThrow(/Could not read JWT key file/);
  });
});
```

- [ ] **ขั้นตอนที่ 2: รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test shared-config
```
ผลลัพธ์ที่คาดหวัง: FAIL — `Cannot find module './jwt-keys'`

- [ ] **ขั้นตอนที่ 3: เขียน implementation ของ `loadJwtKeys`**

สร้าง `libs/shared-config/src/lib/jwt-keys.ts`:
```typescript
import { readFileSync } from 'fs';
import type { Env } from './env';

export interface JwtKeys {
  privateKey: string;
  publicKey: string;
}

function readKeyFile(path: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch (error) {
    throw new Error(`Could not read JWT key file at ${path}: ${(error as Error).message}`);
  }
}

export function loadJwtKeys(env: Pick<Env, 'JWT_PRIVATE_KEY_PATH' | 'JWT_PUBLIC_KEY_PATH'>): JwtKeys {
  return {
    privateKey: readKeyFile(env.JWT_PRIVATE_KEY_PATH),
    publicKey: readKeyFile(env.JWT_PUBLIC_KEY_PATH),
  };
}
```

อัปเดต `libs/shared-config/src/index.ts`:
```typescript
export * from './lib/env';
export * from './lib/jwt-keys';
```

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test shared-config
```
ผลลัพธ์ที่คาดหวัง: PASS (5 tests รวม)

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git add libs/shared-config secrets/.gitkeep .gitignore 2>/dev/null; git add -A ':!secrets/*.pem'
git commit -m "$(cat <<'EOF'
feat(shared-config): add RS256 JWT key file loader

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Endpoint สมัครสมาชิก (`POST /auth/register`)

**ไฟล์:**
- สร้าง: `apps/auth-service/src/app/auth/dto/register.dto.ts`
- สร้าง: `apps/auth-service/src/app/auth/auth.service.ts`
- สร้าง: `apps/auth-service/src/app/auth/auth.service.spec.ts`
- สร้าง: `apps/auth-service/src/app/auth/auth.controller.ts`
- แก้ไข: `apps/auth-service/src/app/app.module.ts`
- แก้ไข: `package.json` ที่ root (เพิ่ม `bcrypt`, `class-validator`, `class-transformer`)

**Interface:**
- Consumes: `PrismaService` (Task 7)
- ผลลัพธ์: `AuthService.register(dto: RegisterDto): Promise<{ id: string; email: string; role: UserRole }>` — throw `ConflictException` เมื่ออีเมลซ้ำ `POST /auth/register` คืนค่า `201` พร้อมข้อมูลรูปแบบเดียวกัน Task 10 (login) และ Task 11 (OAuth) จะอยู่ใน `AuthService` ตัวเดียวกันนี้

- [ ] **ขั้นตอนที่ 1: เพิ่ม dependency แล้วเขียน DTO**

```bash
pnpm add bcrypt class-validator class-transformer
pnpm add -D @types/bcrypt
```

สร้าง `apps/auth-service/src/app/auth/dto/register.dto.ts`:
```typescript
import { IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}
```

- [ ] **ขั้นตอนที่ 2: เขียน failing unit test**

สร้าง `apps/auth-service/src/app/auth/auth.service.spec.ts`:
```typescript
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

function makePrismaMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      ...overrides,
    },
  } as any;
}

describe('AuthService.register', () => {
  it('creates a user with a bcrypt-hashed password, never the plaintext', async () => {
    const prisma = makePrismaMock();
    prisma.user.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'u1', email: data.email, passwordHash: data.passwordHash, role: 'CUSTOMER' })
    );
    const service = new AuthService(prisma, {} as any);

    const result = await service.register({ email: 'a@b.com', password: 'password123' });

    expect(result).toEqual({ id: 'u1', email: 'a@b.com', role: 'CUSTOMER' });
    const createArgs = prisma.user.create.mock.calls[0][0];
    expect(createArgs.data.passwordHash).not.toBe('password123');
    expect(createArgs.data.passwordHash.length).toBeGreaterThan(20);
  });

  it('throws ConflictException when the email already exists', async () => {
    const prisma = makePrismaMock();
    prisma.user.create.mockRejectedValue({ code: 'P2002' });
    const service = new AuthService(prisma, {} as any);

    await expect(
      service.register({ email: 'dup@b.com', password: 'password123' })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **ขั้นตอนที่ 2: รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: FAIL — `Cannot find module './auth.service'`

- [ ] **ขั้นตอนที่ 3: เขียน implementation ของ `AuthService.register` และ controller**

สร้าง `apps/auth-service/src/app/auth/auth.service.ts`:
```typescript
import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@ecommerce/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtKeys: { privateKey: string; publicKey: string }
  ) {}

  async register(dto: RegisterDto): Promise<{ id: string; email: string; role: UserRole }> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, passwordHash },
      });
      return { id: user.id, email: user.email, role: user.role as UserRole };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }
}
```

สร้าง `apps/auth-service/src/app/auth/auth.controller.ts`:
```typescript
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
```

แก้ไข `apps/auth-service/src/app/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { loadEnv, loadJwtKeys } from '@ecommerce/shared-config';
import { HealthController } from './health/health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';

const env = loadEnv();
const jwtKeys = loadJwtKeys(env);

@Module({
  controllers: [HealthController, AuthController],
  providers: [
    PrismaService,
    { provide: 'JWT_KEYS', useValue: jwtKeys },
    {
      provide: AuthService,
      useFactory: (prisma: PrismaService) => new AuthService(prisma, jwtKeys),
      inject: [PrismaService],
    },
  ],
})
export class AppModule {}
```

เปิด global validation ใน `apps/auth-service/src/main.ts` (เพิ่มหลัง `NestFactory.create`):
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```
(เพิ่ม `import { ValidationPipe } from '@nestjs/common';` ที่ด้านบนของไฟล์)

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: PASS (4 tests รวม)

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git add apps/auth-service package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(auth-service): add POST /auth/register with bcrypt password hashing

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Endpoint ล็อกอิน (`POST /auth/login`) ที่ออก JWT แบบ RS256

**ไฟล์:**
- สร้าง: `apps/auth-service/src/app/auth/dto/login.dto.ts`
- แก้ไข: `apps/auth-service/src/app/auth/auth.service.ts`
- แก้ไข: `apps/auth-service/src/app/auth/auth.service.spec.ts`
- แก้ไข: `apps/auth-service/src/app/auth/auth.controller.ts`
- แก้ไข: `package.json` ที่ root (เพิ่ม `jsonwebtoken`, `@types/jsonwebtoken`)

**Interface:**
- Consumes: `AuthService` จาก Task 9, `jwtKeys` (Task 8)
- ผลลัพธ์: `AuthService.login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }>` — throw `UnauthorizedException` เมื่อ credential ผิด payload ของ access token คือ `{ sub: userId, role }` เซ็นด้วย RS256 หมดอายุใน 15 นาที ส่วน refresh token หมดอายุใน 7 วัน `POST /auth/login` คืนค่า `200` พร้อมข้อมูลรูปแบบเดียวกัน

- [ ] **ขั้นตอนที่ 1: เพิ่ม jsonwebtoken แล้วเขียน DTO**

```bash
pnpm add jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

สร้าง `apps/auth-service/src/app/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @MinLength(1)
  password!: string;
}
```

- [ ] **ขั้นตอนที่ 2: เขียน failing unit test**

เพิ่มเข้าไปใน `apps/auth-service/src/app/auth/auth.service.spec.ts`:
```typescript
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

describe('AuthService.login', () => {
  const privateKey = /* generated in Task 8 */ require('fs').readFileSync('secrets/jwt-private.pem', 'utf-8');
  const publicKey = require('fs').readFileSync('secrets/jwt-public.pem', 'utf-8');

  it('returns signed tokens for correct credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
        role: 'CUSTOMER',
      }),
    });
    const service = new AuthService(prisma, { privateKey, publicKey });

    const { accessToken } = await service.login({ email: 'a@b.com', password: 'correct-password' });

    const decoded = jwt.verify(accessToken, publicKey, { algorithms: ['RS256'] }) as any;
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe('CUSTOMER');
  });

  it('rejects an incorrect password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash, role: 'CUSTOMER' }),
    });
    const service = new AuthService(prisma, { privateKey, publicKey });

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong-password' })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email', async () => {
    const prisma = makePrismaMock({ findUnique: jest.fn().mockResolvedValue(null) });
    const service = new AuthService(prisma, { privateKey, publicKey });

    await expect(
      service.login({ email: 'nobody@b.com', password: 'anything' })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```
(`makePrismaMock` ตรงนี้ต้อง override `user.findUnique` ต่อ test — ใช้ helper ตัวเดียวกับที่นิยามไว้แล้วในไฟล์นี้จาก Task 9)

- [ ] **ขั้นตอนที่ 2: รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: FAIL — `AuthService.login is not a function`

- [ ] **ขั้นตอนที่ 3: เขียน implementation ของ `login`**

เพิ่มเข้าไปใน `apps/auth-service/src/app/auth/auth.service.ts` (ในคลาส `AuthService` ต่อจาก `register`):
```typescript
  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = jwt.sign(payload, this.jwtKeys.privateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
    });
    const refreshToken = jwt.sign(payload, this.jwtKeys.privateKey, {
      algorithm: 'RS256',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
```
แทนที่กลุ่ม import ที่ด้านบนของ `apps/auth-service/src/app/auth/auth.service.ts` ด้วย:
```typescript
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '@ecommerce/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
```
constructor signature ยังคงเป็น `constructor(private readonly prisma: PrismaService, private readonly jwtKeys: { privateKey: string; publicKey: string })` เหมือนใน Task 9 — ไม่เปลี่ยน

เพิ่มเข้าไปใน `apps/auth-service/src/app/auth/auth.controller.ts`:
```typescript
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
```
แทนที่กลุ่ม import ที่ด้านบนของ `apps/auth-service/src/app/auth/auth.controller.ts` ด้วย:
```typescript
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
```

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: PASS (7 tests รวม)

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git add apps/auth-service package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(auth-service): add POST /auth/login issuing RS256 JWTs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: OAuth login (Google + Facebook)

**ไฟล์:**
- แก้ไข: `apps/auth-service/src/app/auth/auth.service.ts`
- สร้าง: `apps/auth-service/src/app/auth/auth.service.oauth.spec.ts`
- สร้าง: `apps/auth-service/src/app/auth/strategies/google.strategy.ts`
- สร้าง: `apps/auth-service/src/app/auth/strategies/facebook.strategy.ts`
- แก้ไข: `apps/auth-service/src/app/auth/auth.controller.ts`
- แก้ไข: `apps/auth-service/src/app/app.module.ts`
- แก้ไข: `package.json` ที่ root (เพิ่ม `passport`, `passport-google-oauth20`, `passport-facebook`, `@nestjs/passport`)

**Interface:**
- Consumes: `AuthService`, `PrismaService`
- ผลลัพธ์: `AuthService.findOrCreateOAuthUser(provider: 'google' | 'facebook', oauthId: string, email: string): Promise<{ id: string; email: string; role: UserRole }>` เส้นทาง `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/facebook`, `GET /auth/facebook/callback`

- [ ] **ขั้นตอนที่ 1: เพิ่ม dependency สำหรับ OAuth**

```bash
pnpm add passport passport-google-oauth20 passport-facebook @nestjs/passport
pnpm add -D @types/passport-google-oauth20 @types/passport-facebook
```

- [ ] **ขั้นตอนที่ 2: เขียน failing unit test สำหรับการผูกบัญชี**

สร้าง `apps/auth-service/src/app/auth/auth.service.oauth.spec.ts`:
```typescript
import { AuthService } from './auth.service';

function makePrismaMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      ...overrides,
    },
  } as any;
}

describe('AuthService.findOrCreateOAuthUser', () => {
  it('returns the existing user when provider+oauthId already linked', async () => {
    const prisma = makePrismaMock({
      findFirst: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', role: 'CUSTOMER' }),
    });
    const service = new AuthService(prisma, {} as any);

    const result = await service.findOrCreateOAuthUser('google', 'g-123', 'a@b.com');

    expect(result).toEqual({ id: 'u1', email: 'a@b.com', role: 'CUSTOMER' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a new CUSTOMER user when no match exists', async () => {
    const prisma = makePrismaMock({
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'u2', email: 'new@b.com', role: 'CUSTOMER' }),
    });
    const service = new AuthService(prisma, {} as any);

    const result = await service.findOrCreateOAuthUser('facebook', 'fb-456', 'new@b.com');

    expect(result).toEqual({ id: 'u2', email: 'new@b.com', role: 'CUSTOMER' });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'new@b.com', oauthProvider: 'facebook', oauthId: 'fb-456', role: 'CUSTOMER' },
    });
  });
});
```

- [ ] **ขั้นตอนที่ 2: รัน test เพื่อยืนยันว่า fail**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: FAIL — `findOrCreateOAuthUser is not a function`

- [ ] **ขั้นตอนที่ 3: เขียน implementation ของ `findOrCreateOAuthUser` และ Passport strategies**

เพิ่มเข้าไปใน `apps/auth-service/src/app/auth/auth.service.ts` (ในคลาส `AuthService` ต่อจาก `login`):
```typescript
  async findOrCreateOAuthUser(
    provider: 'google' | 'facebook',
    oauthId: string,
    email: string
  ): Promise<{ id: string; email: string; role: UserRole }> {
    const existing = await this.prisma.user.findFirst({
      where: { oauthProvider: provider, oauthId },
    });
    if (existing) {
      return { id: existing.id, email: existing.email, role: existing.role as UserRole };
    }

    const created = await this.prisma.user.create({
      data: { email, oauthProvider: provider, oauthId, role: 'CUSTOMER' },
    });
    return { id: created.id, email: created.email, role: created.role as UserRole };
  }
```

สร้าง `apps/auth-service/src/app/auth/strategies/google.strategy.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback) {
    done(null, { oauthId: profile.id, email: profile.emails[0].value });
  }
}
```
(ค่า `'placeholder'` ที่ใส่ไว้เป็นค่า fallback เมื่อยังไม่ได้ตั้งค่า Google OAuth app จริง — app จะบูตได้ปกติในเครื่อง dev แต่การล็อกอินผ่าน Google จริงจะใช้ไม่ได้จนกว่าจะตั้งค่า `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` จริง)

สร้าง `apps/auth-service/src/app/auth/strategies/facebook.strategy.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_APP_ID || 'placeholder',
      clientSecret: process.env.FACEBOOK_APP_SECRET || 'placeholder',
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3001/auth/facebook/callback',
      profileFields: ['id', 'emails'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user: any) => void) {
    done(null, { oauthId: profile.id, email: profile.emails[0].value });
  }
}
```

เพิ่มเข้าไปใน `apps/auth-service/src/app/auth/auth.controller.ts`:
```typescript
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any) {
    const user = await this.authService.findOrCreateOAuthUser('google', req.user.oauthId, req.user.email);
    return this.authService.issueTokensFor(user.id, user.role);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: any) {
    const user = await this.authService.findOrCreateOAuthUser('facebook', req.user.oauthId, req.user.email);
    return this.authService.issueTokensFor(user.id, user.role);
  }
```
แทนที่กลุ่ม import ที่ด้านบนของ `apps/auth-service/src/app/auth/auth.controller.ts` ด้วย:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
```

เพิ่ม method เล็กๆ ใน `AuthService` เพื่อให้ `login` และ OAuth callback ใช้ตัวออก token ร่วมกัน (แล้วแก้ `login` ให้เรียกใช้ method นี้แทนที่จะสร้าง payload/jwt.sign เอง):
```typescript
  issueTokensFor(userId: string, role: UserRole): { accessToken: string; refreshToken: string } {
    const payload = { sub: userId, role };
    const accessToken = jwt.sign(payload, this.jwtKeys.privateKey, { algorithm: 'RS256', expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, this.jwtKeys.privateKey, { algorithm: 'RS256', expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
```
ใน `login` ให้แทนที่ส่วน `payload`/`jwt.sign` เดิมด้วย `return this.issueTokensFor(user.id, user.role as UserRole);`

แทนที่ `apps/auth-service/src/app/app.module.ts` ด้วย:
```typescript
import { Module } from '@nestjs/common';
import { loadEnv, loadJwtKeys } from '@ecommerce/shared-config';
import { HealthController } from './health/health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { GoogleStrategy } from './auth/strategies/google.strategy';
import { FacebookStrategy } from './auth/strategies/facebook.strategy';

const env = loadEnv();
const jwtKeys = loadJwtKeys(env);

@Module({
  controllers: [HealthController, AuthController],
  providers: [
    PrismaService,
    { provide: 'JWT_KEYS', useValue: jwtKeys },
    {
      provide: AuthService,
      useFactory: (prisma: PrismaService) => new AuthService(prisma, jwtKeys),
      inject: [PrismaService],
    },
    GoogleStrategy,
    FacebookStrategy,
  ],
})
export class AppModule {}
```

- [ ] **ขั้นตอนที่ 4: รัน test เพื่อยืนยันว่าผ่าน**

```bash
pnpm nx test auth-service
```
ผลลัพธ์ที่คาดหวัง: PASS (9 tests รวม)

- [ ] **ขั้นตอนที่ 5: Commit**

```bash
git add apps/auth-service package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(auth-service): add Google and Facebook OAuth login

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## ตรวจสอบ: Foundation เสร็จสมบูรณ์แล้ว

```bash
pnpm nx run-many -t test
```
ผลลัพธ์ที่คาดหวัง: ทุกโปรเจกต์ (`shared-types`, `shared-config`, `auth-guards`, `service-generator`, `auth-service`) ผ่านหมด

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/auth" \
JWT_PRIVATE_KEY_PATH=secrets/jwt-private.pem \
JWT_PUBLIC_KEY_PATH=secrets/jwt-public.pem \
PORT=3001 pnpm nx serve auth-service &
sleep 3
curl -s -X POST http://localhost:3001/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123"}'
curl -s -X POST http://localhost:3001/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123"}'
kill %1
```
ผลลัพธ์ที่คาดหวัง: register คืนค่า `{"id":"...","email":"demo@example.com","role":"CUSTOMER"}`; login คืนค่า `{"accessToken":"...","refreshToken":"..."}`

**สิ่งที่ยังไม่อยู่ในแผนนี้ (จะอยู่ใน Plan 2 — Catalog + Infra):** `catalog-service`, config ของ Kong, `docker-compose.yml`, web app skeleton, data model ของ GachaBox/AccountItem/TopupCode, field-level encryption
