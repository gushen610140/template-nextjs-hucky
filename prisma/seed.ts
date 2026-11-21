import dotenv from "dotenv";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  getPermissionModule,
  PERMISSIONS,
  type PermissionName,
  ROLES,
  type RoleName,
} from "@/lib/permissions";
import { createPrismaClient } from "@/lib/prisma-client";

// 与 prisma.config.ts 保持一致: 按 NODE_ENV 读取 .env.<NODE_ENV>
// 这样直接运行 `bun prisma/seed.ts` 也能拿到数据库连接串。
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile, quiet: true });

/**
 * 内置角色与权限的映射。
 *
 * 内置角色被视为“代码拥有的系统数据”: 每次 seed 都会把它们的权限
 * 完全对齐到这里的定义。用户自建的角色不会被触碰。
 */
const SYSTEM_ROLES: ReadonlyArray<{
  name: RoleName;
  description: string;
  permissions: readonly PermissionName[];
}> = [
  {
    name: ROLES.admin,
    description: "系统管理员，拥有全部权限",
    permissions: Object.values(PERMISSIONS),
  },
  {
    name: ROLES.user,
    description: "普通用户，可管理自己的文件并使用 AI 对话",
    permissions: [PERMISSIONS.fileOwn, PERMISSIONS.aiOwn, PERMISSIONS.rssOwn],
  },
];

/**
 * 内置可订阅站点与频道。
 *
 * 只补齐缺失项: 已存在时更新名称 / 排序等展示字段, 但不覆盖
 * `isEnabled`, 避免每次部署把管理员关闭的站点重新打开。
 */
const RSS_SITES: ReadonlyArray<{
  slug: string;
  name: string;
  homepageUrl: string;
  description: string;
  adapter: string;
  channels: ReadonlyArray<{
    slug: string;
    name: string;
    adapterKey: string;
    url: string;
  }>;
}> = [
  {
    slug: "36kr",
    name: "36氪",
    homepageUrl: "https://www.36kr.com/",
    description: "科技与商业资讯",
    adapter: "36kr",
    channels: [
      {
        slug: "web_news",
        name: "最新",
        adapterKey: "web_news",
        url: "https://www.36kr.com/information/web_news",
      },
      {
        slug: "web_recommend",
        name: "推荐",
        adapterKey: "web_recommend",
        url: "https://www.36kr.com/information/web_recommend",
      },
      {
        slug: "contact",
        name: "创投",
        adapterKey: "contact",
        url: "https://www.36kr.com/information/contact",
      },
      {
        slug: "ccs",
        name: "财经",
        adapterKey: "ccs",
        url: "https://www.36kr.com/information/ccs",
      },
      {
        slug: "travel",
        name: "汽车",
        adapterKey: "travel",
        url: "https://www.36kr.com/information/travel",
      },
      {
        slug: "ai",
        name: "AI",
        adapterKey: "AI",
        url: "https://www.36kr.com/information/AI",
      },
      {
        slug: "technology",
        name: "科技",
        adapterKey: "technology",
        url: "https://www.36kr.com/information/technology",
      },
      {
        slug: "aireport",
        name: "项目推荐",
        adapterKey: "aireport",
        url: "https://www.36kr.com/information/aireport",
      },
      {
        slug: "shuzihua",
        name: "专精特新",
        adapterKey: "shuzihua",
        url: "https://www.36kr.com/information/shuzihua",
      },
      {
        slug: "innovate",
        name: "创新",
        adapterKey: "innovate",
        url: "https://www.36kr.com/information/innovate",
      },
      {
        slug: "enterpriseservice",
        name: "企服",
        adapterKey: "enterpriseservice",
        url: "https://www.36kr.com/information/enterpriseservice",
      },
      {
        slug: "happy_life",
        name: "消费",
        adapterKey: "happy_life",
        url: "https://www.36kr.com/information/happy_life",
      },
      {
        slug: "real_estate",
        name: "城市",
        adapterKey: "real_estate",
        url: "https://www.36kr.com/information/real_estate",
      },
      {
        slug: "web_zhichang",
        name: "职场",
        adapterKey: "web_zhichang",
        url: "https://www.36kr.com/information/web_zhichang",
      },
      {
        slug: "qiyehao",
        name: "企业号",
        adapterKey: "qiyehao",
        url: "https://www.36kr.com/information/qiyehao",
      },
      {
        slug: "sensation",
        name: "看点",
        adapterKey: "sensation",
        url: "https://www.36kr.com/information/sensation",
      },
      {
        slug: "other",
        name: "其他",
        adapterKey: "other",
        url: "https://www.36kr.com/information/other",
      },
      {
        slug: "newsflash",
        name: "快讯",
        adapterKey: "newsflash",
        url: "https://www.36kr.com/newsflashes",
      },
    ],
  },
];

async function seedRssCatalog(tx: Prisma.TransactionClient) {
  for (const [siteIndex, site] of RSS_SITES.entries()) {
    const row = await tx.rssSite.upsert({
      where: { slug: site.slug },
      update: {
        name: site.name,
        homepageUrl: site.homepageUrl,
        description: site.description,
        adapter: site.adapter,
        sortOrder: siteIndex,
      },
      create: {
        slug: site.slug,
        name: site.name,
        homepageUrl: site.homepageUrl,
        description: site.description,
        adapter: site.adapter,
        sortOrder: siteIndex,
      },
    });

    for (const [channelIndex, channel] of site.channels.entries()) {
      await tx.rssChannel.upsert({
        where: { siteId_slug: { siteId: row.id, slug: channel.slug } },
        update: {
          name: channel.name,
          adapterKey: channel.adapterKey,
          url: channel.url,
          sortOrder: channelIndex,
        },
        create: {
          siteId: row.id,
          slug: channel.slug,
          name: channel.name,
          adapterKey: channel.adapterKey,
          url: channel.url,
          sortOrder: channelIndex,
        },
      });
    }
  }
}

async function main() {
  // seed 属于迁移/部署步骤, 使用直连地址; 本地只有一个连接串时回退到 DATABASE_URL。
  // 不要复用 lib/prisma.ts 的运行时单例, 否则会走 pooled 连接。
  const connectionString =
    process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("MIGRATE_DATABASE_URL or DATABASE_URL must be set.");
  }

  const prisma = createPrismaClient(connectionString);

  try {
    await prisma.$transaction(async (tx) => {
      const permissionIds = new Map<PermissionName, string>();

      // 只 upsert 当前权限目录, 不删除数据库里已有的其他权限,
      // 避免后台手工创建的权限被 seed 清掉。
      for (const name of Object.values(PERMISSIONS)) {
        const permission = await tx.permission.upsert({
          where: { name },
          update: { module: getPermissionModule(name) },
          create: { name, module: getPermissionModule(name) },
        });
        permissionIds.set(name, permission.id);
      }

      for (const role of SYSTEM_ROLES) {
        const row = await tx.role.upsert({
          where: { name: role.name },
          update: { description: role.description },
          create: {
            name: role.name,
            description: role.description,
          },
        });

        // 内置角色由代码定义, 先清空再重建, 保证和 PERMISSIONS 一致
        await tx.rolePermission.deleteMany({ where: { roleId: row.id } });

        if (role.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: role.permissions.map((name) => {
              const permissionId = permissionIds.get(name);
              if (!permissionId) {
                throw new Error(`Permission "${name}" was not seeded.`);
              }
              return { roleId: row.id, permissionId };
            }),
          });
        }
      }
    });

    // 目录是纯幂等 upsert, 不需要交互式事务;
    // 远端库上 19 次往返会超过 Prisma 默认 5s 的事务超时。
    await seedRssCatalog(prisma);

    console.log("RBAC seed completed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("RBAC seed failed:", error);
  process.exitCode = 1;
});
