ALTER TABLE "OrderItem"
ADD COLUMN "adminRevenue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "teacherRevenue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "revenueSplit" TEXT NOT NULL DEFAULT 'ADMIN_ONLY';

UPDATE "OrderItem" AS oi
SET
  "adminRevenue" = CASE
    WHEN u."role" = 'TEACHER' THEN ROUND(oi."price" * 0.30)::INTEGER
    ELSE ROUND(oi."price")::INTEGER
  END,
  "teacherRevenue" = CASE
    WHEN u."role" = 'TEACHER' THEN ROUND(oi."price" * 0.70)::INTEGER
    ELSE 0
  END,
  "revenueSplit" = CASE
    WHEN u."role" = 'TEACHER' THEN 'TEACHER_70_ADMIN_30'
    ELSE 'ADMIN_ONLY'
  END
FROM "Course" AS c
LEFT JOIN "User" AS u ON u."id" = c."instructorId"
WHERE oi."courseId" = c."id";
