import { http, HttpResponse } from 'msw';
import { mockUsers, mockProjects, mockCreditTransactions } from './mockData';

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    const user = mockUsers.find((u) => u.email === body.email);
    
    if (!user) {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    return HttpResponse.json({
      user,
      token: 'mock-jwt-token-' + user.id,
    });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as { email: string; password: string; name: string };
    
    const newUser = {
      id: 'user-' + Date.now(),
      email: body.email,
      name: body.name,
      credits: 100,
      subscriptionStatus: 'free',
      createdAt: new Date().toISOString(),
    };
    
    return HttpResponse.json({
      user: newUser,
      token: 'mock-jwt-token-' + newUser.id,
    });
  }),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await request.json() as { email: string };
    return HttpResponse.json({ success: true, message: 'Password reset email sent' });
  }),

  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = await request.json() as { token: string; password: string };
    return HttpResponse.json({ success: true, message: 'Password reset successful' });
  }),

  // User endpoints
  http.get('/api/user', () => {
    return HttpResponse.json(mockUsers[0]);
  }),

  // Projects endpoints
  http.get('/api/projects', () => {
    return HttpResponse.json(mockProjects);
  }),

  http.get('/api/projects/:id', ({ params }) => {
    const project = mockProjects.find((p) => p.id === params.id);
    if (!project) {
      return HttpResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return HttpResponse.json(project);
  }),

  http.post('/api/projects', async ({ request }) => {
    const body = await request.json() as { title: string };
    const newProject = {
      id: 'project-' + Date.now(),
      title: body.title,
      status: 'ai-generated',
      userId: mockUsers[0].id,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(newProject);
  }),

  http.delete('/api/projects/:id', ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // Credit transactions
  http.get('/api/credit-transactions', () => {
    return HttpResponse.json(mockCreditTransactions);
  }),

  http.post('/api/deduct-credits', async ({ request }) => {
    const body = await request.json() as { credits: number; description: string };
    return HttpResponse.json({
      success: true,
      creditsDeducted: body.credits,
      newBalance: mockUsers[0].credits - body.credits,
    });
  }),

  // Image processing endpoints
  http.post('/api/upscale', async ({ request }) => {
    return HttpResponse.json({
      success: true,
      upscaledImageUrl: 'https://example.com/upscaled.jpg',
      creditsUsed: 1,
    });
  }),

  http.post('/api/remove-background', async ({ request }) => {
    return HttpResponse.json({
      success: true,
      imageBase64: 'data:image/png;base64,mock-image-data',
      creditsUsed: 2,
      newBalance: mockUsers[0].credits - 2,
    });
  }),

  http.post('/api/generate-mockups', async ({ request }) => {
    return HttpResponse.json({
      success: true,
      mockups: [
        { id: '1', url: 'https://example.com/mockup1.jpg', template: 'bedroom' },
        { id: '2', url: 'https://example.com/mockup2.jpg', template: 'living-room' },
      ],
      creditsUsed: 5,
    });
  }),

  http.post('/api/generate-print-formats', async ({ request }) => {
    return HttpResponse.json({
      success: true,
      formats: [
        { size: '8x10', url: 'https://example.com/8x10.jpg' },
        { size: '11x14', url: 'https://example.com/11x14.jpg' },
      ],
      creditsUsed: 3,
    });
  }),

  http.post('/api/generate-listing', async ({ request }) => {
    return HttpResponse.json({
      success: true,
      listing: {
        title: 'Beautiful Digital Art Print',
        description: 'High-quality digital art print...',
        tags: ['art', 'print', 'digital'],
      },
      creditsUsed: 2,
    });
  }),

  // Payment endpoints
  http.post('/api/purchase-credits', async ({ request }) => {
    return HttpResponse.json({
      authorization_url: 'https://paystack.com/pay/mock-reference',
      access_code: 'mock-access-code',
      reference: 'mock-reference-' + Date.now(),
    });
  }),

  http.get('/api/verify-payment/:reference', ({ params }) => {
    return HttpResponse.json({
      success: true,
      credits: 500,
      message: '500 credits added successfully',
    });
  }),
];
