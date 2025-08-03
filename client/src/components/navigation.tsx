import { User } from "lucide-react";

interface NavigationProps {
  user?: {
    name: string;
    avatar?: string;
    credits: number;
  };
}

export default function Navigation({ user }: NavigationProps) {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary">EtsyArt Pro</h1>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <a href="#" className="text-gray-900 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="#" className="text-gray-500 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  History
                </a>
                <a href="#" className="text-gray-500 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Settings
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Credits: {user.credits}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {user.avatar ? (
                    <img className="h-8 w-8 rounded-full object-cover" src={user.avatar} alt="User avatar" />
                  ) : (
                    <User className="h-8 w-8 rounded-full bg-gray-200 p-1" />
                  )}
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
