import { Router } from 'express';

import { AuthRoutes } from '../modules/auth/auth.route';
import { UserRoutes } from '../modules/user/user.route';
import { CaseRoutes } from '../modules/case/case.route';
import { DocumentRoutes } from '../modules/document/document.route';
import { ActivityRoutes } from '../modules/activity/activity.route';
import { InsightRoutes } from '../modules/insight/insight.route';
import { NotificationRoutes } from '../modules/notification/notification.route';
import { CaseAccessRoutes } from '../modules/caseAccess/caseAccess.route';
import { MetadataRoutes } from '../modules/metadata/metadata.route';
import { AdminRoutes } from '../modules/admin/admin.route';
import { DashboardRoutes } from '../modules/dashboard/dashboard.route';
import { AIRoutes } from '../modules/ai/ai.route';
import { LegalRoutes } from '../modules/legal/legal.route';
import { MessageRoutes } from '../modules/message/message.route';
import { CommunityRoutes } from '../modules/community/community.route';
import { ScheduleRoutes } from '../modules/schedule/schedule.route';
import { AnalyticsRoutes } from '../modules/analytics/analytics.route';
import { SubscriptionRoutes } from '../modules/subscription/subscription.route';
import { PaymentRoutes } from '../modules/payment/payment.route';
import { ContactRoutes } from '../modules/contact/contact.route';
import { ChatRoutes } from '../modules/chat/chat.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/schedules',
    route: ScheduleRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/cases',
    route: CaseRoutes,
  },
  {
    path: '/documents',
    route: DocumentRoutes,
  },
  {
    path: '/activities',
    route: ActivityRoutes,
  },
  {
    path: '/ai-insights',
    route: InsightRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
  {
    path: '/case-access',
    route: CaseAccessRoutes,
  },
  {
    path: '/metadata',
    route: MetadataRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/dashboard',
    route: DashboardRoutes,
  },
  {
    path: '/ai',
    route: AIRoutes,
  },
  {
    path: '/legal',
    route: LegalRoutes,
  },
  {
    path: '/messages',
    route: MessageRoutes,
  },
  {
    path: '/community',
    route: CommunityRoutes,
  },
  {
    path: '/analytics',
    route: AnalyticsRoutes,
  },
  {
    path: '/subscriptions',
    route: SubscriptionRoutes,
  },
  {
    path: '/payments',
    route: PaymentRoutes,
  },
  {
    path: '/contact',
    route: ContactRoutes,
  },
  {
    path: '/chat',
    route: ChatRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
