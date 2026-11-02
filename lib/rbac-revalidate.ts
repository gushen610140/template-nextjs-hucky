import { revalidatePath } from "next/cache";

/**
 * 用户 / 角色 / 权限三块数据互相引用, 任一变更都会影响另外两个页面
 * 的展示内容, 所以统一让三个页面一起失效。
 *
 * 这里用 `[locale]` 路由模式, 避免在 Server Action 里解析当前语言。
 */
export function revalidateRbacPages(): void {
  for (const segment of ["users", "roles", "permissions"]) {
    revalidatePath(`/[locale]/dashboard/${segment}`, "page");
  }

  // 角色和权限变更会影响侧边栏的可见入口, 让所有 layout 一起失效
  revalidatePath("/", "layout");
}
