/**
 * 后台 RBAC 页面与客户端组件之间传递的数据形状。
 *
 * 服务端查询结果必须先转成可序列化的普通对象再传给客户端组件,
 * 因此 `Date` 统一用 ISO 字符串表示。
 */

export type RbacRoleSummary = {
  id: string;
  name: string;
};

export type RbacPermissionSummary = {
  id: string;
  name: string;
  module: string | null;
  description: string | null;
};

export type RbacUserRow = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  roles: RbacRoleSummary[];
};

export type RbacRoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: RbacPermissionSummary[];
};

export type RbacPermissionRow = {
  id: string;
  name: string;
  description: string | null;
  module: string | null;
  isSystem: boolean;
  roleCount: number;
};

/** Server Action 的统一返回值; 失败时返回错误码, 由客户端翻译成文案。 */
export type RbacActionResult = { ok: true } | { ok: false; error: string };
