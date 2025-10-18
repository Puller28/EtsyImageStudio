import { faker } from '@faker-js/faker';

// Mock Users
export const mockUsers = [
  {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    credits: 100,
    avatar: faker.image.avatar(),
    subscriptionStatus: 'free',
    subscriptionPlan: null,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'user-2',
    email: 'premium@example.com',
    name: 'Premium User',
    credits: 500,
    avatar: faker.image.avatar(),
    subscriptionStatus: 'active',
    subscriptionPlan: 'pro_monthly',
    createdAt: new Date('2025-01-15').toISOString(),
  },
];

// Mock Projects
export const mockProjects = [
  {
    id: 'project-1',
    title: 'Swedish Girl',
    status: 'completed',
    userId: 'user-1',
    createdAt: new Date('2025-10-16').toISOString(),
    hasUpscaledImage: true,
    hasMockupImages: true,
    hasResizedImages: true,
  },
  {
    id: 'project-2',
    title: 'Woman',
    status: 'completed',
    userId: 'user-1',
    createdAt: new Date('2025-10-16').toISOString(),
    hasUpscaledImage: true,
    hasMockupImages: false,
    hasResizedImages: false,
  },
  {
    id: 'project-3',
    title: 'Woman on the beach',
    status: 'ai-generated',
    userId: 'user-1',
    createdAt: new Date('2025-10-16').toISOString(),
    hasUpscaledImage: false,
    hasMockupImages: false,
    hasResizedImages: false,
  },
];

// Mock Credit Transactions
export const mockCreditTransactions = [
  {
    id: 'tx-1',
    userId: 'user-1',
    amount: -1,
    type: 'spend',
    description: 'Image upscale',
    createdAt: new Date('2025-10-17').toISOString(),
  },
  {
    id: 'tx-2',
    userId: 'user-1',
    amount: -2,
    type: 'spend',
    description: 'Background removal',
    createdAt: new Date('2025-10-17').toISOString(),
  },
  {
    id: 'tx-3',
    userId: 'user-1',
    amount: 100,
    type: 'purchase',
    description: 'Credit package purchase',
    createdAt: new Date('2025-10-16').toISOString(),
  },
];

// Helper to generate mock project
export function createMockProject(overrides = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    status: 'ai-generated',
    userId: 'user-1',
    createdAt: new Date().toISOString(),
    hasUpscaledImage: false,
    hasMockupImages: false,
    hasResizedImages: false,
    ...overrides,
  };
}

// Helper to generate mock user
export function createMockUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    credits: 100,
    avatar: faker.image.avatar(),
    subscriptionStatus: 'free',
    subscriptionPlan: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
