# Design Doc: E-commerce ขายไอดีเกม/ไอเทมเกม/กล่องสุ่ม

**สถานะ:** ฉบับร่าง รอผู้ใช้ตรวจสอบและอนุมัติ
**Sub-project นี้ครอบคลุม:** Foundation + Catalog (ลำดับที่ 1 จาก 6)
**ทุกหัวข้อที่มีคำว่า "(ข้อเสนอ)"** คือสิ่งที่ผมเลือกให้ตามความเหมาะสม แต่ยังไม่เคยถามคุณตรงๆ — กรุณาอ่านและ confirm/แก้ทีละหัวข้อ

---

## 1. โปรเจกต์นี้คืออะไร

เว็บไซต์ e-commerce สำหรับขาย:
- ไอดีเกม/บัญชีเกม (สินค้า unique ต่อชิ้น มี username/password เฉพาะตัว)
- ไอเทม/เงินในเกม (โค้ด หรือเติมอัตโนมัติ ไม่จำกัดจำนวนตามชิ้น)
- กล่องสุ่ม (gacha box) — จ่ายเงินแล้วสุ่มได้ไอเทม/ไอดีตาม drop rate

เริ่มต้นเป็น **ร้านเดียว (single seller)** แต่ทุก data model ออกแบบให้รองรับ **หลายผู้ขาย (multi-vendor)** ในอนาคตโดยไม่ต้อง migrate โครงสร้างใหม่

---

## 2. ภาพรวม Sub-project ทั้งหมด (roadmap)

| # | Sub-project | สถานะ |
|---|---|---|
| 1 | **Foundation + Catalog** (auth, สินค้า, inventory) | 🔵 กำลัง design (เอกสารนี้) |
| 2 | Order & Payment (ตะกร้า, checkout, payment gateway) | ⚪ ยังไม่เริ่ม |
| 3 | Gacha service (สุ่ม, อัตราสุ่ม, ประวัติ) | ⚪ ยังไม่เริ่ม |
| 4 | Seller/Admin panel | ⚪ ยังไม่เริ่ม |
| 5 | Storefront หน้าเว็บลูกค้าเต็มรูปแบบ | ⚪ ยังไม่เริ่ม |
| 6 | Ops: monitoring, CI/CD เต็มรูปแบบ | ⚪ ยังไม่เริ่ม |

เอกสารนี้ **ออกแบบภาพรวมทั้งระบบ (ทุก service, infra, folder structure)** เพื่อให้เห็นทิศทางทั้งหมด แต่ **จะ implement เฉพาะ sub-project 1** ก่อน

---

## 3. Framework & Tools สรุปรวม

| ส่วน | ตัวเลือก | เหตุผล |
|---|---|---|
| Monorepo tool | **Nx** | ยืนยันจากคุณแล้ว — จัดการ dependency graph, module boundary ระหว่าง services ได้ดี |
| Package manager | **pnpm** (ข้อเสนอ) | ทำงานร่วมกับ Nx workspace ได้ดีที่สุด, ประหยัด disk/เวลา install กว่า npm/yarn |
| Frontend framework | **Next.js + TypeScript** | ยืนยันจากคุณแล้ว |
| Frontend styling | **Tailwind CSS** (ข้อเสนอ) | มาตรฐานคู่กับ Next.js, เขียนเร็ว, ทีมเล็กดูแลง่าย |
| Backend framework | **NestJS + TypeScript** | ยืนยันจากคุณแล้ว, ทำ microservices ได้ในตัว |
| Database | **PostgreSQL + Prisma** | ยืนยันจากคุณแล้ว — transaction/consistency ดีสำหรับ order+inventory |
| Auth | Email/password + Google/Facebook OAuth + JWT | ยืนยันจากคุณแล้ว |
| Inter-service communication | **NestJS TCP microservices transport** (ข้อเสนอ) | ไม่ต้องเพิ่ม infra (Redis/RabbitMQ) ตอนนี้ สลับ transport ทีหลังได้โดยไม่กระทบ business logic |
| Container | **Docker** (ข้อเสนอ) | จำเป็นสำหรับ deploy หลาย services บน VM เดียวกันแบบแยก process |
| API Gateway | **Kong (DB-less mode)** ✅ Confirmed (เปลี่ยนใจจากเดิม — ดูข้อ 8) | ผู้ใช้ต้องการเรียนรู้เครื่องมือใหม่ ใช้แทน NestJS gateway ที่เขียนเอง |

---

## 4. Repo Strategy: Monorepo vs Micro-repo

**เลือก: Monorepo (Nx)**

| ประเด็น | Monorepo | Micro-repo (แยก repo ต่อ service) |
|---|---|---|
| แชร์โค้ด (types, guards, UI) | ทำผ่าน `libs/` ได้ทันที ไม่ต้อง publish package | ต้อง publish เป็น npm package แยก เวอร์ชันซับซ้อนกว่า |
| เปลี่ยน type ที่ frontend+backend ใช้ร่วมกัน | แก้ที่เดียว compiler เตือนทุกจุดที่กระทบ | ต้อง bump version หลาย repo ให้ตรงกัน เสี่ยง out-of-sync |
| CI/CD | ซับซ้อนกว่าเล็กน้อย (ต้องรู้ว่าไฟล์ไหนกระทบ service ไหน — Nx จัดการให้อัตโนมัติ) | แต่ละ repo มี pipeline ของตัวเอง เรียบง่ายกว่า |
| เหมาะกับทีมขนาด | ทีมเล็ก-กลางที่โค้ดยังเปลี่ยนบ่อยร่วมกัน | ทีมใหญ่ที่แต่ละ service เป็นเจ้าของแยกจริงจัง |

**เหตุผลที่เลือก monorepo:** โปรเจกต์นี้ยังอยู่ช่วงเริ่มต้น มีคนพัฒนาไม่มาก และ services ยังต้องแชร์ type/DTO กันบ่อย (เช่น Product shape ที่ catalog-service กับ web ต้องตรงกัน) — monorepo ลดความเสี่ยง sync ผิดพลาดได้มากกว่า

---

## 5. Services ทั้งหมด (target architecture เต็มระบบ)

**หมายเหตุ:** ไม่มี `api-gateway` เป็น NestJS app อีกต่อไป — แทนที่ด้วย **Kong** (ดูข้อ 8) เป็น component แยกที่ config ด้วยไฟล์ ไม่ใช่โค้ดที่เราเขียน

| Service | หน้าที่ | สร้างใน sub-project |
|---|---|---|
| `auth-service` | สมัคร/ล็อกอิน, OAuth, ออก JWT, จัดการ user/seller | 1 |
| `catalog-service` | สินค้า, inventory (ไอดี/ไอเทม/กล่องสุ่ม), หมวดหมู่เกม | 1 |
| `order-service` | ตะกร้า, checkout, สถานะออเดอร์ | 2 |
| `payment-service` | เชื่อม payment gateway ภายนอก, webhook, reconcile การจ่ายเงิน | 2 |
| `gacha-service` | คำนวณสุ่ม, drop rate, ประวัติการสุ่ม | 3 |

**หมายเหตุ (ข้อเสนอ):** ไม่แยก "seller-service" ต่างหาก — ใช้ role-based authorization (`role: SELLER/ADMIN`) ครอบ endpoint ที่มีอยู่ใน catalog/order/gacha service แทน เพื่อไม่ over-engineer ตอนที่ยังมีผู้ขายรายเดียว ถ้าถึงจุดที่ seller ต้องมี logic เฉพาะซับซ้อนมาก (เช่น ระบบ commission หลายชั้น) ค่อยแยกทีหลัง

รวม backend 5 services (2 ตัวแรกสร้างตอนนี้) + Kong (ทำหน้าที่ที่ `api-gateway` เคยทำ)

---

## 6. Frontend Apps

| App | หน้าที่ | สร้างใน sub-project |
|---|---|---|
| `web` | หน้าร้านสำหรับลูกค้า (ดูสินค้า, ซื้อ, สุ่มกล่อง) | 1 (โครง), เต็มรูปแบบใน 5 |
| `admin` | หน้าจัดการสินค้า/ออเดอร์ สำหรับผู้ขาย/แอดมิน | 4 |

แยกเป็นคนละ Next.js app เพราะ user story ต่างกันชัดเจน (ลูกค้า vs ผู้ขาย) และ auth/role ต่างกัน — ไม่ต้องกังวลเรื่อง bundle รวมกันโดยไม่ตั้งใจ

---

## 7. Shared Packages (`libs/`)

| Package | เก็บอะไร | ใครใช้ |
|---|---|---|
| `libs/shared-types` | DTO, enum, interface ที่ frontend+backend ใช้ร่วมกัน (เช่น `ProductType`, `OrderStatus`) | ทุก app/service |
| `libs/shared-config` | env schema (validate ด้วย zod), ค่าคงที่ร่วม | ทุก service |
| `libs/auth-guards` | Guard/decorator ที่อ่าน claims จาก header ที่ Kong ส่งต่อมาหลังตรวจ JWT แล้ว (เช่น `X-Consumer-Custom-ID`, role) แล้วเช็ค role/ownership เฉพาะทางธุรกิจ (เช่น seller เป็นเจ้าของสินค้าชิ้นนี้จริงไหม) | ทุก service |
| `libs/ui` | React component ที่ใช้ร่วมกันระหว่าง `web` และ `admin` (ปุ่ม, การ์ดสินค้า, ฟอร์ม) | web, admin |
| `libs/prisma-client-<service>` (ต่อ service) | generated Prisma client ของแต่ละ service | เฉพาะ service เจ้าของ schema |

---

## 8. API Gateway — ใช้ตัวไหน

**✅ Confirmed (เปลี่ยนจากรอบก่อน): ใช้ Kong แทน `api-gateway` ทั้งหมด** — ผู้ใช้ต้องการเรียนรู้เครื่องมือใหม่ จึงเลือก Kong แทนการเขียน NestJS gateway เอง

### ทำไมถึงเปลี่ยนใจ (เทียบกับตอนแรกที่ไม่ใช้ Kong)

รอบแรกไม่แนะนำ Kong เพราะมันเพิ่มเครื่องมือใหม่ให้เรียนรู้โดยที่ประโยชน์ (routing/JWT-check) ทีมเขียนเองด้วย NestJS ก็ได้อยู่แล้ว — แต่นั่นเป็นการเทียบจาก "ความคุ้มทุนทางวิศวกรรมล้วนๆ" เมื่อเป้าหมายเปลี่ยนเป็น **อยากเรียนรู้เครื่องมือใหม่ด้วย** การเรียนรู้ Kong ก็กลายเป็นประโยชน์อีกอย่างที่ไม่ได้นับในรอบแรก จึงเปลี่ยนคำแนะนำ

### Kong ทำหน้าที่แทน `api-gateway` อย่างไร (แบบที่เลือก = "แบบ A" จากที่คุยกัน)

| หน้าที่เดิมของ `api-gateway` | ใครทำแทน |
|---|---|
| Route request ตาม path ไปยัง service ที่ถูกต้อง | **Kong** (Route + Service object ใน config) |
| ตรวจสอบ JWT (signature, expiry) | **Kong** (JWT plugin) — ตรวจแค่ "token ถูกต้องไหม" ไม่รู้เรื่อง role/ownership |
| Rate limiting, CORS | **Kong** (plugin สำเร็จรูป) |
| เช็ค role (`SELLER`/`ADMIN`) และ ownership (เช่น seller เป็นเจ้าของสินค้าชิ้นนี้จริงไหม) | **แต่ละ service เอง** ผ่าน `libs/auth-guards` (อ่าน claims ที่ Kong forward มาเป็น header) |

Kong **ไม่ได้ทำ** business logic เฉพาะโดเมน (ownership, การคำนวณ, การ orchestrate หลาย service) — logic พวกนี้ยังอยู่ในแต่ละ service เหมือนเดิม ไม่ได้หายไปไหน

### วิธี deploy Kong (ข้อเสนอ)

- ใช้ **Kong DB-less mode**: config ทั้งหมด (routes, services, plugins) อยู่ในไฟล์ `kong/kong.yml` เดียว เก็บใน git เหมือนไฟล์ config อื่น — **ไม่ต้องมี database แยกสำหรับ Kong** (ตัดข้อเสียเรื่อง "ต้องดูแล DB เพิ่ม" ที่เคยกังวลไปตอนแรก)
- แก้ route/plugin = แก้ไฟล์ `kong.yml` แล้ว reload Kong container — ไม่ต้อง redeploy service ใดๆ

### JWT ทำงานร่วมกับ Kong อย่างไร

1. `auth-service` ออก JWT ตามเดิม (ข้อ 13)
2. Kong ใช้ **JWT plugin** ตรวจ signature ของ token (ต้อง register public key/secret ของ `auth-service` ไว้ใน `kong.yml` ล่วงหน้า)
3. Kong forward claims (userId, role) เป็น HTTP header ต่อไปยัง service ปลายทาง
4. Service ปลายทางใช้ `libs/auth-guards` อ่าน header เหล่านี้เพื่อเช็ค role/ownership แบบเฉพาะทางธุรกิจ

### ตำแหน่งของ Kong ใน network

`Caddy (TLS ที่ขอบสุด) → Kong (routing/JWT/rate-limit) → services` — Caddy ยังทำหน้าที่ TLS/HTTPS อัตโนมัติเหมือนเดิม (ง่ายกว่าให้ Kong ทำ TLS เอง) แล้วส่งต่อ (plain HTTP ภายใน network เดียวกัน) เข้า Kong อีกที ดูรายละเอียด network/port ในข้อ 10.3 ที่อัปเดตแล้ว

### ทางเลือกอื่นที่ไม่เลือก (สำหรับบันทึกไว้)

| ตัวเลือก | เหตุผลที่ไม่เลือก |
|---|---|
| Traefik/Nginx เป็น API Gateway (ไม่ใช่แค่ reverse proxy) | ไม่มี plugin ecosystem สำหรับ JWT/rate-limit ที่ครบเท่า Kong และไม่ตรงเป้าหมายเรื่องอยากเรียนรู้ Kong โดยเฉพาะ |
| Kong พร้อม database ของตัวเอง (แทน DB-less) | เพิ่มของต้องดูแลโดยไม่จำเป็น เมื่อ DB-less mode ตอบโจทย์ขนาดนี้ได้แล้ว |
| Kong ทำ custom business logic ผ่าน Lua plugin | หลีกเลี่ยง — ให้ business logic อยู่ใน NestJS (TypeScript) ที่ทีมถนัด ไม่ใช่ Lua |

---

## 9. External Tools (ข้อเสนอ — ยังไม่เคยถามคุณ)

| Tool | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|
| Redis | cache, และ backend สำหรับ session/rate-limit ในอนาคต | ยังไม่ใช้เป็น message broker ตอนนี้ (ดูข้อ 3) |
| Object storage (MinIO ตอน dev / S3-compatible ตอน production) | เก็บรูปสินค้า | เลือก MinIO เพราะ deploy เป็น container ได้บน VM เดียวกัน ไม่ผูก cloud provider ใดเจ้าหนึ่ง |
| Email service (เช่น Resend หรือ SMTP ปกติ) | ยืนยันอีเมล, ลืมรหัสผ่าน | ยังไม่ fix ผู้ให้บริการ — เลือกตอน implement auth-service |
| Payment gateway | ชำระเงิน (พร้อมเพย์/บัตร) | **ยังไม่ตัดสินใจ** — จะออกแบบใน sub-project 2 (Order & Payment) โดยเฉพาะ |

---

## 10. Infrastructure / Server Preparation & Planning

**✅ Confirmed: self-host ทั้งหมดบน VM เอง** (ไม่ใช้ Vercel/managed serverless สำหรับตอนนี้) — ไม่ผูก cloud provider ยี่ห้อใดยี่ห้อหนึ่ง ใช้ได้กับ DigitalOcean/Vultr/Linode หรือเครื่องของบริษัทเอง

### 10.1 สเปกเครื่องเริ่มต้น (ข้อเสนอ)

| รายการ | ค่าเริ่มต้นที่เสนอ | เหตุผล |
|---|---|---|
| OS | Ubuntu LTS ล่าสุด | รองรับดีที่สุด, community ใหญ่, doc เยอะ |
| CPU/RAM (MVP) | 2 vCPU / 4GB RAM ขึ้นไป | รัน 3 backend services + web + Postgres + Redis + MinIO บนเครื่องเดียวพร้อมกันได้ ยังไม่มี traffic สูง |
| Disk | SSD 50GB+ | เผื่อพื้นที่ Postgres data + รูปสินค้าใน MinIO |
| จำนวน VM | 1 เครื่องพอสำหรับ MVP | รวม services/DB/proxy ไว้เครื่องเดียวก่อน แยกทีหลังเมื่อ traffic โต (ดู 10.5) |

### 10.2 สิ่งที่ต้องติดตั้งบนเครื่อง (server prep checklist)

1. **Docker + Docker Compose plugin** — รันทุก service เป็น container
2. **Caddy** (ดูข้อ 8) — reverse proxy หน้าสุด, ออก HTTPS certificate อัตโนมัติจาก domain ที่ชี้มา
3. **Kong (DB-less mode)** (ดูข้อ 8) — รับต่อจาก Caddy, ทำ routing/JWT-check/rate-limit ก่อนส่งเข้า service, config ผ่านไฟล์ `kong/kong.yml` ที่ mount เข้า container
4. **ufw (firewall)** — เปิดเฉพาะ port ที่จำเป็น (ดู 10.3), ปิดทุก port อื่น
5. **fail2ban** (ข้อเสนอ) — กัน brute-force การ SSH เข้าเครื่อง
6. **unattended-upgrades** (ข้อเสนอ) — auto security patch ของ OS ลดภาระดูแลเครื่อง

### 10.3 Network / Port Plan

| Port | เปิดให้ใคร | ใช้ทำอะไร |
|---|---|---|
| 443 / 80 | Public (ทุกคน) | Caddy รับ HTTPS/HTTP แล้วส่งต่อ (plain HTTP ภายใน network) เข้า Kong |
| 22 (SSH) | เฉพาะ IP ที่กำหนด (ข้อเสนอ: จำกัดด้วย ufw หรือ VPN) | เข้าไปดูแลเครื่อง |
| Kong proxy port | **internal เท่านั้น** — รับต่อจาก Caddy อย่างเดียว | Kong ทำ routing/JWT-check/rate-limit แล้วส่งต่อ service ที่ถูกต้อง |
| ports ของ `auth-service`, `catalog-service`, Postgres, Redis, MinIO | **internal เท่านั้น** (อยู่ใน Docker network เดียวกัน ไม่ expose ออก host) | ป้องกันเข้าถึงตรงจากภายนอกโดยข้าม Kong |

หลักการ: มีแค่ Caddy (443/80) และ SSH (22) เท่านั้นที่เปิดสู่โลกภายนอก แม้แต่ Kong เองก็ไม่ expose ตรงออกไป — ทุก service ภายในคุยกันผ่าน Docker internal network

### 10.4 Secrets & Backup (ข้อเสนอ)

- **Secrets:** เก็บใน `.env` ไฟล์บนเครื่อง (permission จำกัดเฉพาะ deploy user), ไม่ commit เข้า git — เพียงพอสำหรับทีมเล็ก/ผู้ขายรายเดียว ยังไม่ต้องใช้ tool อย่าง Vault ตอนนี้
- **Backup Postgres:** ตั้ง cron รัน `pg_dump` ทุกวัน เก็บไฟล์ backup ไว้นอกเครื่อง (เช่น อัปโหลดไป object storage คนละที่กับ MinIO ที่ใช้งานจริง) — สำคัญมากเพราะข้อมูล credential ไอดีเกม/ออเดอร์ห้ามหาย
- **Docker image registry:** ใช้ GitHub Container Registry (ghcr.io) เก็บ image ที่ build จาก CI ก่อน pull ลง VM ตอน deploy

### 10.5 Deploy Flow (ข้อเสนอ)

1. Push โค้ดเข้า branch หลัก → GitHub Actions build Docker image ของ service ที่เปลี่ยน (Nx ตรวจว่าไฟล์ที่แก้กระทบ service ไหน) → push ขึ้น ghcr.io
2. SSH เข้า VM (จาก CI หรือรันเอง) → `docker compose pull && docker compose up -d` เฉพาะ service ที่มี image ใหม่
3. Health check endpoint ของแต่ละ service (ที่ generator กลางในข้อ 12 สร้างให้) ใช้เช็คว่า container ใหม่พร้อมรับ traffic ก่อนตัด container เก่าออก

### 10.6 เมื่อโหลดสูงขึ้น (แผนอนาคต ยังไม่ทำตอนนี้)

- แยก Postgres ไปเป็น managed database หรือ VM แยกต่างหาก
- แยก service ที่โหลดสูง (เช่น catalog-service ตอนมี traffic เยอะ) ไปคนละ VM
- พิจารณา Docker Swarm (ขั้นถัดจาก Compose แบบ effort น้อย) ก่อนกระโดดไป Kubernetes ถ้ายังไม่จำเป็นต้องจัดการ cluster ใหญ่จริงๆ
- เพิ่ม monitoring/log aggregation จริงจัง (เช่น Prometheus+Grafana, Loki) — ตอนนี้ใช้ `docker logs`/Caddy log พอสำหรับ MVP

---

## 11. โครงสร้างโฟลเดอร์ (Nx workspace)

```
e-commerce/
├── apps/
│   ├── web/                      # Next.js storefront
│   ├── admin/                    # Next.js admin (sub-project 4)
│   ├── auth-service/              # NestJS
│   │   ├── src/
│   │   │   ├── modules/user/
│   │   │   ├── modules/oauth/
│   │   │   └── main.ts
│   │   └── prisma/schema.prisma
│   └── catalog-service/           # NestJS
│       ├── src/
│       │   ├── modules/product/
│       │   ├── modules/inventory/
│       │   ├── modules/gacha-pool/
│       │   └── main.ts
│       └── prisma/schema.prisma
├── libs/
│   ├── shared-types/
│   ├── shared-config/
│   ├── auth-guards/
│   └── ui/
├── docs/
│   └── superpowers/specs/         # เอกสาร design แต่ละ sub-project
├── kong/
│   └── kong.yml                   # Kong declarative config (routes, services, plugins)
├── docker-compose.yml
├── nx.json
└── package.json
```

---

## 12. Template กลาง ✅ Confirmed

สร้าง **Nx generator กำหนดเอง** (`libs/tools/service-generator`) สำหรับ scaffold NestJS service ใหม่ให้หน้าตาเหมือนกันทุกครั้ง (มี `main.ts` ตั้ง microservice transport, health check endpoint, Prisma setup, Dockerfile ในรูปแบบเดียวกัน) — ป้องกันแต่ละ service มีโครงสร้างเพี้ยนไปเรื่อยๆ เมื่อสร้างเพิ่มใน sub-project ถัดไป (order-service, payment-service, gacha-service)

---

## 13. Data Model: Auth

**✅ อัปเดต (ระหว่าง implementation Task 2):** role model เปลี่ยนจาก 3 ระดับ (`CUSTOMER|SELLER|ADMIN`) เป็น **4 ระดับ** ตามที่ผู้ใช้ตัดสินใจตอนเขียน `libs/shared-types`:

```
User    { id, email, passwordHash?, oauthProvider?, oauthId?, role: SUPER_ADMIN|ADMIN|SELLER|MEMBER, createdAt }
Seller  { id, userId(FK), storeName, status }   // มีไว้ตั้งแต่ต้นแม้มีร้านเดียว เพื่อรองรับ multi-vendor
```
- `MEMBER` = ผู้ซื้อ/ลูกค้าทั่วไป (แทนที่ตำแหน่งเดิมของ `CUSTOMER`)
- `SELLER` = ผู้ขาย (เหมือนเดิม)
- `ADMIN` / `SUPER_ADMIN` = สองระดับของผู้ดูแลระบบ — **ยังไม่ได้ระบุความต่างชัดเจนระหว่างสองระดับนี้** (เช่น `SUPER_ADMIN` จัดการ seller/ตั้งค่าระบบได้ ส่วน `ADMIN` จัดการแค่ order/content) — ต้องระบุให้ชัดก่อนเขียน `RolesGuard` จริงจังใน Task 4 ไม่งั้นจะแยกสิทธิ์สองระดับนี้ไม่ออก
- Password: bcrypt hash
- Social login: ผูกด้วย `oauthProvider` + `oauthId`
- ออก JWT (access + refresh token) เซ็นด้วย **RS256** (private key อยู่ที่ `auth-service` เท่านั้น, Kong ถือแค่ public key สำหรับตรวจ signature — ดูเหตุผลในข้อ 16.10)

**ผลกระทบต่อส่วนอื่นที่ต้องแก้ตาม:** Prisma `Role` enum (Task 7 ของแผน implementation), ตัวอย่าง `@Roles(...)` ใน `libs/auth-guards` (Task 4), และ default role ตอนสมัคร/OAuth ที่เดิมกำหนดเป็น `CUSTOMER` (Task 9, Task 11 ของแผน) ต้องเปลี่ยนเป็น `MEMBER` ทั้งหมด

## 14. Data Model: Catalog

```
Game        { id, name, slug }
Product     { id, sellerId(FK), gameId(FK), type: ACCOUNT|TOPUP|GACHA_BOX,
              title, description, price, currency, status: DRAFT|ACTIVE|INACTIVE }

AccountItem { id, productId(FK), credentialsEncrypted, status: AVAILABLE|RESERVED|SOLD,
              deliveryMode: AUTO|MANUAL, orderId? }

TopupCode   { id, productId(FK), payloadEncrypted, status: AVAILABLE|RESERVED|SOLD,
              deliveryMode: AUTO|MANUAL }

GachaBox    { id, productId(FK), name }
GachaPrize  { id, gachaBoxId(FK), dropRate, linkedAccountItemId?, linkedTopupCodeId?, virtualLabel? }
```
- `deliveryMode` เก็บต่อชิ้น รองรับทั้ง auto และ manual ตามที่ตกลง
- credential/payload เข้ารหัสแบบ field-level encryption ไม่เก็บ plaintext
- การสุ่มจริง (roll, ประวัติ) อยู่ใน gacha-service (sub-project 3) — ที่นี่แค่ data model ของ "prize pool"

---

## 15. Testing

- Unit test ต่อ service (Jest)
- Integration test: Kong ↔ service ด้วย test container (Postgres จริงใน CI)
- ยังไม่ทำ e2e เต็มระบบ (รอ order/payment service)

---

## 16. รายการที่ต้องการให้คุณ confirm/แก้ก่อนเริ่มเขียนโค้ด

**สถานะ: ✅ Confirmed ทั้งหมด** — ตัดสินใจตามข้อเสนอเดิมในเอกสาร (เหตุผลอยู่ในหัวข้อที่อ้างถึง) เพราะไม่มีข้อไหนที่คุณแจ้งความต้องการเฉพาะเจาะจงเข้ามาแทน

1. **Package manager: pnpm** ✅ — ตามที่เสนอในข้อ 3
2. **Frontend styling: Tailwind CSS** ✅ — ตามที่เสนอในข้อ 3
3. **Inter-service communication: NestJS TCP transport** ✅ (ยังไม่ใช้ Redis/RabbitMQ ตอนนี้) — ตามที่เสนอในข้อ 3
4. **ไม่แยก seller-service ต่างหาก** ✅ (ใช้ role-based auth ครอบ endpoint เดิมแทน) — ตามที่เสนอในข้อ 5
5. **Object storage: MinIO (dev) → S3-compatible (prod)** ✅ — ตามที่เสนอในข้อ 9
6. **Nx generator กลางสำหรับ scaffold service ใหม่: ทำเลย** ✅ — เพราะยังต้องสร้างอีก 3 services ถัดไป (order/payment/gacha) การมี template ตั้งแต่ตอนนี้ป้องกันโครงสร้างเพี้ยนไปเรื่อยๆ คุ้มกว่าไปทำตอนหลังที่ service เริ่มไม่เหมือนกันแล้ว
7. **สเปก VM: 2 vCPU / 4GB RAM, Ubuntu LTS** ✅ ใช้เป็นค่าเริ่มต้นชั่วคราว — ยังไม่มี provider/เครื่องจริงระบุมา ถือเป็นสมมติฐานที่ใช้วางแผนได้ก่อน ปรับได้ทันทีเมื่อมีเครื่องจริง (ไม่กระทบ design อื่น เพราะทุกอย่างเป็น container)
8. **fail2ban / unattended-upgrades / backup ไป object storage แยกที่** ✅ — ตามที่เสนอในข้อ 10.2/10.4
9. **Kong: DB-less mode** ✅ (config ผ่าน `kong.yml` ไฟล์เดียว ไม่มี Kong database) — ตามที่เสนอในข้อ 8
10. **JWT signing algorithm: RS256** ✅ (ตัดสินใจตอนนี้เลย ไม่รอถึงตอน implement) — เลือก RS256 แทน HS256 เพราะ `auth-service` เก็บ **private key** ไว้เซ็นเองที่เดียว ส่วน Kong เก็บแค่ **public key** ไว้ตรวจสอบ signature — ถ้าใช้ HS256 (shared secret) จะต้องเอา secret เดียวกันไปใส่ไว้ทั้งใน `auth-service` และไฟล์ config ของ Kong ซึ่งเพิ่มความเสี่ยงถ้า `kong.yml` หลุด (เพราะมันเก็บไว้ใน git ตามข้อ 8) — RS256 หลุดแค่ public key ไม่กระทบความปลอดภัย
