import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../src/app';
import config from '../../src/app/config';
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

type FlowResult = {
  flow: string;
  check: string;
  status: number;
  expected: string;
  passed: boolean;
};

describe('Feature flow checklist (seeded 3-account context)', () => {
  const results: FlowResult[] = [];

  const call = async (params: {
    flow: string;
    check: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    token: 'lawyer-token' | 'admin-token' | 'client-token';
    expected: number[];
    query?: Record<string, string>;
    body?: Record<string, unknown>;
  }) => {
    let req = request(app)[params.method](params.path).set(
      'Authorization',
      `Bearer ${params.token}`,
    );

    if (params.query) req = req.query(params.query);
    if (params.body) req = req.send(params.body);

    const res = await req;
    const passed = params.expected.includes(res.status);

    results.push({
      flow: params.flow,
      check: params.check,
      status: res.status,
      expected: params.expected.join(', '),
      passed,
    });

    return res;
  };

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
    const failed = results.filter((item) => !item.passed);

    const report = [
      '# Feature Flow Checklist (2026-02-18)',
      '',
      '- Mode: Jest + Supertest workflow checks with mocked auth principals mapped to seeded accounts.',
      '- Accounts: lawyer `LAW-0001`, admin `ADM-0001`, client `CLI-0001`.',
      '- Scope: Admin, billing, schedule, message, notification, case lifecycle flows.',
      '',
      '| Flow | Check | HTTP Status | Expected | Result |',
      '| --- | --- | --- | --- | --- |',
      ...results.map(
        (item) =>
          `| ${item.flow} | ${item.check} | ${item.status} | ${item.expected} | ${item.passed ? 'PASS' : 'FAIL'} |`,
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
      'feature-flow-checklist-2026-02-18.md',
    );

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report.join('\n'), 'utf8');

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('validates key post-merge feature flows', async () => {
    const caseList = await call({
      flow: 'Case',
      check: 'Lawyer list cases',
      method: 'get',
      path: '/api/v1/cases',
      token: 'lawyer-token',
      expected: [200],
      query: { page: '1', limit: '5' },
    });

    const firstCaseId = caseList.body?.data?.[0]?.id as string;
    if (!firstCaseId) {
      throw new Error('No seeded case found for lawyer flow checks.');
    }

    const newCaseNumber = `SMOKE-${Date.now()}`;
    const createdCase = await call({
      flow: 'Case',
      check: 'Lawyer create case',
      method: 'post',
      path: '/api/v1/cases',
      token: 'lawyer-token',
      expected: [201],
      body: {
        title: 'Smoke Flow Case',
        caseNumber: newCaseNumber,
        caseType: 'Civil Litigation',
        urgency: 'high',
      },
    });

    const createdCaseId = createdCase.body?.data?.id as string;
    if (!createdCaseId) {
      throw new Error('Created case ID missing in response.');
    }

    await call({
      flow: 'Case',
      check: 'Lawyer update case status',
      method: 'put',
      path: `/api/v1/cases/${createdCaseId}`,
      token: 'lawyer-token',
      expected: [200],
      body: { status: 'review' },
    });

    await call({
      flow: 'Case',
      check: 'Lawyer archive case',
      method: 'patch',
      path: `/api/v1/cases/${createdCaseId}/archive`,
      token: 'lawyer-token',
      expected: [200, 400],
    });

    await call({
      flow: 'Case',
      check: 'Lawyer restore case',
      method: 'patch',
      path: `/api/v1/cases/${createdCaseId}/restore`,
      token: 'lawyer-token',
      expected: [200, 400],
    });

    const scheduleDate = new Date().toISOString();
    const createdSchedule = await call({
      flow: 'Schedule',
      check: 'Lawyer create schedule event',
      method: 'post',
      path: '/api/v1/schedules',
      token: 'lawyer-token',
      expected: [201],
      body: {
        title: 'Smoke Hearing Event',
        description: 'Schedule flow smoke event',
        eventType: 'hearing',
        date: scheduleDate,
        startTime: '09:00',
        endTime: '10:00',
        location: 'Virtual Courtroom',
        caseId: createdCaseId,
        participants: ['LAW-0001', 'CLI-0001'],
      },
    });

    const scheduleId = createdSchedule.body?.data?._id as string;
    if (!scheduleId) {
      throw new Error('Created schedule ID missing in response.');
    }

    await call({
      flow: 'Schedule',
      check: 'Lawyer list schedules',
      method: 'get',
      path: '/api/v1/schedules',
      token: 'lawyer-token',
      expected: [200],
      query: { page: '1', limit: '5' },
    });

    await call({
      flow: 'Schedule',
      check: 'Lawyer check schedule conflict',
      method: 'get',
      path: '/api/v1/schedules/conflicts',
      token: 'lawyer-token',
      expected: [200],
      query: {
        date: scheduleDate,
        startTime: '09:15',
        endTime: '09:45',
      },
    });

    await call({
      flow: 'Schedule',
      check: 'Lawyer delete schedule event',
      method: 'delete',
      path: `/api/v1/schedules/${scheduleId}`,
      token: 'lawyer-token',
      expected: [200],
    });

    const createdMessage = await call({
      flow: 'Message',
      check: 'Lawyer send message to client',
      method: 'post',
      path: '/api/v1/messages',
      token: 'lawyer-token',
      expected: [201],
      body: {
        receiverId: 'CLI-0001',
        caseId: createdCaseId,
        subject: 'Smoke message subject',
        content: 'Please review smoke flow message.',
        priority: 'high',
      },
    });

    let messageId =
      (createdMessage.body?.data?._id as string) ||
      (createdMessage.body?.data?.id as string);

    if (!messageId) {
      const messageList = await call({
        flow: 'Message',
        check: 'Client list messages',
        method: 'get',
        path: '/api/v1/messages',
        token: 'client-token',
        expected: [200],
        query: { page: '1', limit: '20' },
      });

      const fromList = (messageList.body?.data?.messages || []).find(
        (item: any) => item?.subject === 'Smoke message subject',
      );

      messageId = (fromList?._id as string) || (fromList?.id as string);
    }

    if (!messageId) {
      throw new Error('Created message ID missing in response and message list fallback.');
    }

    await call({
      flow: 'Message',
      check: 'Client view pending message count',
      method: 'get',
      path: '/api/v1/messages/pending/count',
      token: 'client-token',
      expected: [200],
    });

    await call({
      flow: 'Message',
      check: 'Client mark message as read',
      method: 'patch',
      path: `/api/v1/messages/${messageId}/read`,
      token: 'client-token',
      expected: [200],
    });

    await call({
      flow: 'Message',
      check: 'Client star message',
      method: 'patch',
      path: `/api/v1/messages/${messageId}/star`,
      token: 'client-token',
      expected: [200],
    });

    await call({
      flow: 'Message',
      check: 'Client archive message',
      method: 'delete',
      path: `/api/v1/messages/${messageId}`,
      token: 'client-token',
      expected: [200],
    });

    const createdNotification = await call({
      flow: 'Notification',
      check: 'Admin send test notification',
      method: 'post',
      path: '/api/v1/notifications/send-test',
      token: 'admin-token',
      expected: [201],
      body: {
        type: 'message',
        title: 'Smoke notification',
        message: 'This is a smoke notification for client.',
        recipientId: 'CLI-0001',
        caseId: firstCaseId,
      },
    });

    const notificationId =
      (createdNotification.body?.data?._id as string) ||
      (createdNotification.body?.data?.id as string);
    if (!notificationId) {
      throw new Error('Created notification ID missing in response.');
    }

    await call({
      flow: 'Notification',
      check: 'Client mark notification as read',
      method: 'patch',
      path: `/api/v1/notifications/${notificationId}/read`,
      token: 'client-token',
      expected: [200],
    });

    await call({
      flow: 'Notification',
      check: 'Client delete notification',
      method: 'delete',
      path: `/api/v1/notifications/${notificationId}`,
      token: 'client-token',
      expected: [200],
    });

    await call({
      flow: 'Admin',
      check: 'Admin list users',
      method: 'get',
      path: '/api/v1/admin/users',
      token: 'admin-token',
      expected: [200],
      query: { page: '1', limit: '10' },
    });

    await call({
      flow: 'Admin',
      check: 'Admin update system settings',
      method: 'patch',
      path: '/api/v1/admin/settings',
      token: 'admin-token',
      expected: [200],
      body: { sessionTimeoutMinutes: 75, features: { notifications: true } },
    });

    await call({
      flow: 'Admin',
      check: 'Admin analytics overview',
      method: 'get',
      path: '/api/v1/admin/analytics',
      token: 'admin-token',
      expected: [200],
    });

    await call({
      flow: 'Admin',
      check: 'Admin audit logs',
      method: 'get',
      path: '/api/v1/admin/audit-logs',
      token: 'admin-token',
      expected: [200],
      query: { page: '1', limit: '5' },
    });

    await call({
      flow: 'Billing',
      check: 'Client current subscription',
      method: 'get',
      path: '/api/v1/subscriptions/me',
      token: 'client-token',
      expected: [200],
    });

    await call({
      flow: 'Billing',
      check: 'Client payment history',
      method: 'get',
      path: '/api/v1/payments/me',
      token: 'client-token',
      expected: [200],
      query: { page: '1', limit: '5' },
    });

    await call({
      flow: 'Billing',
      check: 'Admin payment history (all)',
      method: 'get',
      path: '/api/v1/payments/all',
      token: 'admin-token',
      expected: [200],
      query: { page: '1', limit: '5' },
    });

    const stripeExpected = process.env.STRIPE_SECRET_KEY ? [200] : [503];
    await call({
      flow: 'Billing',
      check: 'Client checkout session path',
      method: 'post',
      path: '/api/v1/subscriptions/checkout',
      token: 'client-token',
      expected: stripeExpected,
      body: {
        plan: 'starter',
        billingInterval: 'month',
        successUrl: 'http://localhost:5173/billing/success',
        cancelUrl: 'http://localhost:5173/billing/cancel',
      },
    });

    await call({
      flow: 'Role Gate',
      check: 'Client blocked from admin users',
      method: 'get',
      path: '/api/v1/admin/users',
      token: 'client-token',
      expected: [403],
      query: { page: '1', limit: '5' },
    });

    await call({
      flow: 'Role Gate',
      check: 'Client blocked from notification send-test',
      method: 'post',
      path: '/api/v1/notifications/send-test',
      token: 'client-token',
      expected: [403],
      body: {
        type: 'message',
        title: 'Forbidden check',
        message: 'Client should not be able to send test notification',
        recipientId: 'LAW-0001',
      },
    });

    const failed = results.filter((item) => !item.passed);
    expect(failed).toHaveLength(0);
  });
});
