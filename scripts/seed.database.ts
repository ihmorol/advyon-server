import bcrypt from 'bcrypt';
import mongoose, { Types } from 'mongoose';

import config from '../src/app/config';
import { ActivityModel } from '../src/app/modules/activity/activity.model';
import {
  AIConversationContextModel,
  AIPersonalizationProfileModel,
} from '../src/app/modules/ai/ai.context.model';
import { AIToolHistoryModel } from '../src/app/modules/ai/ai.tool.model';
import { AI_TOOL_KEYS } from '../src/app/modules/ai/ai.tool.interface';
import { AuditLog } from '../src/app/modules/admin/auditLog.model';
import { SystemSettings } from '../src/app/modules/admin/systemSettings.model';
import { Case } from '../src/app/modules/case/case.model';
import {
  CaseStatus,
  CaseTypes,
  CaseUrgency,
  DEFAULT_CASE_FOLDERS,
} from '../src/app/modules/case/case.constant';
import { CaseAccessModel } from '../src/app/modules/caseAccess/caseAccess.model';
import { CommunityEngagementEventModel } from '../src/app/modules/community/community.kpi.model';
import {
  ModerationAppeal,
  ModerationReview,
} from '../src/app/modules/community/community.moderation.model';
import { Reply, Thread } from '../src/app/modules/community/community.model';
import { DocumentModel } from '../src/app/modules/document/document.model';
import { DocumentCategory } from '../src/app/modules/document/document.constant';
import { Legal } from '../src/app/modules/legal/legal.model';
import { Message } from '../src/app/modules/message/message.model';
import { NotificationModel } from '../src/app/modules/notification/notification.model';
import { Payment } from '../src/app/modules/payment/payment.model';
import { Schedule } from '../src/app/modules/schedule/schedule.model';
import {
  BILLING_INTERVALS,
  PLAN_TIERS,
  SUBSCRIPTION_STATUSES,
} from '../src/app/modules/subscription/subscription.constant';
import { Subscription } from '../src/app/modules/subscription/subscription.model';
import { Personalization } from '../src/app/modules/user/personalization.model';
import { ClientProfile, JudgeProfile, LawyerProfile } from '../src/app/modules/user/profile.model';
import { Role } from '../src/app/modules/user/role.model';
import { UserRole } from '../src/app/modules/user/user-role.model';
import { User } from '../src/app/modules/user/user.model';

const args = new Set(process.argv.slice(2));
const shouldReset = args.has('--reset');
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const MIN_RECORDS = Math.max(Number(process.env.SEED_RECORDS_PER_COLLECTION ?? 10), 10);

const now = new Date();

const threadCategories = [
  'Family Law',
  'Criminal Defense',
  'Civil Litigation',
  'Property Law',
  'Corporate',
  'Intellectual Property',
  'Others',
] as const;

type SeedUser = {
  _id: Types.ObjectId;
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'client' | 'lawyer';
};

type SeedCase = {
  _id: Types.ObjectId;
  id: string;
  caseNumber: string;
  title: string;
  createdBy: Types.ObjectId;
  clientId?: Types.ObjectId;
};

type SeedDocument = {
  _id: Types.ObjectId;
  id: string;
  caseId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  fileName: string;
};

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)] as T;

const rand = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const daysFromNow = (minOffset: number, maxOffset: number): Date => {
  const date = new Date(now);
  date.setDate(date.getDate() + rand(minOffset, maxOffset));
  return date;
};

const businessId = (prefix: string, index: number): string =>
  `${prefix}-${String(index).padStart(4, '0')}`;

const assertSafeExecution = (): void => {
  if (!shouldReset) {
    throw new Error('Seeder requires --reset to avoid duplicate/mixed records.');
  }

  if (!config.database_url) {
    throw new Error('DATABASE_URL is missing in advyon-server/.env');
  }

  if (config.NODE_ENV === 'production' && !force) {
    throw new Error('Refusing to run reset seed in production (use --force only when intentional).');
  }
};

const clearCollections = async (): Promise<void> => {
  await Promise.all([
    UserRole.deleteMany({}),
    ClientProfile.deleteMany({}),
    LawyerProfile.deleteMany({}),
    JudgeProfile.deleteMany({}),
    Personalization.deleteMany({}),
    AIPersonalizationProfileModel.deleteMany({}),
    AIConversationContextModel.deleteMany({}),
    AIToolHistoryModel.deleteMany({}),
    CommunityEngagementEventModel.deleteMany({}),
    ModerationAppeal.deleteMany({}),
    ModerationReview.deleteMany({}),
    Reply.deleteMany({}),
    Thread.deleteMany({}),
    NotificationModel.deleteMany({}),
    Message.deleteMany({}),
    Schedule.deleteMany({}),
    ActivityModel.deleteMany({}),
    DocumentModel.deleteMany({}),
    CaseAccessModel.deleteMany({}),
    Payment.deleteMany({}),
    Subscription.deleteMany({}),
    AuditLog.deleteMany({}),
    Legal.deleteMany({}),
    Case.deleteMany({}),
    Role.deleteMany({}),
    User.deleteMany({}),
    SystemSettings.deleteMany({}),
  ]);
};

const seedRoles = async () => {
  const roleDocs = [
    { id: businessId('ROLE', 1), code: 'super-admin', name: 'Super Admin', description: 'Platform owner role' },
    { id: businessId('ROLE', 2), code: 'admin', name: 'Admin', description: 'Administrative role' },
    { id: businessId('ROLE', 3), code: 'lawyer', name: 'Lawyer', description: 'Legal practitioner role' },
    { id: businessId('ROLE', 4), code: 'client', name: 'Client', description: 'Client role' },
    { id: businessId('ROLE', 5), code: 'judge', name: 'Judge', description: 'Court authority role' },
    { id: businessId('ROLE', 6), code: 'case-manager', name: 'Case Manager', description: 'Case operations role' },
    { id: businessId('ROLE', 7), code: 'billing-manager', name: 'Billing Manager', description: 'Billing operations role' },
    { id: businessId('ROLE', 8), code: 'compliance', name: 'Compliance Officer', description: 'Compliance role' },
    { id: businessId('ROLE', 9), code: 'moderator', name: 'Community Moderator', description: 'Community moderation role' },
    { id: businessId('ROLE', 10), code: 'analyst', name: 'Analytics Analyst', description: 'Analytics and KPI role' },
  ];

  await Role.insertMany(roleDocs);
  return await Role.find({}, '_id id code').lean();
};

const seedUsers = async (): Promise<SeedUser[]> => {
  const saltRounds = Number(config.bcrypt_salt_rounds) || 10;

  await User.insertMany([
    {
      id: 'LAW-0001',
      email: 'imoral223489@bscse.uiu.ac.bd',
      password: await bcrypt.hash('imoral223489$123', saltRounds),
      fullName: 'Imoral Hossain',
      displayName: 'Imoral',
      role: 'lawyer',
      primaryRole: 'lawyer',
      status: 'active',
      isDeleted: false,
      isEmailVerified: true,
      needsPasswordChange: false,
      preferredLanguage: 'en',
      timezone: 'Asia/Dhaka',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Imoral%20Hossain',
      phone: '+8801710000001',
      address: 'Dhaka, Bangladesh',
      bio: 'Seeded lawyer account for QA verification.',
      preferences: {
        theme: 'system',
        notifications: {
          emailDigest: true,
          pushAlerts: true,
          hearingReminders: true,
        },
        dashboardConfig: {
          showActivityFeed: true,
          showAIInsights: true,
          defaultView: 'classic',
        },
      },
    },
    {
      id: 'ADM-0001',
      email: 'ihmorol@gmail.com',
      password: await bcrypt.hash('ihmorol$123', saltRounds),
      fullName: 'Ih Morol',
      displayName: 'Morol Admin',
      role: 'admin',
      primaryRole: 'admin',
      status: 'active',
      isDeleted: false,
      isEmailVerified: true,
      needsPasswordChange: false,
      preferredLanguage: 'en',
      timezone: 'Asia/Dhaka',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Ih%20Morol',
      phone: '+8801710000002',
      address: 'Dhaka, Bangladesh',
      bio: 'Seeded admin account for governance and billing verification.',
      preferences: {
        theme: 'light',
        notifications: {
          emailDigest: true,
          pushAlerts: true,
          hearingReminders: true,
        },
        dashboardConfig: {
          showActivityFeed: true,
          showAIInsights: true,
          defaultView: 'kanban',
        },
      },
    },
    {
      id: 'CLI-0001',
      email: 'ekramulhasane69@gmail.com',
      password: await bcrypt.hash('ekramulhasane69$123', saltRounds),
      fullName: 'Ekramul Hasan',
      displayName: 'Ekramul',
      role: 'client',
      primaryRole: 'client',
      status: 'active',
      isDeleted: false,
      isEmailVerified: true,
      needsPasswordChange: false,
      preferredLanguage: 'en',
      timezone: 'Asia/Dhaka',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Ekramul%20Hasan',
      phone: '+8801710000003',
      address: 'Dhaka, Bangladesh',
      bio: 'Seeded client account for user journey verification.',
      preferences: {
        theme: 'dark',
        notifications: {
          emailDigest: true,
          pushAlerts: false,
          hearingReminders: true,
        },
        dashboardConfig: {
          showActivityFeed: true,
          showAIInsights: false,
          defaultView: 'classic',
        },
      },
    },
  ]);

  const users = (await User.find({}, '_id id email fullName role').lean()) as SeedUser[];
  if (users.length !== 3) {
    throw new Error(`Expected 3 seeded users, found ${users.length}.`);
  }

  return users;
};

const seedProfilesAndUserRoles = async (
  users: SeedUser[],
  roles: Array<{ _id: Types.ObjectId; id: string; code: string }>,
) => {
  const byRole = {
    lawyer: users.find((u) => u.role === 'lawyer') as SeedUser,
    admin: users.find((u) => u.role === 'admin') as SeedUser,
    client: users.find((u) => u.role === 'client') as SeedUser,
  };

  await ClientProfile.create({
    id: byRole.client.id,
    userId: byRole.client._id.toString(),
    phoneNumber: '+8801912345678',
    address: 'Client Residence, Dhaka',
  });

  await LawyerProfile.create({
    id: byRole.lawyer.id,
    userId: byRole.lawyer._id.toString(),
    barRegistrationNumber: 'BAR-2026-1001',
    barCouncilName: 'Bangladesh Bar Council',
    yearsOfExperience: 7,
    primaryPracticeArea: 'Civil Litigation',
    verificationStatus: 'verified',
    verificationNotes: 'Seeded verified lawyer profile.',
  });

  await JudgeProfile.create({
    id: 'JDG-0001',
    userId: byRole.admin._id.toString(),
    courtName: 'Dhaka District Court',
    designation: 'Acting Judge (Seed)',
    verificationStatus: 'verified',
  });

  const roleAssignments = roles.map((role, index) => {
    const assignedUser = users[index % users.length] as SeedUser;
    return {
      id: businessId('UR', index + 1),
      userId: assignedUser._id.toString(),
      roleId: role._id.toString(),
      isPrimary:
        (assignedUser.role === 'lawyer' && role.code === 'lawyer') ||
        (assignedUser.role === 'admin' && role.code === 'admin') ||
        (assignedUser.role === 'client' && role.code === 'client'),
      createdByUserId: byRole.admin._id.toString(),
    };
  });

  await UserRole.insertMany(roleAssignments);
};

const seedCases = async (users: SeedUser[]): Promise<SeedCase[]> => {
  const lawyer = users.find((u) => u.role === 'lawyer') as SeedUser;
  const admin = users.find((u) => u.role === 'admin') as SeedUser;
  const client = users.find((u) => u.role === 'client') as SeedUser;

  const caseTitles = [
    'Fraud Defense Preparation',
    'Commercial Contract Risk Review',
    'Civil Property Dispute Filing',
    'Employment Arbitration Dossier',
    'Urgent Injunction Documentation',
    'Regulatory Compliance Audit',
    'Tax Appeal Evidence Bundle',
    'Trademark Objection Strategy',
    'Client Settlement Negotiation',
    'Real Estate Title Dispute',
    'Corporate Liability Assessment',
    'Digital Privacy Breach Claim',
  ];

  const payload = caseTitles.map((title, index) => {
    const owner = index % 4 === 0 ? admin : lawyer;
    const status = pick(CaseStatus as unknown as string[]);
    const type = pick(CaseTypes as unknown as string[]);

    return {
      id: businessId('CS', index + 1),
      caseNumber: `ADV-2026-${String(2000 + index).padStart(4, '0')}`,
      title,
      caseType: type,
      status,
      urgency: pick(CaseUrgency as unknown as string[]),
      nextDeadline: daysFromNow(3, 50),
      nextDeadlineDescription: `Submit updated records for ${type}.`,
      progress: rand(10, 95),
      createdBy: owner._id,
      clientId: client._id,
      folders: DEFAULT_CASE_FOLDERS,
      isDeleted: false,
      autoArchiveScheduled: status === 'archived',
      archivedAt: status === 'archived' ? daysFromNow(-25, -3) : undefined,
      archivedBy: status === 'archived' ? owner._id : undefined,
    };
  });

  await Case.insertMany(payload);
  return (await Case.find({}, '_id id caseNumber title createdBy clientId').lean()) as SeedCase[];
};

const seedCaseAccess = async (cases: SeedCase[], users: SeedUser[]) => {
  const lawyer = users.find((u) => u.role === 'lawyer') as SeedUser;
  const admin = users.find((u) => u.role === 'admin') as SeedUser;
  const client = users.find((u) => u.role === 'client') as SeedUser;

  const rows: Array<{
    caseId: Types.ObjectId;
    userId: Types.ObjectId;
    grantedBy: Types.ObjectId;
    role: 'viewer' | 'editor' | 'admin';
    expiresAt: Date;
    status: 'active';
  }> = [];

  for (const caseDoc of cases) {
    rows.push({
      caseId: caseDoc._id,
      userId: client._id,
      grantedBy: caseDoc.createdBy,
      role: 'viewer',
      expiresAt: daysFromNow(30, 180),
      status: 'active',
    });

    const collaborator = caseDoc.createdBy.equals(admin._id) ? lawyer : admin;
    rows.push({
      caseId: caseDoc._id,
      userId: collaborator._id,
      grantedBy: caseDoc.createdBy,
      role: 'editor',
      expiresAt: daysFromNow(30, 180),
      status: 'active',
    });
  }

  await CaseAccessModel.insertMany(rows);
};

const seedDocuments = async (cases: SeedCase[]): Promise<SeedDocument[]> => {
  const payload: Array<Record<string, unknown>> = [];

  for (const [caseIndex, caseDoc] of cases.entries()) {
    for (let i = 0; i < 3; i++) {
      const index = caseIndex * 3 + i + 1;
      const status = pick(['pending', 'processing', 'completed', 'failed']);

      payload.push({
        id: businessId('DOC', index),
        caseId: caseDoc._id,
        folderName: pick(['Evidence', 'Legal Documents', 'Correspondence', 'Pleadings']),
        fileName: `case-${caseDoc.id.toLowerCase()}-file-${i + 1}.pdf`,
        fileType: 'pdf',
        fileSize: rand(120_000, 4_000_000),
        cloudinaryUrl: `https://res.cloudinary.com/demo/raw/upload/v2026/${caseDoc.id}/doc-${i + 1}.pdf`,
        cloudinaryPublicId: `advyon/${caseDoc.id}/doc-${i + 1}`,
        cloudinaryFileId: `asset-${caseDoc.id}-${i + 1}`,
        processingStatus: status,
        processingError: status === 'failed' ? 'Seeded processing timeout.' : undefined,
        aiAnalysis:
          status === 'completed'
            ? {
                summary: `Summary for ${caseDoc.caseNumber}`,
                rawSummary: `Detailed legal summary for ${caseDoc.title}`,
                keyPoints: ['Timeline generated', 'Risk scored', 'Next actions suggested'],
                extractedEntities: ['Client', 'Counterparty', 'Court'],
                legalRefs: [
                  { citation: 'Section 12A', description: 'Procedural obligations', relevance: 'high' },
                  { citation: 'Rule 8B', description: 'Evidence filing sequence', relevance: 'medium' },
                ],
                documentCategory: pick(DocumentCategory as unknown as string[]),
                confidenceScore: Number((Math.random() * 0.2 + 0.75).toFixed(2)),
                analyzedAt: daysFromNow(-10, 0),
                modelVersion: 'seed-v2',
              }
            : null,
        autoFiling: {
          status: status === 'completed' ? 'moved' : 'pending',
          originalFolder: 'Inbox',
          targetFolder: status === 'completed' ? pick(DocumentCategory as unknown as string[]) : 'Inbox',
          confidenceScore: status === 'completed' ? Number((Math.random() * 0.2 + 0.75).toFixed(2)) : 0,
          movedAt: status === 'completed' ? daysFromNow(-8, -1) : undefined,
        },
        analysisStatus: status === 'completed' ? 'analyzed' : 'pending',
        uploaderId: caseDoc.createdBy,
        uploadedBy: caseDoc.createdBy,
        uploadedAt: daysFromNow(-40, -1),
        isDeleted: false,
      });
    }
  }

  await DocumentModel.insertMany(payload);
  return (await DocumentModel.find({}, '_id id caseId uploadedBy fileName').lean()) as SeedDocument[];
};

const seedActivities = async (users: SeedUser[], cases: SeedCase[], docs: SeedDocument[]) => {
  const activityTypes = [
    'case_created',
    'case_updated',
    'document_uploaded',
    'document_deleted',
    'system_alert',
    'user_joined',
    'document_moved',
  ];

  const payload = Array.from({ length: Math.max(MIN_RECORDS * 3, 30) }).map((_, index) => {
    const user = users[index % users.length] as SeedUser;
    const caseDoc = cases[index % cases.length] as SeedCase;
    const doc = docs[index % docs.length] as SeedDocument;

    return {
      type: activityTypes[index % activityTypes.length],
      message: `Activity ${index + 1} for ${caseDoc.caseNumber}.`,
      userId: user._id,
      caseId: caseDoc._id,
      documentId: doc._id,
      metadata: {
        source: 'seed-script',
        actorRole: user.role,
      },
      createdAt: daysFromNow(-45, 0),
      updatedAt: daysFromNow(-40, 1),
    };
  });

  await ActivityModel.insertMany(payload);
};

const seedSchedules = async (users: SeedUser[], cases: SeedCase[]) => {
  const eventTypes = ['hearing', 'meeting', 'filing', 'deadline', 'other'];
  const statuses = ['scheduled', 'completed', 'cancelled', 'postponed'];

  const payload = Array.from({ length: Math.max(MIN_RECORDS * 2, 20) }).map((_, index) => {
    const caseDoc = cases[index % cases.length] as SeedCase;
    const startHour = rand(8, 16);

    return {
      title: `Schedule ${index + 1} - ${caseDoc.caseNumber}`,
      description: `Seeded ${eventTypes[index % eventTypes.length]} for ${caseDoc.title}.`,
      eventType: eventTypes[index % eventTypes.length],
      date: daysFromNow(-5, 60),
      startTime: `${String(startHour).padStart(2, '0')}:00`,
      endTime: `${String(startHour + 1).padStart(2, '0')}:00`,
      location: pick(['Dhaka District Court', 'Virtual Hearing Room', 'Client Office', 'Law Firm Chamber']),
      caseId: caseDoc._id,
      participants: users.map((u) => u._id),
      createdBy: caseDoc.createdBy,
      status: statuses[index % statuses.length],
      reminders: [{ time: 60, sent: false }, { time: 15, sent: false }],
      recurrence:
        index % 4 === 0
          ? {
              frequency: pick(['weekly', 'monthly']),
              interval: 1,
              endDate: daysFromNow(60, 200),
              daysOfWeek: [1, 3],
            }
          : undefined,
      resourceId: `resource-${(index % 8) + 1}`,
      metadata: {
        source: 'seed-script',
        color: pick(['#2563eb', '#059669', '#d97706']),
      },
    };
  });

  await Schedule.insertMany(payload);
};

const seedNotifications = async (users: SeedUser[], cases: SeedCase[]) => {
  const notificationTypes = [
    'alert',
    'request',
    'message',
    'case_update',
    'document_upload',
    'hearing_reminder',
    'deadline',
    'ai_analysis_complete',
  ];

  const payload = Array.from({ length: Math.max(MIN_RECORDS * 3, 30) }).map((_, index) => {
    const recipient = users[index % users.length] as SeedUser;
    const sender = users[(index + 1) % users.length] as SeedUser;
    const caseDoc = cases[index % cases.length] as SeedCase;

    return {
      type: notificationTypes[index % notificationTypes.length],
      priority: pick(['low', 'medium', 'high']),
      title: `Notification ${index + 1}`,
      message: `${caseDoc.caseNumber}: action required for ${recipient.fullName}.`,
      recipientId: recipient._id,
      senderId: sender._id,
      caseId: caseDoc._id,
      isRead: index % 4 === 0,
      metadata: {
        source: 'seed-script',
        caseNumber: caseDoc.caseNumber,
      },
      idempotencyKey: `notif-seed-${index + 1}`,
      channels: {
        inApp: true,
        email: index % 3 === 0,
        webPush: index % 5 === 0,
      },
    };
  });

  await NotificationModel.insertMany(payload);
};

const seedMessages = async (users: SeedUser[], cases: SeedCase[]) => {
  const payload = Array.from({ length: Math.max(MIN_RECORDS * 3, 30) }).map((_, index) => {
    const sender = users[index % users.length] as SeedUser;
    const receiver = users[(index + 1) % users.length] as SeedUser;
    const caseDoc = cases[index % cases.length] as SeedCase;

    return {
      senderId: sender._id,
      receiverId: receiver._id,
      caseId: caseDoc._id,
      threadId: caseDoc.id,
      subject: `Message ${index + 1} - ${caseDoc.caseNumber}`,
      content: `Please review the latest updates for ${caseDoc.title}.`,
      status: pick(['unread', 'read', 'replied', 'archived']),
      priority: pick(['low', 'medium', 'high']),
      attachments: [
        {
          name: `attachment-${index + 1}.pdf`,
          url: `https://example.com/attachments/${index + 1}.pdf`,
          type: 'application/pdf',
          size: rand(15_000, 220_000),
        },
      ],
      readAt: index % 2 === 0 ? daysFromNow(-3, 0) : undefined,
      readReceipts:
        index % 2 === 0
          ? [{ userId: receiver._id, readAt: daysFromNow(-3, 0) }]
          : [],
      isStarred: index % 7 === 0,
      templateId: `template-${(index % 4) + 1}`,
    };
  });

  await Message.insertMany(payload);
};

const seedLegal = async () => {
  const payload = Array.from({ length: Math.max(MIN_RECORDS * 2, 20) }).map((_, index) => ({
    actName: `Legal Framework Act ${2010 + index}`,
    year: String(2010 + index),
    number: `SEC-${String(100 + index).padStart(3, '0')}`,
    title: `Section ${100 + index} - Compliance Protocol`,
    chapter: `Chapter ${Math.floor(index / 2) + 1}`,
    chapterTitle: `Process Control ${Math.floor(index / 2) + 1}`,
    previewText: 'Seeded legal section preview text for search and list rendering.',
    fullText: `Seeded legal section full text body ${index + 1} for development search and legal context testing.`,
    subsections: ['(1) Scope', '(2) Duty', '(3) Penalty'],
    relatedSections: [
      `SEC-${String(80 + index).padStart(3, '0')}`,
      `SEC-${String(70 + index).padStart(3, '0')}`,
    ],
    isDeleted: false,
  }));

  await Legal.insertMany(payload);
};

const seedCommunityAndAI = async (
  users: SeedUser[],
  cases: SeedCase[],
  docs: SeedDocument[],
) => {
  const threadPayload = Array.from({ length: Math.max(MIN_RECORDS + 5, 15) }).map((_, index) => {
    const author = users[index % users.length] as SeedUser;
    return {
      title: `Thread ${index + 1}: ${pick(['Evidence strategy', 'Draft review', 'Deadline risk'])}`,
      content: `Seeded community thread ${index + 1} for legal and workflow collaboration testing.`,
      author: author._id,
      category: threadCategories[index % threadCategories.length],
      tags: ['legal', 'workflow', `seed-${(index % 6) + 1}`],
      views: rand(25, 680),
      upvotes: [users[(index + 1) % users.length]?._id],
      downvotes: [],
      upvotesCount: rand(0, 40),
      repliesCount: 0,
      isSolved: index % 4 === 0,
      isVisible: true,
      moderation: {
        status: pick(['approved', 'review', 'pending']),
        confidence: Number((Math.random() * 0.3 + 0.65).toFixed(2)),
        threshold: 0.72,
        toxicityScore: Number((Math.random() * 0.15).toFixed(2)),
        spamScore: Number((Math.random() * 0.15).toFixed(2)),
        offTopicScore: Number((Math.random() * 0.15).toFixed(2)),
        reasons: [],
        lastCheckedAt: daysFromNow(-10, 0),
      },
    };
  });

  await Thread.insertMany(threadPayload);
  const threads = await Thread.find({}, '_id title author').lean();

  const replyPayload = Array.from({ length: Math.max(MIN_RECORDS * 3, 30) }).map((_, index) => {
    const thread = threads[index % threads.length] as { _id: Types.ObjectId; author: Types.ObjectId };
    const author = users.find((u) => !u._id.equals(thread.author)) ?? users[0];

    return {
      threadId: thread._id,
      content: `Reply ${index + 1}: seeded answer for legal discussion continuity and QA workflows.`,
      author: author._id,
      upvotes: [users[(index + 2) % users.length]?._id],
      downvotes: [],
      isAcceptedAnswer: index % 9 === 0,
      isVisible: true,
      moderation: {
        status: pick(['approved', 'review', 'pending']),
        confidence: Number((Math.random() * 0.25 + 0.68).toFixed(2)),
        threshold: 0.72,
        toxicityScore: Number((Math.random() * 0.2).toFixed(2)),
        spamScore: Number((Math.random() * 0.2).toFixed(2)),
        offTopicScore: Number((Math.random() * 0.2).toFixed(2)),
        reasons: [],
        lastCheckedAt: daysFromNow(-10, 0),
      },
    };
  });

  await Reply.insertMany(replyPayload);
  const replies = await Reply.find({}, '_id threadId author').lean();

  await Thread.bulkWrite(
    threads.map((thread) => ({
      updateOne: {
        filter: { _id: thread._id },
        update: {
          $set: {
            repliesCount: replies.filter((reply) => reply.threadId.equals(thread._id)).length,
          },
        },
      },
    })),
  );

  const reviewPayload = Array.from({ length: Math.max(MIN_RECORDS + 5, 15) }).map((_, index) => {
    const targetThread = index % 2 === 0;
    const thread = threads[index % threads.length] as { _id: Types.ObjectId };
    const reply = replies[index % replies.length] as { _id: Types.ObjectId };
    const user = users[index % users.length] as SeedUser;

    return {
      targetType: targetThread ? 'thread' : 'reply',
      targetId: targetThread ? thread._id : reply._id,
      targetModel: targetThread ? 'Thread' : 'Reply',
      authorId: user.id,
      status: pick(['queued', 'processing', 'review', 'approved', 'rejected', 'error']),
      decision: pick(['approved', 'flagged', 'rejected']),
      threshold: 0.72,
      confidence: Number((Math.random() * 0.3 + 0.62).toFixed(2)),
      toxicityScore: Number((Math.random() * 0.35).toFixed(2)),
      spamScore: Number((Math.random() * 0.35).toFixed(2)),
      offTopicScore: Number((Math.random() * 0.35).toFixed(2)),
      reasons: ['seeded moderation signal'],
      notes: 'Seeded moderation note for QA queue testing.',
      contentPreview: `Seeded moderation preview ${index + 1}`,
      processedAt: daysFromNow(-5, 0),
      reviewedBy: users[1]?.id,
      reviewedAt: daysFromNow(-5, 0),
    };
  });

  await ModerationReview.insertMany(reviewPayload);
  const reviews = await ModerationReview.find({}, '_id targetType targetId authorId').lean();

  const appealPayload = Array.from({ length: Math.max(MIN_RECORDS, 10) }).map((_, index) => {
    const review = reviews[index % reviews.length] as {
      _id: Types.ObjectId;
      targetType: 'thread' | 'reply';
      targetId: Types.ObjectId;
      authorId: string;
    };
    return {
      targetType: review.targetType,
      targetId: review.targetId,
      reviewId: review._id,
      authorId: review.authorId,
      reason: `Appeal ${index + 1}: request manual reevaluation with additional legal context and references.`,
      status: pick(['pending', 'approved', 'rejected']),
      resolutionNotes: 'Seeded moderation appeal resolution.',
      resolvedBy: users[1]?.id,
      resolvedAt: daysFromNow(-3, 0),
    };
  });
  await ModerationAppeal.insertMany(appealPayload);

  const engagementPayload = Array.from({ length: Math.max(MIN_RECORDS * 3, 30) }).map((_, index) => {
    const thread = threads[index % threads.length] as { _id: Types.ObjectId };
    const reply = replies[index % replies.length] as { _id: Types.ObjectId };
    const user = users[index % users.length] as SeedUser;

    return {
      userId: user.id,
      eventType: pick([
        'thread_create',
        'reply_create',
        'thread_vote',
        'reply_vote',
        'thread_search',
        'thread_view',
        'thread_resolved',
      ]),
      threadId: thread._id,
      replyId: index % 2 === 0 ? reply._id : undefined,
      metadata: {
        source: 'seed-script',
        session: `session-${index + 1}`,
      },
    };
  });

  await CommunityEngagementEventModel.insertMany(engagementPayload);

  const aiContextPayload: Array<{
    userId: string;
    caseId: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string; createdAt: Date }>;
    lastUserMessageAt: Date;
    lastAssistantMessageAt: Date;
  }> = [];
  const usedPairs = new Set<string>();

  let idx = 0;
  while (aiContextPayload.length < Math.max(MIN_RECORDS + 2, 12)) {
    const user = users[idx % users.length] as SeedUser;
    const caseDoc = cases[idx % cases.length] as SeedCase;
    const key = `${user.id}:${caseDoc.id}`;
    idx += 1;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);

    aiContextPayload.push({
      userId: user.id,
      caseId: caseDoc.id,
      messages: [
        {
          role: 'user',
          content: `Please summarize legal risks for ${caseDoc.caseNumber}.`,
          createdAt: daysFromNow(-3, -2),
        },
        {
          role: 'assistant',
          content: `Top risks include deadline gaps and incomplete evidence for ${caseDoc.caseNumber}.`,
          createdAt: daysFromNow(-2, -1),
        },
      ],
      lastUserMessageAt: daysFromNow(-2, -1),
      lastAssistantMessageAt: daysFromNow(-1, 0),
    });
  }
  await AIConversationContextModel.insertMany(aiContextPayload);

  await AIPersonalizationProfileModel.insertMany(
    users.map((user, index) => ({
      userId: user.id,
      preferredTone: pick(['professional', 'concise', 'detailed']),
      recentKeywords: ['deadline', 'evidence', `topic-${index + 1}`],
      recentQueries: ['summarize case', 'draft legal note', 'review contract'],
      usageCount: rand(4, 80),
      blockedPromptCount: rand(0, 5),
      lastSeenAt: daysFromNow(-5, 0),
    })),
  );

  await AIToolHistoryModel.insertMany(
    Array.from({ length: Math.max(MIN_RECORDS * 3, 30) }).map((_, index) => {
      const user = users[index % users.length] as SeedUser;
      const caseDoc = cases[index % cases.length] as SeedCase;
      const doc = docs[index % docs.length] as SeedDocument;

      return {
        userId: user.id,
        toolKey: AI_TOOL_KEYS[index % AI_TOOL_KEYS.length],
        input: `Seed input ${index + 1}: analyze this legal context and suggest next actions.`,
        output: `Seed output ${index + 1}: action list generated with priority scores.`,
        status: pick(['success', 'blocked', 'failed']),
        latencyMs: rand(350, 2600),
        model: pick(['groq', 'gemini', 'openrouter']),
        policySignals: ['seeded', 'legal-domain'],
        metadata: {
          caseId: caseDoc.id,
          documentIds: [doc.id],
        },
      };
    }),
  );
};

const seedPersonalizationBillingAdmin = async (
  users: SeedUser[],
  cases: SeedCase[],
  docs: SeedDocument[],
) => {
  await Personalization.insertMany(
    users.map((user, index) => ({
      userId: user._id,
      behaviorLog: [
        { eventType: 'page_view', metadata: { page: 'dashboard' }, timestamp: daysFromNow(-8, -3) },
        { eventType: 'case_open', metadata: { caseId: cases[index % cases.length]?.id }, timestamp: daysFromNow(-5, -1) },
      ],
      casePreferences: {
        defaultCaseType: pick(CaseTypes as unknown as string[]),
        defaultUrgency: pick(['low', 'medium', 'high']),
        preferredView: pick(['list', 'grid', 'kanban']),
      },
      dashboardWidgets: [
        { widgetId: 'active-cases', position: 0, visible: true, size: 'medium' },
        { widgetId: 'upcoming-deadlines', position: 1, visible: true, size: 'medium' },
        { widgetId: 'recent-documents', position: 2, visible: true, size: 'small' },
        { widgetId: 'messages', position: 3, visible: true, size: 'small' },
      ],
      notificationPreferences: {
        channels: { inApp: true, email: true, webPush: index % 2 === 0 },
        types: { hearing_reminder: true, deadline: true, message: true },
      },
      searchHistory: [
        { query: 'contract breach evidence', timestamp: daysFromNow(-6, -1), resultCount: rand(5, 40) },
        { query: 'urgent hearing checklist', timestamp: daysFromNow(-4, -1), resultCount: rand(4, 30) },
      ],
      documentAccessPatterns: [
        {
          documentId: docs[index % docs.length]?._id,
          accessCount: rand(2, 20),
          lastAccessed: daysFromNow(-3, 0),
        },
      ],
    })),
  );

  await Subscription.insertMany(
    Array.from({ length: Math.max(MIN_RECORDS * 2, 20) }).map((_, index) => {
      const user = users[index % users.length] as SeedUser;
      const plan = PLAN_TIERS[index % PLAN_TIERS.length] as string;

      return {
        user: user._id,
        plan,
        status: SUBSCRIPTION_STATUSES[index % SUBSCRIPTION_STATUSES.length] as string,
        billingInterval: BILLING_INTERVALS[index % BILLING_INTERVALS.length] as string,
        stripeCustomerId: `cus_seed_${user.id.toLowerCase()}_${index + 1}`,
        stripeSubscriptionId: plan === 'free' ? undefined : `sub_seed_${index + 1}`,
        stripePriceId: plan === 'free' ? undefined : `price_seed_${plan}`,
        currentPeriodStart: daysFromNow(-28, -1),
        currentPeriodEnd: daysFromNow(1, 30),
        cancelAtPeriodEnd: index % 6 === 0,
        trialEnd: plan === 'free' ? undefined : daysFromNow(1, 10),
      };
    }),
  );

  await Payment.insertMany(
    Array.from({ length: Math.max(MIN_RECORDS * 2, 20) }).map((_, index) => {
      const user = users[index % users.length] as SeedUser;
      const status = pick(['succeeded', 'pending', 'failed', 'refunded']);
      return {
        user: user._id,
        amount: rand(1200, 23000),
        currency: 'usd',
        status,
        stripePaymentIntentId: `pi_seed_${index + 1}`,
        stripeInvoiceId: `in_seed_${index + 1}`,
        stripeChargeId: `ch_seed_${index + 1}`,
        description: `Seed payment ${index + 1} for ${user.email}`,
        metadata: {
          source: 'seed-script',
          plan: PLAN_TIERS[index % PLAN_TIERS.length],
        },
      };
    }),
  );

  const admin = users.find((u) => u.role === 'admin') as SeedUser;
  await AuditLog.insertMany(
    Array.from({ length: Math.max(MIN_RECORDS * 3, 30) }).map((_, index) => ({
      action: pick([
        'admin.user.role.update',
        'admin.case.override',
        'admin.settings.update',
        'admin.billing.review',
        'admin.security.audit',
      ]),
      actor: admin._id,
      actorEmail: admin.email,
      actorRole: admin.role,
      target: users[(index + 1) % users.length]?.id,
      targetType: pick(['user', 'case', 'setting', 'payment', 'system']),
      details: {
        source: 'seed-script',
        caseNumber: cases[index % cases.length]?.caseNumber,
      },
      ipAddress: `10.10.0.${(index % 240) + 10}`,
      userAgent: 'seed-script/2.0',
      createdAt: daysFromNow(-25, 0),
    })),
  );

  await SystemSettings.insertMany(
    Array.from({ length: Math.max(MIN_RECORDS, 10) }).map((_, index) => ({
      siteName: `Advyon Dev Seed ${index + 1}`,
      maintenanceMode: index % 9 === 0,
      allowRegistration: true,
      maxUploadSizeMB: pick([10, 15, 20]),
      defaultUserRole: pick(['client', 'lawyer']),
      sessionTimeoutMinutes: pick([45, 60, 90]),
      features: {
        aiTools: true,
        communityHub: true,
        billing: true,
        notifications: true,
      },
      updatedBy: admin._id.toString(),
      createdAt: daysFromNow(-15, -1),
      updatedAt: daysFromNow(-3, 0),
    })),
  );
};

const validateReferenceIntegrity = async () => {
  const users = await User.find({}, '_id id').lean();
  const roles = await Role.find({}, '_id').lean();
  const cases = await Case.find({}, '_id id createdBy clientId').lean();
  const documents = await DocumentModel.find({}, '_id id caseId uploadedBy uploaderId').lean();
  const messages = await Message.find({}, '_id senderId receiverId caseId parentMessageId').lean();
  const threads = await Thread.find({}, '_id author').lean();
  const replies = await Reply.find({}, '_id threadId author').lean();
  const reviews = await ModerationReview.find({}, '_id targetModel targetId').lean();

  const userObjectSet = new Set(users.map((u) => u._id.toString()));
  const userBusinessSet = new Set(users.map((u) => u.id));
  const roleObjectSet = new Set(roles.map((r) => r._id.toString()));
  const caseObjectSet = new Set(cases.map((c) => c._id.toString()));
  const caseBusinessSet = new Set(cases.map((c) => c.id));
  const docObjectSet = new Set(documents.map((d) => d._id.toString()));
  const docBusinessSet = new Set(documents.map((d) => d.id));
  const messageObjectSet = new Set(messages.map((m) => m._id.toString()));
  const threadObjectSet = new Set(threads.map((t) => t._id.toString()));
  const replyObjectSet = new Set(replies.map((r) => r._id.toString()));
  const reviewObjectSet = new Set(reviews.map((r) => r._id.toString()));

  const invalid: Record<string, number> = {
    userRoleUserRef: 0,
    userRoleRoleRef: 0,
    clientProfileUserRef: 0,
    lawyerProfileUserRef: 0,
    judgeProfileUserRef: 0,
    caseCreatedByRef: 0,
    caseClientRef: 0,
    caseAccessRefs: 0,
    documentRefs: 0,
    activityRefs: 0,
    scheduleRefs: 0,
    notificationRefs: 0,
    messageRefs: 0,
    replyRefs: 0,
    moderationReviewTargetRef: 0,
    moderationAppealRef: 0,
    engagementRef: 0,
    aiContextRef: 0,
    aiProfileRef: 0,
    aiToolHistoryRef: 0,
    personalizationRef: 0,
    subscriptionRef: 0,
    paymentRef: 0,
    auditActorRef: 0,
  };

  const userRoles = await UserRole.find({}, 'userId roleId').lean();
  userRoles.forEach((row) => {
    if (!userObjectSet.has(String(row.userId))) invalid.userRoleUserRef += 1;
    if (!roleObjectSet.has(String(row.roleId))) invalid.userRoleRoleRef += 1;
  });

  const clientProfiles = await ClientProfile.find({}, 'userId').lean();
  clientProfiles.forEach((row) => {
    if (!userObjectSet.has(String(row.userId))) invalid.clientProfileUserRef += 1;
  });

  const lawyerProfiles = await LawyerProfile.find({}, 'userId').lean();
  lawyerProfiles.forEach((row) => {
    if (!userObjectSet.has(String(row.userId))) invalid.lawyerProfileUserRef += 1;
  });

  const judgeProfiles = await JudgeProfile.find({}, 'userId').lean();
  judgeProfiles.forEach((row) => {
    if (!userObjectSet.has(String(row.userId))) invalid.judgeProfileUserRef += 1;
  });

  cases.forEach((row) => {
    if (!userObjectSet.has(String(row.createdBy))) invalid.caseCreatedByRef += 1;
    if (row.clientId && !userObjectSet.has(String(row.clientId))) invalid.caseClientRef += 1;
  });

  const caseAccessRows = await CaseAccessModel.find({}, 'caseId userId grantedBy').lean();
  caseAccessRows.forEach((row) => {
    if (
      !caseObjectSet.has(String(row.caseId)) ||
      !userObjectSet.has(String(row.userId)) ||
      !userObjectSet.has(String(row.grantedBy))
    ) {
      invalid.caseAccessRefs += 1;
    }
  });

  documents.forEach((row) => {
    if (
      !caseObjectSet.has(String(row.caseId)) ||
      !userObjectSet.has(String(row.uploadedBy)) ||
      !userObjectSet.has(String(row.uploaderId))
    ) {
      invalid.documentRefs += 1;
    }
  });

  const activities = await ActivityModel.find({}, 'userId caseId documentId').lean();
  activities.forEach((row) => {
    if (
      !userObjectSet.has(String(row.userId)) ||
      (row.caseId && !caseObjectSet.has(String(row.caseId))) ||
      (row.documentId && !docObjectSet.has(String(row.documentId)))
    ) {
      invalid.activityRefs += 1;
    }
  });

  const schedules = await Schedule.find({}, 'caseId createdBy participants').lean();
  schedules.forEach((row) => {
    const badParticipant = (row.participants || []).some(
      (participant) => !userObjectSet.has(String(participant)),
    );
    if (
      !caseObjectSet.has(String(row.caseId)) ||
      !userObjectSet.has(String(row.createdBy)) ||
      badParticipant
    ) {
      invalid.scheduleRefs += 1;
    }
  });

  const notifications = await NotificationModel.find({}, 'recipientId senderId caseId').lean();
  notifications.forEach((row) => {
    if (
      !userObjectSet.has(String(row.recipientId)) ||
      (row.senderId && !userObjectSet.has(String(row.senderId))) ||
      (row.caseId && !caseObjectSet.has(String(row.caseId)))
    ) {
      invalid.notificationRefs += 1;
    }
  });

  messages.forEach((row) => {
    if (
      !userObjectSet.has(String(row.senderId)) ||
      !userObjectSet.has(String(row.receiverId)) ||
      (row.caseId && !caseObjectSet.has(String(row.caseId))) ||
      (row.parentMessageId && !messageObjectSet.has(String(row.parentMessageId)))
    ) {
      invalid.messageRefs += 1;
    }
  });

  replies.forEach((row) => {
    if (
      !threadObjectSet.has(String(row.threadId)) ||
      !userObjectSet.has(String(row.author))
    ) {
      invalid.replyRefs += 1;
    }
  });

  reviews.forEach((row) => {
    if (row.targetModel === 'Thread' && !threadObjectSet.has(String(row.targetId))) {
      invalid.moderationReviewTargetRef += 1;
    }
    if (row.targetModel === 'Reply' && !replyObjectSet.has(String(row.targetId))) {
      invalid.moderationReviewTargetRef += 1;
    }
  });

  const appeals = await ModerationAppeal.find({}, 'reviewId targetType targetId').lean();
  appeals.forEach((row) => {
    if (
      !reviewObjectSet.has(String(row.reviewId)) ||
      (row.targetType === 'thread' && !threadObjectSet.has(String(row.targetId))) ||
      (row.targetType === 'reply' && !replyObjectSet.has(String(row.targetId)))
    ) {
      invalid.moderationAppealRef += 1;
    }
  });

  const engagementEvents = await CommunityEngagementEventModel.find({}, 'userId threadId replyId').lean();
  engagementEvents.forEach((row) => {
    if (
      (row.userId && !userBusinessSet.has(String(row.userId))) ||
      (row.threadId && !threadObjectSet.has(String(row.threadId))) ||
      (row.replyId && !replyObjectSet.has(String(row.replyId)))
    ) {
      invalid.engagementRef += 1;
    }
  });

  const aiContexts = await AIConversationContextModel.find({}, 'userId caseId').lean();
  aiContexts.forEach((row) => {
    if (!userBusinessSet.has(String(row.userId)) || (row.caseId && !caseBusinessSet.has(String(row.caseId)))) {
      invalid.aiContextRef += 1;
    }
  });

  const aiProfiles = await AIPersonalizationProfileModel.find({}, 'userId').lean();
  aiProfiles.forEach((row) => {
    if (!userBusinessSet.has(String(row.userId))) invalid.aiProfileRef += 1;
  });

  const aiHistory = await AIToolHistoryModel.find({}, 'userId metadata').lean();
  aiHistory.forEach((row) => {
    const caseId = row.metadata?.caseId;
    const documentIds = row.metadata?.documentIds || [];
    if (
      !userBusinessSet.has(String(row.userId)) ||
      (caseId && !caseBusinessSet.has(String(caseId))) ||
      (Array.isArray(documentIds) && documentIds.some((id) => !docBusinessSet.has(String(id))))
    ) {
      invalid.aiToolHistoryRef += 1;
    }
  });

  const personalizations = await Personalization.find({}, 'userId').lean();
  personalizations.forEach((row) => {
    if (!userObjectSet.has(String(row.userId))) invalid.personalizationRef += 1;
  });

  const subscriptions = await Subscription.find({}, 'user').lean();
  subscriptions.forEach((row) => {
    if (!userObjectSet.has(String(row.user))) invalid.subscriptionRef += 1;
  });

  const payments = await Payment.find({}, 'user').lean();
  payments.forEach((row) => {
    if (!userObjectSet.has(String(row.user))) invalid.paymentRef += 1;
  });

  const auditLogs = await AuditLog.find({}, 'actor').lean();
  auditLogs.forEach((row) => {
    if (!userObjectSet.has(String(row.actor))) invalid.auditActorRef += 1;
  });

  const totalInvalid = Object.values(invalid).reduce((sum, count) => sum + count, 0);
  console.log('Reference integrity check:');
  console.table(invalid);

  if (totalInvalid > 0) {
    throw new Error(`Reference integrity failed with ${totalInvalid} mismatched references.`);
  }
};

const printCounts = async () => {
  const counts = await Promise.all([
    Role.countDocuments(),
    User.countDocuments(),
    UserRole.countDocuments(),
    ClientProfile.countDocuments(),
    LawyerProfile.countDocuments(),
    JudgeProfile.countDocuments(),
    Case.countDocuments(),
    CaseAccessModel.countDocuments(),
    DocumentModel.countDocuments(),
    ActivityModel.countDocuments(),
    Schedule.countDocuments(),
    NotificationModel.countDocuments(),
    Message.countDocuments(),
    Legal.countDocuments(),
    Thread.countDocuments(),
    Reply.countDocuments(),
    ModerationReview.countDocuments(),
    ModerationAppeal.countDocuments(),
    CommunityEngagementEventModel.countDocuments(),
    AIConversationContextModel.countDocuments(),
    AIPersonalizationProfileModel.countDocuments(),
    AIToolHistoryModel.countDocuments(),
    Personalization.countDocuments(),
    Subscription.countDocuments(),
    Payment.countDocuments(),
    AuditLog.countDocuments(),
    SystemSettings.countDocuments(),
  ]);

  console.log('Seed complete. Collection counts:');
  console.table({
    roles: counts[0],
    users: counts[1],
    userRoles: counts[2],
    clientProfiles: counts[3],
    lawyerProfiles: counts[4],
    judgeProfiles: counts[5],
    cases: counts[6],
    caseAccess: counts[7],
    documents: counts[8],
    activities: counts[9],
    schedules: counts[10],
    notifications: counts[11],
    messages: counts[12],
    legal: counts[13],
    threads: counts[14],
    replies: counts[15],
    moderationReviews: counts[16],
    moderationAppeals: counts[17],
    engagementEvents: counts[18],
    aiContexts: counts[19],
    aiProfiles: counts[20],
    aiToolHistory: counts[21],
    personalizations: counts[22],
    subscriptions: counts[23],
    payments: counts[24],
    auditLogs: counts[25],
    systemSettings: counts[26],
  });
};

const run = async () => {
  assertSafeExecution();

  if (dryRun) {
    console.log('Dry run mode: no database changes made.');
    console.log('Seeder design uses 3 fixed user accounts and MongoDB ObjectId references.');
    return;
  }

  await mongoose.connect(config.database_url as string);
  console.log(`Connected to MongoDB in ${config.NODE_ENV ?? 'unknown'} mode.`);

  try {
    await clearCollections();
    console.log('Cleared existing records from seeded collections.');

    const roles = await seedRoles();
    const users = await seedUsers();
    await seedProfilesAndUserRoles(users, roles as Array<{ _id: Types.ObjectId; id: string; code: string }>);

    const cases = await seedCases(users);
    await seedCaseAccess(cases, users);
    const docs = await seedDocuments(cases);

    await seedActivities(users, cases, docs);
    await seedSchedules(users, cases);
    await seedNotifications(users, cases);
    await seedMessages(users, cases);
    await seedLegal();
    await seedCommunityAndAI(users, cases, docs);
    await seedPersonalizationBillingAdmin(users, cases, docs);

    await validateReferenceIntegrity();
    await printCounts();

    console.log('Seeded test accounts:');
    console.table([
      { email: 'imoral223489@bscse.uiu.ac.bd', role: 'lawyer' },
      { email: 'ihmorol@gmail.com', role: 'admin' },
      { email: 'ekramulhasane69@gmail.com', role: 'client' },
    ]);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
