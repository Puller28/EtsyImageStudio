import { vi } from "vitest";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  password: string;
  avatar: string | null;
  credits: number;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionId: string | null;
  subscriptionStartDate: Date | null;
  subscriptionEndDate: Date | null;
  createdAt: Date;
}

const mockUsers: MockUser[] = [];

vi.doMock("../../../server/storage", () => {
  return {
    storage: {
      async getUserByEmail(email: string) {
        return mockUsers.find((user) => user.email === email);
      },
      async getUserById(id: string) {
        return mockUsers.find((user) => user.id === id);
      },
      async createUser(data: any) {
        const user: MockUser = {
          id: `user_${mockUsers.length + 1}`,
          createdAt: new Date(),
          avatar: null,
          subscriptionStatus: "free",
          subscriptionPlan: null,
          subscriptionId: null,
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          credits: data.credits ?? 100,
          ...data,
        };
        mockUsers.push(user);
        return user;
      },
      async updateUser(id: string, updates: Partial<MockUser>) {
        const index = mockUsers.findIndex((user) => user.id === id);
        if (index === -1) {
          return undefined;
        }
        mockUsers[index] = {
          ...mockUsers[index],
          ...updates,
        } as MockUser;
        return mockUsers[index];
      },
      async createProject() {
        throw new Error("Not implemented in tests");
      },
      async getProject() {
        return undefined;
      },
      async getProjectsByUserId() {
        return [];
      },
      async updateProject() {
        return undefined;
      },
      async updateUserCredits() {
        return;
      },
      async updateUserSubscription() {
        return;
      },
      async updateUserCreditsWithTransaction() {
        return true;
      },
      async logCreditTransaction() {
        return;
      },
      async createCreditTransaction() {
        return {
          id: `tx_${Date.now()}`,
          userId: "user_1",
          amount: 0,
          transactionType: "test",
          description: "",
          balanceAfter: 0,
          createdAt: new Date(),
        };
      },
      async getCreditTransactions() {
        return [];
      },
      async isPaymentProcessed() {
        return false;
      },
      async markPaymentProcessed() {
        return;
      },
      async processWebhookPaymentAtomic() {
        return { success: true, alreadyProcessed: false };
      },
      async getContactMessages() {
        return [];
      },
      async createContactMessage(message: any) {
        return { id: `contact_${Date.now()}`, createdAt: new Date(), status: message?.status ?? "unread", ...message };
      },
      async createNewsletterSubscriber(subscriber: any) {
        return {
          id: `subscriber_${Date.now()}`,
          createdAt: new Date(),
          status: "active",
          ...subscriber,
        };
      },
      async getNewsletterSubscribers() {
        return [];
      },
      async unsubscribeNewsletter() {
        return true;
      },
    },
    __mockUsers: mockUsers,
    __reset() {
      mockUsers.length = 0;
    },
  };
});

export const resetMockStorage = async () => {
  const storageModule: any = await import("../../../server/storage");
  if (typeof storageModule.__reset === "function") {
    storageModule.__reset();
  } else if (Array.isArray(storageModule.__mockUsers)) {
    storageModule.__mockUsers.length = 0;
  }
};

export const addMockUser = (user: MockUser) => {
  mockUsers.push(user);
};

export const getMockUsers = () => mockUsers;
