"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const tabs = [
  { label: "編集", href: "edit" },
  { label: "ロジック", href: "logic" },
  { label: "設定", href: "settings" },
  { label: "Webhook", href: "webhooks" },
  { label: "クオータ", href: "quotas" },
  { label: "回答", href: "responses" },
  { label: "プレビュー", href: "preview" },
];

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const surveyId = params.surveyId as string;
  const basePath = `/surveys/${surveyId}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const href = `${basePath}/${tab.href}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={tab.href}
                  href={href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
