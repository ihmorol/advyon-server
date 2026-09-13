import { Schema, model } from 'mongoose';
import { IContactTicket } from './contact.interface';

const attachmentSchema = new Schema(
  {
    label: String,
    url: String,
  },
  { _id: false },
);

const contactTicketSchema = new Schema<IContactTicket>(
  {
    referenceId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    orgName: { type: String },
    role: { type: String },
    phone: { type: String },
    topicKey: { type: String, required: true },
    topicLabel: { type: String },
    urgencyKey: { type: String, required: true },
    message: { type: String, required: true },
    source: {
      type: String,
      enum: ['public-site', 'marketing', 'unknown'],
      default: 'public-site',
    },
    status: {
      type: String,
      enum: ['new', 'triaged', 'closed'],
      default: 'new',
    },
    attachments: [attachmentSchema],
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

export const ContactTicket = model<IContactTicket>('ContactTicket', contactTicketSchema);
