# 彻底移除 Clerk & 接入传统数据库认证方案

## 背景

当前项目 `template-nextjs-hucky` 依赖 `@clerk/nextjs` 作为认证层，需完整移除并替换为自建数据库驱动的用户系统。

---

## 现状清单（Clerk 所有接入点）

| # | 文件 | Clerk 引用 | 用途 |
|---|------|-----------|------|
| 1 | `package.json` | `@clerk/nextjs: "^7.4.2"` | 依赖 |
| 2 | `proxy.ts` | `clerkMiddleware`, `createRouteMatcher`, `auth.protect()` | 全局中间件，保护非公开路由 |
| 3 | `app/[locale]/layout.tsx` | `ClerkProvider` | 包裹整个应用 |
| 4 | `components/nav-user.tsx` | `useUser()`, `useClerk()`, `SignInButton`, `signOut`, `openUserProfile`, `user.imageUrl`, `user.fullName`, `user.emailAddresses` | 侧边栏用户菜单：展示头像/姓名/邮箱、登录按钮、退出、账户设置 |
| 5 | `.env.development` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | 开发环境密钥 |
| 6 | `.env.production` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | 生产环境密钥 |
| 7 | `components/landing/sections/tech-section.tsx` | 文本 `"Clerk Auth"` | Landing 页技术栈展示 |
| 8 | `messages/en.json` | `"powered by Clerk"` 描述文本 | Landing 页 feature 文案 |
| 9 | `messages/zh.json` | `"Clerk 驱动"` 描述文本 | Landing 页 feature 文案 |

**无加密/无深层依赖**：项目无 Prisma/Drizzle/ORM，无数据库 schema，无其他安全层。所有 auth 状态均来自 Clerk 客户端 SDK。

---

## 分步实施方案（共 11 步）

### Phase 1: 基础设施（数据库 + 认证服务）

#### Step 1: 选择并初始化 ORM 与数据库

**目标**：建立用户表的 schema 和数据库连接。

**决策项**：
- ORM 选型：**Prisma**（最成熟、TS 生态首选）或 **Drizzle**（更轻量、SQL-like）。
- 数据库：推荐 **SQLite**（开发友好、零配置）配合 Prisma；生产可切换到 PostgreSQL。
- 交付物：
  - `prisma/schema.prisma` — User 模型（字段见 Step 2）。
  - `lib/prisma.ts` — Prisma Client 单例。
  - `.env` — `DATABASE_URL`。

```
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

#### Step 2: 实现密码哈希与 JWT 工具

**目标**：自建 `hash`/`verify`/`sign`/`verify` 工具函数。

- 密码：`bcryptjs`（或 `bcrypt`）— `hashPassword(password)` / `verifyPassword(password, hash)`。
- JWT：`jsonwebtoken` — `signToken(payload)` / `verifyToken(token)`。
- 产出：`lib/auth/password.ts`, `lib/auth/jwt.ts`。
- `.env` 新增：`JWT_SECRET`。

#### Step 3: 实现认证 API 路由

**目标**：替代 Clerk 的登录/注册/登出/会话管理。

路由（App Router）：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/auth/register` | POST | 注册（email + password + name） |
| `/api/auth/login` | POST | 登录，返回 JWT（httpOnly cookie） |
| `/api/auth/logout` | POST | 清除 cookie |
| `/api/auth/me` | GET | 返回当前用户信息（需 token） |

Session 策略：**httpOnly cookie + JWT**（非 localStorage），CSRF 安全。
- `lib/auth/session.ts` — `setSessionCookie(res, token)`, `getSessionUser(req): User | null`。
- 从 cookie 解析 JWT → 查数据库 → 返回 User。

---

### Phase 2: 移除 Clerk Provider & 中间件

#### Step 4: 替换 middleware（`proxy.ts`）

**目标**：移除 `clerkMiddleware`，替换为自建 session 校验或跳过（等 API 路由就绪后再做精确保护）。

方案 A（推荐，渐进）：先将全局保护降级为注释，或者直接移除 Clerk 中间件，暂用空中间件或仅 intl 中间件。API 路由就绪后加回来。

```
// proxy.ts — 后续替换为：
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
```

- 移除 `"/__clerk/(.*)"` matcher（Clerk 内部路由）。
- `matcher` 中的 `/(api|trpc)(.*)` 如果不需要 trpc 也可移除。

#### Step 5: 移除 `ClerkProvider`（`layout.tsx`）

**目标**：删除 `ClerkProvider` wrapper，保留 `TooltipProvider` 和 `NextIntlClientProvider`。

```
- import { ClerkProvider } from "@clerk/nextjs";
...
- <ClerkProvider>
    <TooltipProvider>{children}</TooltipProvider>
- </ClerkProvider>
```

---

### Phase 3: 替换 UI 组件

#### Step 6: 重写 `NavUser`（`components/nav-user.tsx`）

**目标**：删除所有 Clerk hooks 和组件，替换为自建认证上下文。

**新依赖**：
- 创建 `lib/auth/use-session.ts` — 客户端 hook，从 `/api/auth/me` 获取用户。
- 或创建 `AuthContext` + `AuthProvider` — 在 layout 中提供全局用户状态。

**替换清单**：

| 原 Clerk API | 替换为 |
|--------------|--------|
| `useUser()` → `{ user, isLoaded }` | `useSession()` → `{ user, isLoading }` |
| `useClerk().signOut()` | `fetch("/api/auth/logout", { method: "POST" })` + 刷新 |
| `useClerk().openUserProfile()` | 弹窗或跳转 `/settings/profile` |
| `SignInButton` | 自建登录按钮 → 跳转 `/login` 或弹窗 |
| `user.imageUrl` | `user.avatarUrl` |
| `user.fullName` | `user.name` |
| `user.emailAddresses[0]?.emailAddress` | `user.email` |

产出：一个新的 `NavUser`，保留相同的 UI 结构（Avatar、DropdownMenu、initials 生成逻辑），数据源从 Clerk 替换为 `useSession()` hook。

#### Step 7: 创建登录/注册页面

**目标**：替换 Clerk 的 modal/ hosted pages 能力。

- `app/[locale]/login/page.tsx` — 邮箱 + 密码表单 → POST `/api/auth/login`。
- `app/[locale]/register/page.tsx` — 邮箱 + 密码 + 姓名表单 → POST `/api/auth/register`。
- 登录成功后重定向到 `/dashboard`。
- UI 风格复用 shadcn `Input`, `Button`, `Card`。

---

### Phase 4: 清理残留与文案

#### Step 8: 更新技术栈文案

- `components/landing/sections/tech-section.tsx` — `"Clerk Auth"` → `"Database Auth"` 或其他。
- `messages/en.json` — `"powered by Clerk"` → `"Secure email & password authentication"`。
- `messages/zh.json` — `"Clerk 驱动"` → `"安全的邮箱密码认证"`。

#### Step 9: 删除环境变量与依赖

- 删除 `.env.development` 和 `.env.production` 中的 Clerk keys。
- `npm uninstall @clerk/nextjs`（或 `bun remove @clerk/nextjs`）。
- 删除 `bun.lock` / `package-lock.json` 重新 `install`。

---

### Phase 5: 验证

#### Step 10: 端到端验证

- `bun run dev` → 无 Clerk 相关错误。
- 访问 `/` → landing 页正常加载，无 Clerk 报错。
- 访问 `/dashboard` → 如果未登录，应重定向到 `/login`。
- `/login` → 填写表单 → 登录成功 → 跳转 `/dashboard` → `NavUser` 显示用户信息。
- `NavUser` → 退出按钮 → 清除 cookie → 回到 `/login`。
- `/api/auth/me` → 返回 401 或当前用户 JSON。

#### Step 11: lint 与构建

- `bun run lint` → 无 Clerk import/type 残留。
- `bun run build` → 构建通过。

---

## 执行顺序总览

```
Phase 1: 基础设施
  Step 1  →  初始化 ORM + User 表 + 数据库
  Step 2  →  密码 & JWT 工具函数
  Step 3  →  /api/auth/* 路由

Phase 2: 移除 Clerk 包装
  Step 4  →  替换 proxy.ts middleware
  Step 5  →  移除 ClerkProvider

Phase 3: 替换 UI
  Step 6  →  重写 NavUser（useSession hook）
  Step 7  →  创建 Login / Register 页面

Phase 4: 清理
  Step 8  →  更新 Landing 页文案 & i18n 消息
  Step 9  →  删依赖、删环境变量

Phase 5: 验证
  Step 10 →  端到端手动测试
  Step 11 →  lint + build 通过
```

---

## 注意点

1. **SSR 兼容**：JWT 通过 httpOnly cookie 传递，`getSessionUser` 应在服务端组件和客户端都能工作。
2. **文件命名规范**：保持现有 `@/lib/`、`@/components/` 别名模式。
3. **国际化**：登录/注册页面的文案应走 `next-intl` messages 而非硬编码。
4. **渐进替换**：建议一次把所有文件改完再验证，避免中间态同时包含 Clerk 和自建 auth 导致类型冲突。
5. **无混合期**：Clerk 删除后不可回退。所有用户的现有 Clerk 会话会失效——这在一个 template 项目中是可接受的。
