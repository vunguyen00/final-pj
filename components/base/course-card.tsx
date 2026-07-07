import Link from "next/link";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { normalizeCourseThumbnailUrl } from "@/lib/course-thumbnail";
import {
  getCourseDuration,
  getCourseLanguage,
  getCourseLevel,
  getLanguageLabel,
  getLevelLabel,
  priceLabel,
  type CourseLike,
} from "@/app/components/learningMarketplace";

type CourseCardCourse = CourseLike & {
  id: string;
  thumbnail?: string | null;
  instructor?: { username?: string | null } | null;
  _count?: { enrollments?: number };
};

export function CourseCard({
  course,
  href,
  isEnrolled = false,
  compact = false,
}: {
  course: CourseCardCourse;
  href?: string;
  isEnrolled?: boolean;
  compact?: boolean;
}) {
  const language = getCourseLanguage(course);
  const thumbnailUrl = normalizeCourseThumbnailUrl(course.thumbnail);
  const courseHref = href ?? `/courses/${course.id}`;
  const actionHref = isEnrolled ? `/student/hoc-bai?courseId=${course.id}` : courseHref;
  const category = course.category?.trim() || "Chưa phân loại";
  const enrollments = course._count?.enrollments ?? 0;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={courseHref} className="block">
        <div className="aspect-video bg-muted">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={course.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-muted-foreground">
              {getLanguageLabel(language)}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <BadgeGroup>
          <Badge>{getLanguageLabel(language)}</Badge>
          <Badge className="bg-muted text-muted-foreground">{getLevelLabel(getCourseLevel(course))}</Badge>
          {!compact ? <Badge className="bg-secondary text-secondary-foreground">{category}</Badge> : null}
        </BadgeGroup>

        <Link href={courseHref}>
          <h3 className="mt-3 line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-snug text-foreground hover:text-primary">
            {course.name}
          </h3>
        </Link>
        {course.description ? (
          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted-foreground">{course.description}</p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <span className="truncate">{course.instructor?.username || "Giảng viên"}</span>
          <span>{getCourseDuration(course)}</span>
          <span>{course.lessons ?? 0} bài học</span>
          <span>{enrollments} học viên</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-base font-semibold text-foreground">{priceLabel(course.price)}</span>
          <Link
            href={actionHref}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${
              isEnrolled ? "bg-accent/15 text-accent" : "bg-primary text-primary-foreground"
            }`}
          >
            {isEnrolled ? "Tiếp tục học" : "Xem khóa học"}
          </Link>
        </div>
      </div>
    </article>
  );
}
