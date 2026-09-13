import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import request from 'supertest';

import config from '../../src/app/config';
import app from '../../src/app';
import { User } from '../../src/app/modules/user/user.model';

jest.mock('../../src/app/middlewares/auth', () => {
  const principals: Record<
    string,
    {
      clerkUserId: string;
      email: string;
      userId: string;
      role: 'lawyer' | 'admin' | 'client';
      emailVerified: boolean;
    }
  > = {
    'lawyer-token': {
      clerkUserId: 'seed-clerk-lawyer',
      email: 'imoral223489@bscse.uiu.ac.bd',
      userId: 'LAW-0001',
      role: 'lawyer',
      emailVerified: true,
    },
    'admin-token': {
      clerkUserId: 'seed-clerk-admin',
      email: 'ihmorol@gmail.com',
      userId: 'ADM-0001',
      role: 'admin',
      emailVerified: true,
    },
    'client-token': {
      clerkUserId: 'seed-clerk-client',
      email: 'ekramulhasane69@gmail.com',
      userId: 'CLI-0001',
      role: 'client',
      emailVerified: true,
    },
  };

  return (...requiredRoles: string[]) => (req: any, res: any, next: any) => {
    const header = req.headers.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing bearer token' });
    }

    const token = header.slice(7);
    const principal = principals[token];
    if (!principal) {
      return res.status(401).json({ success: false, message: 'Invalid smoke token' });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(principal.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden by role gate' });
    }

    req.user = principal;
    return next();
  };
});

type HttpMethod = 'get' | 'post';

type SmokeCase = {
  name: string;
  method: HttpMethod;
  path: string;
  token?: 'lawyer-token' | 'admin-token' | 'client-token';
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  expected: number[];
};

type SmokeResult = {
  name: string;
  status: number;
  passed: boolean;
  expected: string;
};

const smokeCases: SmokeCase[] = [
  {
    name: 'Health endpoint',
    method: 'get',
    path: '/api/v1/health',
    expected: [200],
  },
  {
    name: 'Subscription plans public endpoint',
    method: 'get',
    path: '/api/v1/subscriptions/plans',
    expected: [200],
  },
  {
    name: 'Lawyer list cases',
    method: 'get',
    path: '/api/v1/cases',
    token: 'lawyer-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Client list cases',
    method: 'get',
    path: '/api/v1/cases',
    token: 'client-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Lawyer list own documents',
    method: 'get',
    path: '/api/v1/documents/my-documents',
    token: 'lawyer-token',
    expected: [200],
  },
  {
    name: 'Lawyer list messages',
    method: 'get',
    path: '/api/v1/messages',
    token: 'lawyer-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Client list notifications',
    method: 'get',
    path: '/api/v1/notifications',
    token: 'client-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Lawyer list schedules',
    method: 'get',
    path: '/api/v1/schedules',
    token: 'lawyer-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Lawyer analytics case metrics',
    method: 'get',
    path: '/api/v1/analytics/metrics/cases',
    token: 'lawyer-token',
    expected: [200],
  },
  {
    name: 'Community public thread list',
    method: 'get',
    path: '/api/v1/community/threads',
    expected: [200],
  },
  {
    name: 'Lawyer community engagement metrics',
    method: 'get',
    path: '/api/v1/community/metrics/engagement',
    token: 'lawyer-token',
    expected: [200],
  },
  {
    name: 'Client community assist similar threads',
    method: 'post',
    path: '/api/v1/community/assist/similar',
    token: 'client-token',
    body: {
      title: 'Urgent hearing preparation checklist',
      content: 'Need practical steps before hearing and document review order.',
    },
    expected: [200],
  },
  {
    name: 'Lawyer AI tools history',
    method: 'get',
    path: '/api/v1/ai/tools/history',
    token: 'lawyer-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Lawyer AI context profile',
    method: 'get',
    path: '/api/v1/ai/context/profile',
    token: 'lawyer-token',
    expected: [200],
  },
  {
    name: 'Client own subscription',
    method: 'get',
    path: '/api/v1/subscriptions/me',
    token: 'client-token',
    expected: [200],
  },
  {
    name: 'Client own payment history',
    method: 'get',
    path: '/api/v1/payments/me',
    token: 'client-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Admin list users',
    method: 'get',
    path: '/api/v1/admin/users',
    token: 'admin-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Admin read settings',
    method: 'get',
    path: '/api/v1/admin/settings',
    token: 'admin-token',
    expected: [200],
  },
  {
    name: 'Admin list all payments',
    method: 'get',
    path: '/api/v1/payments/all',
    token: 'admin-token',
    query: { page: '1', limit: '5' },
    expected: [200],
  },
  {
    name: 'Role gate check: client blocked from admin users',
    method: 'get',
    path: '/api/v1/admin/users',
    token: 'client-token',
    query: { page: '1', limit: '5' },
    expected: [403],
  },
];

describe('API smoke matrix (mocked auth principal)', () => {
  const results: SmokeResult[] = [];

  beforeAll(async () => {
    if (!config.database_url) {
      throw new Error('DATABASE_URL is required for smoke tests.');
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.database_url);
    }

    const seededUsers = await User.countDocuments({
      id: { $in: ['LAW-0001', 'ADM-0001', 'CLI-0001'] },
    });

    if (seededUsers !== 3) {
      throw new Error(
        'Expected seeded users not found. Run `npm run seed:db` in advyon-server first.',
      );
    }
  });

  afterAll(async () => {
    const failed = results.filter((result) => !result.passed);
    const reportLines = [
      '# API Smoke Matrix (2026-02-18)',
      '',
      '- Mode: Jest + Supertest with mocked auth principal mapping to seeded accounts.',
      '- Seed accounts used: lawyer `LAW-0001`, admin `ADM-0001`, client `CLI-0001`.',
      '- Note: This validates API behavior and role gates without Clerk token issuance flow.',
      '',
      '| Endpoint Check | HTTP Status | Expected | Result |',
      '| --- | --- | --- | --- |',
      ...results.map((result) =>
        `| ${result.name} | ${result.status} | ${result.expected} | ${result.passed ? 'PASS' : 'FAIL'} |`,
      ),
      '',
      `- Total checks: ${results.length}`,
      `- Passed: ${results.length - failed.length}`,
      `- Failed: ${failed.length}`,
    ];

    const reportPath = path.resolve(
      process.cwd(),
      '..',
      'reports',
      'all',
      'strategy',
      'api-smoke-matrix-2026-02-18.md',
    );

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('runs endpoint smoke matrix', async () => {
    for (const smokeCase of smokeCases) {
      let req = request(app)[smokeCase.method](smokeCase.path);

      if (smokeCase.token) {
        req = req.set('Authorization', `Bearer ${smokeCase.token}`);
      }

      if (smokeCase.query) {
        req = req.query(smokeCase.query);
      }

      if (smokeCase.body) {
        req = req.send(smokeCase.body);
      }

      const response = await req;
      const passed = smokeCase.expected.includes(response.status);

      results.push({
        name: smokeCase.name,
        status: response.status,
        passed,
        expected: smokeCase.expected.join(', '),
      });
    }

    const failures = results.filter((result) => !result.passed);
    expect(failures).toHaveLength(0);
  });
});
