import { ReactNode } from "react";
import MainHeader from "@/components/navigation/main-header";

export default function DashboardLayout({ 
  children,
  title,
  subtitle,
}: { 
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      
      <main className="flex-grow bg-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
              {subtitle && (
                <p className="mt-1 text-sm text-neutral-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {children}
        </div>
      </main>
      
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-sm text-neutral-500">
                &copy; {new Date().getFullYear()} RESQ. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
