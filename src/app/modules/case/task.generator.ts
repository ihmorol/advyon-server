import { Case } from './case.model';
import { CASE_TEMPLATES } from './case.template';
import { ScheduleService } from '../schedule/schedule.service';
import { ISchedule } from '../schedule/schedule.interface';
import { Types } from 'mongoose';

/**
 * WBS-5.1: Task Generator
 * Auto-generates folders and deadlines based on case case template.
 */

const generateTasksFromTemplate = async (caseId: string, templateId: string, userId: string) => {
    // 1. Find the template
    const template = CASE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
        console.warn(`Template ${templateId} not found, skipping auto-generation.`);
        return;
    }

    // 2. Update Case Folders
    // We append default folders to any existing ones, avoiding duplicates by name
    const caseData = await Case.findOne({ id: caseId });
    if (!caseData) return;

    const existingFolderNames = new Set(caseData.folders.map(f => f.name));
    const newFolders = template.defaultFolders.filter(f => !existingFolderNames.has(f.name));

    if (newFolders.length > 0) {
        await Case.findOneAndUpdate(
            { id: caseId },
            { $push: { folders: { $each: newFolders } } }
        );
    }

    // 3. Create Default Deadline (Schedule Event)
    if (template.defaultDeadlineDescription && template.estimatedDurationDays) {
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + template.estimatedDurationDays);

        const deadlinePayload: ISchedule = {
            title: template.defaultDeadlineDescription,
            description: `Auto-generated deadline based on ${template.name} template.`,
            eventType: 'deadline',
            date: deadlineDate,
            startTime: '09:00',
            endTime: '10:00',
            caseId: caseData._id,
            createdBy: new Types.ObjectId(userId), // Assuming userId is valid ObjectId string
            participants: [new Types.ObjectId(userId)],
            status: 'scheduled',
            reminders: [
                { time: 1440, sent: false }, // 1 day before
                { time: 60, sent: false }    // 1 hour before
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // We use ScheduleService to create the event
        try {
            await ScheduleService.createEvent(deadlinePayload);
        } catch (error) {
            console.error('Failed to auto-generate deadline:', error);
            // Non-blocking error
        }
    }
};

export const TaskGenerator = {
    generateTasksFromTemplate
};
