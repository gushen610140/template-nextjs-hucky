/**
 * 权限标识的唯一定义处。
 *
 * 当前采用粗粒度授权:
 * - `basic:manage`: 用户 / 角色 / 权限管理
 * - `ai:manage`:    模型 / 提供商 / 智能体 / 知识库管理
 * - `ai:own`:       使用管理员配置的模型进行对话
 * - `file:own`:     管理自己上传的文件
 * - `file:manage`:  管理全站文件 (管理员)
 *
 * 主题配置和 dashboard 概览不做权限限制。
 * 新增页面或 API 默认不校验权限; 需要限制时再显式引用这里的常量。
 *
 * 新增权限时:
 * 1. 在这里补常量。
 * 2. 运行 `bun run db:seed` 同步到数据库。
 * 3. 在对应 Route Handler / Server Action / 页面里做校验。
 */
export const PERMISSIONS = {
  basicManage: "basic:manage",
  aiManage: "ai:manage",
  aiOwn: "ai:own",
  fileOwn: "file:own",
  fileManage: "file:manage",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** 内置角色名; 业务代码不要用角色名做授权判断, 这里只用于种子和引导逻辑 */
export const ROLES = {
  admin: "admin",
  user: "user",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** 从权限标识中取出模块名, 写入 `Permission.module` */
export function getPermissionModule(name: PermissionName): string {
  return name.split(":")[0] ?? name;
}
