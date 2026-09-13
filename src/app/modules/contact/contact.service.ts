import nodemailer from 'nodemailer';
import config from '../../config';
import { ContactTicket } from './contact.model';
import { IContactTicket, ContactMetaResponse } from './contact.interface';
import { MetadataServices } from '../metadata/metadata.service';
import { SupportKpiService } from '../analytics/support-kpi.service';

const offices = [
  {
    city: 'New York',
    address: '228 Park Ave S, New York, NY 10003',
    timezone: 'America/New_York',
    phone: '+1 (332) 239-8109',
    email: 'nyc@advyon.legal',
  },
  {
    city: 'San Francisco',
    address: '548 Market St, San Francisco, CA 94104',
    timezone: 'America/Los_Angeles',
    phone: '+1 (415) 993-4124',
    email: 'sf@advyon.legal',
  },
  {
    city: 'London',
    address: '1 Poultry, London EC2R 8JR, UK',
    timezone: 'Europe/London',
    phone: '+44 20 3788 9260',
    email: 'london@advyon.legal',
  },
];

const socials = [
  { label: 'LinkedIn', url: 'https://www.linkedin.com/company/advyon', icon: 'linkedin' },
  { label: 'X (Twitter)', url: 'https://x.com/advyonlegal', icon: 'twitter' },
  { label: 'YouTube', url: 'https://www.youtube.com/@advyon', icon: 'youtube' },
];

const buildReferenceId = () => {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CNT-${stamp}-${rand}`;
};

const buildTransporter = () => {
  if (
    !process.env.CONTACT_SMTP_HOST ||
    !process.env.CONTACT_SMTP_USER ||
    !process.env.CONTACT_SMTP_PASS ||
    !process.env.CONTACT_EMAIL_FROM ||
    !process.env.CONTACT_EMAIL_TO
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.CONTACT_SMTP_HOST,
    port: Number(process.env.CONTACT_SMTP_PORT) || 587,
    secure: Number(process.env.CONTACT_SMTP_PORT) === 465,
    auth: {
      user: process.env.CONTACT_SMTP_USER,
      pass: process.env.CONTACT_SMTP_PASS,
    },
  });
};

const transporter = buildTransporter();

const sendNotificationEmail = async (ticket: IContactTicket) => {
  if (!transporter) {
    return;
  }

  const subject = `[Advyon Contact] ${ticket.referenceId} · ${ticket.topicLabel || ticket.topicKey}`;
  const body = [
    `Name: ${ticket.fullName}`,
    `Email: ${ticket.email}`,
    ticket.phone ? `Phone: ${ticket.phone}` : null,
    ticket.orgName ? `Organization: ${ticket.orgName}` : null,
    ticket.role ? `Role: ${ticket.role}` : null,
    `Topic: ${ticket.topicLabel || ticket.topicKey}`,
    `Urgency: ${ticket.urgencyKey}`,
    '',
    ticket.message,
  ]
    .filter(Boolean)
    .join('\n');

  await transporter.sendMail({
    from: process.env.CONTACT_EMAIL_FROM,
    to: process.env.CONTACT_EMAIL_TO,
    subject,
    text: body,
  });
};

interface ContactContext {
  ip?: string;
  userAgent?: string;
}

const createContactTicket = async (
  payload: Pick<
    IContactTicket,
    'fullName' | 'email' | 'orgName' | 'role' | 'phone' | 'topicKey' | 'urgencyKey' | 'message' | 'attachments'
  >,
  context: ContactContext,
) => {
  const referenceId = buildReferenceId();
  const [topics, urgencyLevels] = await Promise.all([
    MetadataServices.getMetadataByType('legalSpecializations'),
    MetadataServices.getMetadataByType('urgencyLevels'),
  ]);

  const topicLabel =
    topics.find(topic => topic.key === payload.topicKey)?.label ??
    payload.topicKey.replace(/-/g, ' ');

  const ticket = await ContactTicket.create({
    ...payload,
    referenceId,
    topicLabel,
    source: 'public-site',
    status: 'new',
    ipAddress: context.ip,
    userAgent: context.userAgent,
  });

  await SupportKpiService.recordTicket({
    topicKey: payload.topicKey,
    urgencyKey: payload.urgencyKey,
    source: 'public-site',
  });

  await sendNotificationEmail(ticket.toObject());

  return ticket;
};

const getContactMetadata = async (): Promise<ContactMetaResponse> => {
  const [topics, urgencyLevels] = await Promise.all([
    MetadataServices.getMetadataByType('legalSpecializations'),
    MetadataServices.getMetadataByType('urgencyLevels'),
  ]);

  return {
    topics: topics.map(topic => ({
      key: topic.key,
      label: topic.label,
      description: topic.description,
    })),
    urgencyLevels: urgencyLevels.map(level => ({
      key: level.key,
      label: level.label,
      description: level.description,
      color: level.color,
    })),
    offices,
    socials,
  };
};

export const ContactService = {
  createContactTicket,
  getContactMetadata,
};
