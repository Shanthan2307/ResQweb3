import { ReactNode } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  linkText?: string;
  linkHref?: string;
  iconColor?: string;
}

export default function SummaryCard({
  title,
  value,
  icon,
  linkText,
  linkHref,
  iconColor = "text-primary-700"
}: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconColor}`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-neutral-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-neutral-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      
      {linkText && linkHref && (
        <CardFooter className="bg-neutral-50 px-5 py-3">
          <div className="text-sm">
            <Link href={linkHref}>
              <a className={`font-medium ${iconColor} hover:underline`}>
                {linkText}
              </a>
            </Link>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}