# Notification Service — Design Spec

**วันที่:** 2026-09-15
**สถานะ:** อนุมัติแล้ว (รอ implementation plan)
**อ้างอิงกับ:** [`2026-09-11-foundation-catalog-design.md`](./2026-09-11-foundation-catalog-design.md) — เอกสารนี้ **เปลี่ยนมติ** บางส่วนของเอกสารนั้น (ดูข้อ 12)

---

## 1. เป้าหมาย

เพิ่ม `notification-service` เป็น service ใหม่ในระบบ เพื่อส่ง notification ให้ user โดยเริ่มจาก **push notification ผ่าน Firebase Cloud Messaging (FCM)** ก่อน ออกแบบ interface ให้รองรับ Email/SMS เพิ่มได้ในอนาคตโดยไม่ต้องปรับโครงสร้างใหม่ทั้งหมด

Trigger แรกที่ทำ: แจ้งเตือน user เมื่อมีการ login จากอุปกรณ์ใหม่

## 2. Scope (MVP)

**อยู่ใน scope:**
- `notification-service` ส่ง push ผ่าน FCM (รองรับ Web Push และเผื่อ mobile ในอนาคต ผ่าน token model เดียวกัน)
- `auth-service` track อุปกรณ์ของ user (`Device` model) เพื่อ detect "login จากอุปกรณ์ใหม่" แบบจริงจัง (ไม่ใช่ placeholder)
- สื่อสารระหว่าง service ผ่าน Redis + BullMQ (async queue)

**ไม่อยู่ใน scope (future work — ดูข้อ 11):**
- Email/SMS channel จริง (เตรียม enum/interface ไว้ แต่ไม่ implement sender)
- Mobile app ฝั่ง client (ยังไม่มีในระบบ — เตรียมแค่ device-token model ให้รองรับ platform `IOS`/`ANDROID` ไว้ล่วงหน้า)
- In-app notification, notification history read API
- Dedup ป้องกัน push ซ้ำจาก retry, dashboard/alerting เมื่อส่งล้มเหลวต่อเนื่อง

## 3. Services ที่ได้รับผลกระทบ

| Service/Lib | การเปลี่ยนแปลง |
|---|---|
| `apps/notification-service` (ใหม่) | NestJS app ใหม่ ตาม pattern เดียวกับ `auth-service` — มี Postgres DB ของตัวเอง (`notification`), BullMQ worker, Firebase Admin SDK |
| `apps/auth-service` | เพิ่ม `Device` model, เพิ่ม field `deviceId` ใน `LoginDto`, เพิ่ม logic detect อุปกรณ์ใหม่ + enqueue job |
| `libs/shared-queue` (ใหม่) | เก็บชื่อ queue + payload type ของ job ให้ producer/consumer ใช้ type ร่วมกัน (backend-only, ไม่ใช่ `shared-types` เพราะฝั่งนั้นเป็นของที่ frontend+backend ใช้ร่วมกัน) |
| `libs/prisma-client-notification` (ใหม่) | generated Prisma client ของ `notification-service` ตาม pattern `libs/prisma-client-auth` |
| `docker-compose.yml` | เพิ่ม `redis`, `postgres-notification`, `notification-service` |

รวม backend เป็น 6 services (ไม่นับ Kong) จากเดิม 5 ใน spec หลัก

## 4. Data Model

### 4.1 `auth-service` — เพิ่ม model `Device`

```prisma
model Device {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  deviceId   String   // client-generated UUID เก็บฝั่ง client (localStorage / keychain)
  createdAt  DateTime @default(now())
  lastSeenAt DateTime @updatedAt

  @@unique([userId, deviceId])
}
```

**ทำไมใช้ client-generated `deviceId` แทน fingerprint จาก User-Agent/IP:** UA/IP เปลี่ยนได้บ่อย (proxy, อัปเดต browser) ทำให้ false-positive "อุปกรณ์ใหม่" ง่าย client-generated UUID เสถียรกว่า และใช้ pattern เดียวกันได้ทั้ง web (`localStorage`) และ mobile (Keychain/SharedPreferences) ในอนาคต

`LoginDto` เพิ่ม field `deviceId: string` (required)

### 4.2 `notification-service` — schema ใหม่

```prisma
model DeviceToken {
  id         String   @id @default(uuid())
  userId     String
  token      String   @unique  // FCM registration token
  platform   Platform
  createdAt  DateTime @default(now())
  lastUsedAt DateTime @updatedAt
}

enum Platform {
  WEB
  IOS
  ANDROID
}

model NotificationLog {
  id        String   @id @default(uuid())
  userId    String
  channel   Channel  // PUSH เท่านั้นตอนนี้ เผื่อ EMAIL/SMS ทีหลัง
  title     String
  status    String   // SENT | FAILED
  createdAt DateTime @default(now())
}

enum Channel {
  PUSH
  EMAIL
  SMS
}
```

`NotificationLog` เก็บไว้ debug/audit เท่านั้น ไม่มี read API ใน MVP

## 5. API Endpoints (`notification-service`)

| Endpoint | หน้าที่ | Auth |
|---|---|---|
| `POST /devices` | FE เรียกหลังได้ FCM token จาก browser/app แล้ว `{ token, platform }` → upsert ตาม `token` | JWT (header ที่ Kong forward มา ผ่าน `libs/auth-guards`) |
| `DELETE /devices/:token` | ยกเลิก token (เรียกตอน logout) | JWT |

ไม่มี public endpoint สำหรับ "ส่ง notification" — ทุก trigger เข้าทาง queue เท่านั้น เพื่อให้มี ingestion path เดียว

## 6. Communication: Redis + BullMQ

```ts
// libs/shared-queue
export const PUSH_NOTIFICATION_QUEUE = 'push-notifications';
export interface PushNotificationJob {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}
```

`auth-service` เป็น producer (`queue.add()`), `notification-service` เป็น consumer (BullMQ `Worker` ที่รันอยู่ใน process เดียวกับ Nest app)

**ทำไมเลือก async queue แทน sync REST call:** login response ไม่ต้องรอ push ส่งเสร็จ, มี retry/backoff ในตัวเมื่อ FCM ตอบช้า/ล่มชั่วคราว, และ decouple สองฝั่งเต็มที่ — ถ้า `notification-service` ทั้งตัวล่ม `auth-service` ไม่กระทบเลย

## 7. Data Flow

```
Client → POST /auth/login {email, password, deviceId}
  auth-service: ตรวจ password → หา Device{userId, deviceId}
    ไม่เจอ → upsert Device row + queue.add(PUSH_NOTIFICATION_QUEUE, {userId, title, body})
    (enqueue แบบ fire-and-forget — ไม่รอผลจนจบ ไม่ block response)
  auth-service → คืน accessToken/refreshToken ทันที

notification-service (BullMQ Worker):
  รับ job → หา DeviceToken ทั้งหมดของ userId
    ไม่มี token เลย → log NotificationLog(status=FAILED, reason=no_device_token), ไม่ retry
    มี token → Firebase sendEachForMulticast(...)
      สำเร็จ → log SENT
      token ใช้ไม่ได้แล้ว (uninstall/expired) → ลบ DeviceToken แถวนั้น
      error ชั่วคราว (network/quota) → throw ให้ BullMQ retry (attempts: 3, exponential backoff เริ่ม 5s)
```

## 8. Error Handling

**หลักการ: ห้าม infra ของ notification ทำให้ login พัง**

- Redis ล่มตอน enqueue → catch error, log ไว้เฉย ๆ, login ยัง return สำเร็จตามปกติ (ไม่ throw)
- `notification-service` ทั้งตัวล่ม → ไม่กระทบ `auth-service` เพราะสื่อสารผ่าน queue เท่านั้น
- Firebase token ใช้ไม่ได้แล้ว → ลบออกจาก DB อัตโนมัติเมื่อ send ล้มเหลวด้วย error code นั้น
- Firebase error ชั่วคราว → ปล่อยให้ BullMQ retry ตาม policy ด้านบน

## 9. Testing Strategy

ตามแบบที่ `auth-service` ใช้อยู่แล้ว (Jest, spec ไฟล์ co-located ข้างโค้ด, mock `PrismaService`/external SDK — ไม่ยิง Firebase/Redis จริงใน test)

**`auth-service`:**
- `login()` กับ `deviceId` ใหม่ → เรียก `queue.add()` ด้วย payload ที่ถูกต้อง
- `login()` กับ `deviceId` เดิม → ไม่เรียก `queue.add()`
- `queue.add()` throw error → `login()` ยังคืน token ปกติ

**`notification-service`:**
- `DevicesController`: register token ใหม่ = insert, register token ซ้ำ = update `lastUsedAt` ไม่ insert ซ้ำ
- Push processor (mock Firebase Admin SDK):
  - ส่งสำเร็จทุก token → log `SENT`
  - ไม่มี `DeviceToken` เลย → log `FAILED` (`no_device_token`), ไม่ throw
  - Firebase ตอบ `registration-token-not-registered` → ลบ `DeviceToken` แถวนั้น
  - Firebase ตอบ error อื่น → processor throw เพื่อให้ BullMQ retry

## 10. Infra changes (`docker-compose.yml`)

เพิ่ม 3 services ใหม่ (รูปแบบตาม `postgres-auth`/`auth-service` ที่มีอยู่แล้ว):
- `redis` — image `redis:7`, ไม่มี persistent volume จำเป็น (queue data หายได้ถ้า restart dev — acceptable ใน dev)
- `postgres-notification` — Postgres แยก DB ตาม "one database per service" rule (เหมือน `postgres-auth`)
- `notification-service` — build จาก `apps/notification-service/Dockerfile`, ต้องมี Firebase service-account credentials mount เข้าไป (เก็บใน `secrets/` เหมือน JWT keys)

## 11. Future Work (ไม่ทำตอนนี้)

- Email/SMS channel จริง (มี `Channel` enum เตรียมไว้แล้ว)
- Dedup ป้องกัน push ซ้ำเมื่อ BullMQ retry job ที่จริงส่งสำเร็จไปแล้ว
- Dashboard/alert เมื่อส่ง push ล้มเหลวต่อเนื่อง (ตอนนี้ดูได้แค่จาก `NotificationLog` ตรง ๆ)
- In-app notification, notification history read API
- Mobile app client ฝั่ง registration จริง (API พร้อมรับ `platform: IOS/ANDROID` แล้ว แต่ยังไม่มี client เรียก)

## 12. การเปลี่ยนมติจาก `2026-09-11-foundation-catalog-design.md`

- **ข้อ 5 (Services ทั้งหมด):** เพิ่ม `notification-service` เข้าไปในรายการ services เป็น service ที่ 6
- **ข้อ 9 (External Tools):** เดิมระบุว่า "Redis ยังไม่ใช้เป็น message broker ตอนนี้" — เอกสารนี้เปลี่ยนเป็น **ใช้ Redis + BullMQ เป็น message broker แล้ว** สำหรับ flow `auth-service` → `notification-service` (เหตุผล: ข้อ 6 ด้านบน)
