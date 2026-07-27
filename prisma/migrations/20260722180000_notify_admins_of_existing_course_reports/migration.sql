-- Backfill unread admin notifications for reports that were already open before
-- report submission started creating notifications in the application.
INSERT INTO "Notification" ("id", "userId", "title", "body", "createdAt")
SELECT
  'course-report-' || md5(report."id" || ':' || admin."id"),
  admin."id",
  'Có báo cáo khóa học mới',
  reporter."username" || ' đã báo cáo khóa học "' || course."name" || '": ' || report."title" || '. Mở mục Báo cáo khóa học để kiểm tra.',
  report."createdAt"
FROM "CourseReport" AS report
JOIN "Course" AS course ON course."id" = report."courseId"
JOIN "User" AS reporter ON reporter."id" = report."reporterId"
CROSS JOIN "User" AS admin
WHERE admin."role" = 'ADMIN'
  AND report."status" IN ('PENDING', 'IN_REVIEW')
  AND NOT EXISTS (
    SELECT 1
    FROM "Notification" AS notification
    WHERE notification."id" = 'course-report-' || md5(report."id" || ':' || admin."id")
  );
