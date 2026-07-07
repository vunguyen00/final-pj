import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerWidth = "default" | "admin" | "narrow";

const widthMap: Record<ContainerWidth, string> = {
  default: "max-w-7xl",
  admin: "max-w-[1440px]",
  narrow: "max-w-6xl",
};

export function PageContainer({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: ContainerWidth;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widthMap[width], className)}>
      {children}
    </div>
  );
}

export function PageMain({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("min-h-screen bg-background", className)}>{children}</main>;
}
