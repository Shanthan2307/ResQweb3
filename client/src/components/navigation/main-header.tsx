import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { BellIcon, Flame, Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Notification } from "@shared/schema";

export default function MainHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // Fetch notifications
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });
  
  const unreadNotificationsCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Flame className="h-8 w-8 text-primary-700" />
              <span className="text-xl ml-2 text-primary-700 font-bold">RESQ</span>
            </div>
            
            {user && (
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <Link href="/">
                  <a className={`border-b-2 inline-flex items-center px-1 pt-1 font-medium ${
                    location === "/" 
                      ? "border-primary-700 text-neutral-900" 
                      : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                  }`}>
                    Dashboard
                  </a>
                </Link>
                
                <Link href="/resources">
                  <a className={`border-b-2 inline-flex items-center px-1 pt-1 font-medium ${
                    location === "/resources" 
                      ? "border-primary-700 text-neutral-900" 
                      : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                  }`}>
                    Resources
                  </a>
                </Link>
                
                <Link href="/volunteer">
                  <a className={`border-b-2 inline-flex items-center px-1 pt-1 font-medium ${
                    location === "/volunteer" 
                      ? "border-primary-700 text-neutral-900" 
                      : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                  }`}>
                    Volunteer
                  </a>
                </Link>
                
                <Link href="/wallet">
                  <a className={`border-b-2 inline-flex items-center px-1 pt-1 font-medium ${
                    location === "/wallet" 
                      ? "border-primary-700 text-neutral-900" 
                      : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                  }`}>
                    Wallet
                  </a>
                </Link>
              </nav>
            )}
          </div>
          
          {user && (
            <div className="flex items-center">
              <div className="flex-shrink-0 relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <BellIcon className="h-6 w-6 text-neutral-400 hover:text-neutral-500" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white"></span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <div className="px-4 py-2 font-medium border-b">
                      Notifications
                    </div>
                    {notifications?.length ? (
                      notifications.slice(0, 5).map((notification) => (
                        <DropdownMenuItem key={notification.id} className="p-3 cursor-default">
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-neutral-500">{notification.content}</p>
                          </div>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="p-3 text-center text-sm text-neutral-500">
                        No notifications
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="p-2">
                      <Link href="/notifications">
                        <a className="w-full text-center text-sm">
                          View all notifications
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="ml-3 relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center text-white">
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-default">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-neutral-500 capitalize">{user.userType}</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <a>Profile</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <a>Settings</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => logoutMutation.mutate()}
                      className="text-red-600 focus:text-red-600"
                      disabled={logoutMutation.isPending}
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="ml-2 -mr-2 flex items-center md:hidden">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {isMenuOpen ? (
                    <X className="block h-6 w-6" />
                  ) : (
                    <Menu className="block h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      {user && isMenuOpen && (
        <div className="md:hidden border-t border-neutral-200">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/">
              <a className={`block pl-3 pr-4 py-2 font-medium ${
                location === "/" 
                  ? "bg-primary-50 border-l-4 border-primary-700 text-primary-700" 
                  : "border-l-4 border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300"
              }`}>
                Dashboard
              </a>
            </Link>
            
            <Link href="/resources">
              <a className={`block pl-3 pr-4 py-2 font-medium ${
                location === "/resources" 
                  ? "bg-primary-50 border-l-4 border-primary-700 text-primary-700" 
                  : "border-l-4 border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300"
              }`}>
                Resources
              </a>
            </Link>
            
            <Link href="/volunteer">
              <a className={`block pl-3 pr-4 py-2 font-medium ${
                location === "/volunteer" 
                  ? "bg-primary-50 border-l-4 border-primary-700 text-primary-700" 
                  : "border-l-4 border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300"
              }`}>
                Volunteer
              </a>
            </Link>
            
            <Link href="/wallet">
              <a className={`block pl-3 pr-4 py-2 font-medium ${
                location === "/wallet" 
                  ? "bg-primary-50 border-l-4 border-primary-700 text-primary-700" 
                  : "border-l-4 border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300"
              }`}>
                Wallet
              </a>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
