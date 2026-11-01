-- Logto 成为唯一凭证来源:
-- 移除本地密码哈希, 新增 Logto sub 作为身份关联键。
ALTER TABLE "User" DROP COLUMN "passwordHash",
ADD COLUMN     "logtoSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_logtoSub_key" ON "User"("logtoSub");
