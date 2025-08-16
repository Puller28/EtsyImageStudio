import { TemplateMockupTest } from "@/components/template-mockup-test";
import Navigation from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export default function TemplateMockupPage() {
  const { user: authUser } = useAuth();
  
  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Use auth user data as fallback if API user data is not available
  const currentUser = user || authUser;

  // Convert user data to Navigation component format
  const navUser = currentUser ? {
    name: currentUser.name,
    avatar: currentUser.avatar || undefined,
    credits: currentUser.credits
  } : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation user={navUser} />
      <main className="flex-1 container mx-auto py-8">
        <TemplateMockupTest />
      </main>
      <Footer />
    </div>
  );
}