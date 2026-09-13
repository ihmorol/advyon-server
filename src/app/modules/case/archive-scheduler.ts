import cron from 'node-cron';
import { CaseServices } from './case.service';

/**
 * WBS-4.2: Auto-Archive Scheduler
 * Runs daily at 2:00 AM to archive cases inactive for >30 days.
 * Idempotent — each case is only auto-archived once.
 */

let isRunning = false;

export const initAutoArchiveScheduler = () => {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        if (isRunning) {
            console.log('[AutoArchive] Skipping — previous run still in progress');
            return;
        }

        isRunning = true;
        try {
            console.log('[AutoArchive] Starting auto-archive check...');
            const result = await CaseServices.autoArchiveCheck();
            console.log(`[AutoArchive] Completed. ${result.archivedCount} cases auto-archived.`);
        } catch (error) {
            console.error('[AutoArchive] Error during auto-archive:', error);
        } finally {
            isRunning = false;
        }
    });

    console.log('[AutoArchive] Scheduler initialized — runs daily at 2:00 AM');
};
