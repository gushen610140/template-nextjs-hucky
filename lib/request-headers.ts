/**
 * 由 proxy 注入、供服务端读取的请求头。
 *
 * 放在独立模块里是因为 proxy 也会 import 它；这里不能出现任何
 * 依赖数据库或 Node-only 能力的 import。
 */

/** 原始请求路径（含 locale 前缀），用于登录后回跳到用户真正想访问的页面 */
export const PATHNAME_HEADER = "x-pathname";
