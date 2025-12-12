// Daily Processing Job Scheduler
import cron from 'node-cron';
import { overdueInvoiceDetection } from './invoicing/overdueDetection.js';
import { paymentReminderEmails } from './notifications/paymentReminders.js';
import { dailyFinancialSummary } from './reporting/financialSummary.js';
import { lateFeesProcessor } from './invoicing/lateFees.js';
import { leaseExpirationProcessor } from './units/leaseExpiration.js';
import { autopayProcessor } from './autopay/autopayProcessor.js';

// Job configuration
const JOB_CONFIG = {
  enabled: process.env.DAILY_PROCESSING_ENABLED !== 'false', // Default enabled
  timezone: process.env.TIMEZONE || 'America/New_York',
  
  // Individual job toggles
  jobs: {
    overdueDetection: process.env.OVERDUE_DETECTION_ENABLED !== 'false',
    paymentReminders: process.env.PAYMENT_REMINDERS_ENABLED !== 'false',
    financialSummary: process.env.FINANCIAL_SUMMARY_ENABLED !== 'false',
    lateFees: process.env.LATE_FEES_ENABLED !== 'false',
    leaseExpiration: process.env.LEASE_EXPIRATION_ENABLED !== 'false',
    autopay: process.env.AUTOPAY_ENABLED !== 'false'
  }
};

// Enhanced logging
const logJobExecution = (jobName, status, details = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] Daily Processing - ${jobName}: ${status}`;
  
  if (status === 'SUCCESS') {
    console.log(`✅ ${logMessage}`, details ? `| ${JSON.stringify(details)}` : '');
  } else if (status === 'ERROR') {
    console.error(`❌ ${logMessage}`, details ? `| ${details}` : '');
  } else {
    console.log(`ℹ️ ${logMessage}`, details ? `| ${details}` : '');
  }
};

// Generic job wrapper with error handling
const executeJob = async (jobName, jobFunction) => {
  if (!JOB_CONFIG.enabled) {
    logJobExecution(jobName, 'SKIPPED', 'Daily processing disabled');
    return;
  }
  
  if (!JOB_CONFIG.jobs[jobName]) {
    logJobExecution(jobName, 'SKIPPED', 'Job disabled in config');
    return;
  }

  logJobExecution(jobName, 'STARTED');
  const startTime = Date.now();

  try {
    const result = await jobFunction(currentProcessingDate || undefined);
    const duration = Date.now() - startTime;
    
    logJobExecution(jobName, 'SUCCESS', {
      duration: `${duration}ms`,
      ...result
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logJobExecution(jobName, 'ERROR', {
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack
    });
  }
};

// Job Schedules
export const initializeDailyProcessing = () => {
  if (!JOB_CONFIG.enabled) {
    console.log('📅 Daily Processing: DISABLED via environment variable');
    return;
  }

  console.log('📅 Daily Processing: Initializing scheduled jobs...');

  // 1. Overdue Invoice Detection - Runs at 12:01 AM daily
  cron.schedule('1 0 * * *', () => {
    executeJob('overdueDetection', overdueInvoiceDetection);
  }, {
    scheduled: true,
    timezone: JOB_CONFIG.timezone,
    name: 'overdue-invoice-detection'
  });

  // 2. Payment Reminder Emails - Runs at 9:00 AM daily
  cron.schedule('0 9 * * *', () => {
    executeJob('paymentReminders', paymentReminderEmails);
  }, {
    scheduled: true,
    timezone: JOB_CONFIG.timezone,
    name: 'payment-reminder-emails'
  });

  // 3. Late Fees Processor - Runs at 12:30 AM daily (after overdue detection)
  cron.schedule('30 0 * * *', () => {
    executeJob('lateFees', lateFeesProcessor);
  }, {
    scheduled: true,
    timezone: JOB_CONFIG.timezone,
    name: 'late-fees-processor'
  });

  // 4. Lease Expiration Processor - Runs at 1:00 AM daily
  cron.schedule('0 1 * * *', () => {
    executeJob('leaseExpiration', leaseExpirationProcessor);
  }, {
    scheduled: true,
    timezone: JOB_CONFIG.timezone,
    name: 'lease-expiration-processor'
  });

  // 5. Daily Financial Summary - Runs at 11:00 PM daily
  cron.schedule('0 23 * * *', () => {
    executeJob('financialSummary', dailyFinancialSummary);
  }, {
    scheduled: true,
    timezone: JOB_CONFIG.timezone,
    name: 'daily-financial-summary'
  });

  // 6. Autopay Processor - Runs at 6:00 AM daily (placeholder without charging)
  cron.schedule('0 6 * * *', () => {
    executeJob('autopay', autopayProcessor);
  }, {
    scheduled: true,
    timezone: JOB_CONFIG.timezone,
    name: 'autopay-processor'
  });

  console.log(`📅 Daily Processing: ${Object.keys(JOB_CONFIG.jobs).filter(job => JOB_CONFIG.jobs[job]).length} jobs scheduled successfully`);
  console.log(`🕐 Timezone: ${JOB_CONFIG.timezone}`);
  
  // Log next scheduled times
  cron.getTasks().forEach(task => {
    console.log(`   📋 ${task.options?.name}: Next run scheduled`);
  });
};

// Manual job execution for testing/admin triggers
export const runJob = async (jobName, processingDate = null) => {
  const jobs = {
    overdueDetection: overdueInvoiceDetection,
    paymentReminders: paymentReminderEmails,
    financialSummary: dailyFinancialSummary,
    lateFees: lateFeesProcessor,
    leaseExpiration: leaseExpirationProcessor,
    autopay: autopayProcessor
  };

  if (!jobs[jobName]) {
    throw new Error(`Job '${jobName}' not found. Available jobs: ${Object.keys(jobs).join(', ')}`);
  }

  // If processingDate is provided, pass it to the job function
  if (processingDate) {
    return executeJob(jobName, () => jobs[jobName](processingDate));
  }

  return executeJob(jobName, jobs[jobName]);
};

// Get job status and schedules
export const getJobsStatus = () => {
  const tasks = cron.getTasks();
  return {
    enabled: JOB_CONFIG.enabled,
    timezone: JOB_CONFIG.timezone,
    totalJobs: tasks.size,
    jobs: Object.keys(JOB_CONFIG.jobs).map(jobName => ({
      name: jobName,
      enabled: JOB_CONFIG.jobs[jobName],
      scheduled: tasks.has(jobName)
    }))
  };
};
