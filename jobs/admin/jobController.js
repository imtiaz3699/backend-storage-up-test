// Admin Job Management Controller
import { runJob, getJobsStatus } from '../index.js';
import { getOverdueStats } from '../invoicing/overdueDetection.js';
import { getLateFeeStats } from '../invoicing/lateFees.js';
import { getFinancialSummary } from '../reporting/financialSummary.js';
import { getLeaseExpirationStats } from '../units/leaseExpiration.js';
import RunLog from '../../models/RunLog.js';
import Invoice from '../../models/Invoice.js';

// Job definitions for frontend display
const JOB_DEFINITIONS = {
  overdueDetection: {
    id: 'overdueDetection',
    name: 'Overdue Invoice Detection',
    description: 'Detect and update invoices that have passed their due date',
    category: 'invoicing',
    priority: 1,
    estimatedDuration: '30 seconds',
    icon: '🔍'
  },
  lateFees: {
    id: 'lateFees', 
    name: 'Late Fee Processing',
    description: 'Apply late fees to overdue invoices based on business rules',
    category: 'invoicing',
    priority: 2,
    estimatedDuration: '1 minute',
    icon: '💸'
  },
  paymentReminders: {
    id: 'paymentReminders',
    name: 'Payment Reminder Emails',
    description: 'Send automated payment reminders to customers',
    category: 'notifications',
    priority: 3,
    estimatedDuration: '2 minutes',
    icon: '📧'
  },
  leaseExpiration: {
    id: 'leaseExpiration',
    name: 'Lease Expiration Processing',
    description: 'Process lease expirations and send renewal reminders',
    category: 'units',
    priority: 4,
    estimatedDuration: '1 minute',
    icon: '🏠'
  },
  financialSummary: {
    id: 'financialSummary',
    name: 'Financial Summary Report',
    description: 'Generate comprehensive daily financial dashboard',
    category: 'reporting',
    priority: 5,
    estimatedDuration: '45 seconds',
    icon: '📊'
  },
  autopay: {
    id: 'autopay',
    name: 'Autopay Processor',
    description: 'Identify autopay-enabled users and summarize outstanding balances (placeholder, no charges in dev)',
    category: 'payments',
    priority: 6,
    estimatedDuration: '1 minute',
    icon: '🤖'
  }
};

/**
 * Get status of all daily processing jobs
 */
export const getDailyProcessingStatus = async (req, res) => {
  try {
    const status = getJobsStatus();
    
    res?.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res?.status(500).json({
      success: false,
      message: 'Error getting job status',
      error: error.message
    });
  }
};

/**
 * Manually run a specific job (admin trigger)
 */
export const runDailyProcessingJob = async (req, res) => {
  try {
    const { jobName } = req.params;
    
    if (!jobName) {
      return res.status(400).json({
        success: false,
        message: 'Job name is required'
      });
    }

    console.log(`🚀 Admin manually triggered job: ${jobName}`);
    
    const result = await runJob(jobName);
    
    res.status(200).json({
      success: true,
      message: `Job '${jobName}' executed successfully`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error running job '${req.params.jobName}': ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Get comprehensive daily processing dashboard data
 */
export const getDailyProcessingDashboard = async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Run all stats queries in parallel for better performance
    const [
      jobsStatus,
      overdueStats,
      lateFeeStats,
      financialSummary,
      leaseExpirationStats
    ] = await Promise.all([
      Promise.resolve(getJobsStatus()),
      getOverdueStats(),
      getLateFeeStats(30), // Last 30 days
      getFinancialSummary(yesterday, today), // Yesterday's summary
      getLeaseExpirationStats(30) // Next 30 days
    ]);

    const dashboard = {
      systemStatus: {
        ...jobsStatus,
        lastUpdated: new Date().toISOString()
      },
      invoiceMetrics: {
        overdue: overdueStats,
        lateFees: lateFeeStats
      },
      financialSummary: financialSummary,
      leaseManagement: {
        upcoming_expirations: leaseExpirationStats
      }
    };

    res.status(200).json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard data',
      error: error.message
    });
  }
};

/**
 * Get specific job statistics
 */
export const getJobStats = async (req, res) => {
  try {
    const { statType } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    let stats;
    
    switch (statType) {
      case 'overdue':
        stats = await getOverdueStats();
        break;
      case 'lateFees':
        stats = await getLateFeeStats(days);
        break;
      case 'leaseExpiration':
        stats = await getLeaseExpirationStats(days);
        break;
      case 'financial':
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days);
        stats = await getFinancialSummary(startDate, endDate);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Invalid stat type '${statType}'. Available: overdue, lateFees, leaseExpiration, financial`
        });
    }
    
    res.status(200).json({
      success: true,
      data: stats,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error getting ${req.params.statType} statistics`,
      error: error.message
    });
  }
};

/**
 * Get list of all available daily processing jobs (for frontend display)
 */
export const getDailyProcessingJobs = async (req, res) => {
  try {
    const systemStatus = getJobsStatus();
    
    // Optional processing date for as-of logic
    let processingDate = new Date();
    // Normalize to UTC midnight for date-only comparison (MongoDB dates are in UTC)
    processingDate.setUTCHours(0, 0, 0, 0);
    processingDate.setUTCMinutes(0);
    processingDate.setUTCSeconds(0);
    processingDate.setUTCMilliseconds(0);
    
    if (req.query.date) {
      const d = new Date(req.query.date + 'T00:00:00.000Z'); // Parse as UTC
      if (!isNaN(d.getTime())) {
        processingDate = d;
        processingDate.setUTCHours(0, 0, 0, 0);
      }
    }

    // Fetch invoices with relevant information for daily processing
    const allInvoices = await Invoice.find({
      status: { $in: ['pending', 'overdue'] }
    })
      .select('invoice_id amount issue_date due_date status customer_name')
      .sort({ due_date: 1, createdAt: -1 })
      .limit(100);

    // Format invoices with requested fields and recompute status as-of processingDate
    const formattedInvoices = allInvoices
      .map(invoice => {
        const due = invoice.due_date ? new Date(invoice.due_date) : null;
        let virtualStatus = 'pending'; // Default to pending
        
        if (due) {
          // Normalize both dates to UTC midnight for accurate date-only comparison
          // MongoDB stores dates in UTC, so we must use UTC methods
          const dueDateOnly = new Date(due);
          dueDateOnly.setUTCHours(0, 0, 0, 0);
          dueDateOnly.setUTCMinutes(0);
          dueDateOnly.setUTCSeconds(0);
          dueDateOnly.setUTCMilliseconds(0);
          
          const processingDateOnly = new Date(processingDate);
          processingDateOnly.setUTCHours(0, 0, 0, 0);
          processingDateOnly.setUTCMinutes(0);
          processingDateOnly.setUTCSeconds(0);
          processingDateOnly.setUTCMilliseconds(0);
          
          // Invoice is overdue if due date is before processing date (strictly before, not equal)
          if (dueDateOnly.getTime() < processingDateOnly.getTime()) {
            virtualStatus = 'overdue';
          } else {
            // Due date is today or in the future = pending
            virtualStatus = 'pending';
          }
        }
        return {
          invoice_id: invoice.invoice_id,
          total: invoice.amount,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          status: virtualStatus,
          customer_name: invoice.customer_name
        };
      })
      // keep only pending/overdue as-of the processing date
      .filter(inv => ['pending', 'overdue'].includes(inv.status));

    // If caller only wants invoices, return them directly (non-breaking optional behavior)
    if (req.query.invoicesOnly === 'true') {
      return res.status(200).json({
        success: true,
        count: formattedInvoices.length,
        data: formattedInvoices,
        timestamp: new Date().toISOString()
      });
    }

    // Combine job definitions with current system status and add invoice data
    const jobs = Object.keys(JOB_DEFINITIONS).map(jobId => {
      const jobDef = JOB_DEFINITIONS[jobId];
      const isEnabled = systemStatus.jobs.find(j => j.name === jobId)?.enabled || false;
      
      // Get the most relevant invoice for this job
      let relevantInvoice = null;
      if (jobId === 'overdueDetection') {
        // Overdue detection: get first overdue invoice
        const overdueInvoices = formattedInvoices.filter(inv => inv.status === 'overdue');
        relevantInvoice = overdueInvoices[0] || null;
      } else if (jobId === 'lateFees') {
        // Late fees: get first overdue invoice that needs late fees
        const overdueInvoices = formattedInvoices.filter(inv => inv.status === 'overdue');
        relevantInvoice = overdueInvoices[0] || null;
      } else if (jobId === 'paymentReminders') {
        // Payment reminders: get first pending invoice
        const pendingInvoices = formattedInvoices.filter(inv => inv.status === 'pending');
        relevantInvoice = pendingInvoices[0] || null;
      } else {
        // For other jobs, get first relevant invoice
        relevantInvoice = formattedInvoices[0] || null;
      }

      // Build job object
      const jobObject = {
        ...jobDef,
        enabled: isEnabled,
        lastRun: null, // Could be enhanced to track last execution time
        status: isEnabled ? 'ready' : 'disabled'
      };

      // Add invoice fields directly to job object if invoice exists
      if (relevantInvoice) {
        jobObject.invoice_id = relevantInvoice.invoice_id;
        jobObject.issue_date = relevantInvoice.issue_date;
        jobObject.due_date = relevantInvoice.due_date;
        jobObject.total = relevantInvoice.total;
      }
      
      return jobObject;
    });

    // Group by category for better UI organization
    const groupedJobs = jobs.reduce((acc, job) => {
      if (!acc[job.category]) {
        acc[job.category] = [];
      }
      acc[job.category].push(job);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        totalJobs: jobs.length,
        enabledJobs: jobs.filter(j => j.enabled).length,
        systemEnabled: systemStatus.enabled,
        timezone: systemStatus.timezone,
        jobs: jobs,
        groupedJobs: groupedJobs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting daily processing jobs list',
      error: error.message
    });
  }
};

/**
 * Run ALL daily processing jobs at once (for "Generate Daily Processing" button)
 */
export const runAllDailyProcessingJobs = async (req, res) => {
  try {
    // Get date from request body (optional - defaults to today)
    let processingDate = new Date();
    if (req.body.date) {
      processingDate = new Date(req.body.date);
      if (isNaN(processingDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD format.'
        });
      }
      // Set to start of day
      processingDate.setHours(0, 0, 0, 0);
    } else {
      // Default to today
      processingDate.setHours(0, 0, 0, 0);
    }

    console.log(`🚀 Running ALL daily processing jobs (admin triggered) for date: ${processingDate.toISOString().split('T')[0]}`);
    
    const startTime = Date.now();
    const results = {};
    const errors = [];
    
    // Get list of enabled jobs
    const systemStatus = getJobsStatus();
    if (!systemStatus.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Daily processing system is disabled'
      });
    }

    const enabledJobs = Object.keys(JOB_DEFINITIONS).filter(jobId => {
      const systemJob = systemStatus.jobs.find(j => j.name === jobId);
      return systemJob?.enabled;
    });

    if (enabledJobs?.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No jobs are currently enabled.'
      });
    }

    // Run-lock per processingDate (can be bypassed with ?force=true for testing)
    const force = req.query.force === 'true' || req.body.force === true;
    const processingDateKey = processingDate.toISOString().split('T')[0];
    const existingRun = await RunLog.findOne({ processingDate: processingDateKey });
    
    // Only check for existing runs if not forcing
    if (!force) {
      if (existingRun && existingRun.status === 'success') {
        return res.status(400).json({
          success: false,
          message: `Daily processing already completed for ${processingDateKey}. Add ?force=true to rerun.`
        });
      }
      if (existingRun && existingRun.status === 'in_progress') {
        return res.status(429).json({
          success: false,
          message: `Daily processing already in progress for ${processingDateKey}`
        });
      }
    } else {
      console.log(`⚠️  Force mode enabled - allowing rerun for ${processingDateKey}`);
    }

    // create/overwrite log as in_progress
    await RunLog.findOneAndUpdate(
      { processingDate: processingDateKey },
      { status: 'in_progress', startedAt: new Date(), jobs: {} },
      { upsert: true }
    );

    console.log(`📋 Running ${enabledJobs?.length} enabled jobs: ${enabledJobs?.join(', ')}`);
    console.log(`📅 Processing date: ${processingDate.toISOString().split('T')[0]}`);

    // Run jobs in optimal order (by priority)
    const orderedJobs = enabledJobs?.sort((a, b) => 
      JOB_DEFINITIONS[a]?.priority - JOB_DEFINITIONS[b]?.priority
    );

    for (const jobId of orderedJobs) {
      try {
        console.log(`▶️  Starting ${JOB_DEFINITIONS[jobId]?.name}...`);
        const jobStartTime = Date.now();
        
        const result = await runJob(jobId, processingDate);
        const jobDuration = Date.now() - jobStartTime;
        
        results[jobId] = {
          success: true,
          duration: jobDuration,
          result: result,
          jobName: JOB_DEFINITIONS[jobId].name
        };
        
        console.log(`✅ Completed ${JOB_DEFINITIONS[jobId].name} in ${jobDuration}ms`);
        
      } catch (error) {
        const jobDuration = Date.now() - jobStartTime;
        
        results[jobId] = {
          success: false,
          duration: jobDuration,
          error: error.message,
          jobName: JOB_DEFINITIONS[jobId].name
        };
        
        errors.push({
          job: jobId,
          jobName: JOB_DEFINITIONS[jobId].name,
          error: error.message
        });
        
        console.error(`❌ Failed ${JOB_DEFINITIONS[jobId].name}: ${error.message}`);
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = Object.values(results).filter(r => r.success).length;
    const failureCount = errors.length;

    // Generate summary
    const summary = {
      totalJobs: enabledJobs.length,
      successful: successCount,
      failed: failureCount,
      totalDuration: totalDuration,
      processingDate: processingDate.toISOString().split('T')[0],
      results: results,
      errors: errors.length > 0 ? errors : undefined
    };

    // Update run log
    await RunLog.findOneAndUpdate(
      { processingDate: processingDateKey },
      {
        status: failureCount === 0 ? 'success' : 'failed',
        finishedAt: new Date(),
        jobs: results,
        message: failureCount === 0 ? 'Completed' : 'Completed with failures'
      }
    );

    console.log(`🏁 Daily processing completed: ${successCount}/${enabledJobs.length} jobs successful in ${totalDuration}ms`);

    const responseStatus = failureCount === 0 ? 200 : 207; // 207 = Multi-Status (partial success)
    
    res.status(responseStatus).json({
      success: failureCount === 0,
      message: failureCount === 0 
        ? `All ${successCount} jobs completed successfully for ${processingDate.toISOString().split('T')[0]}`
        : `${successCount} jobs succeeded, ${failureCount} jobs failed`,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Fatal error running all daily processing jobs:', error);
    
    res.status(500).json({
      success: false,
      message: 'Fatal error running daily processing jobs',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get processing results with invoices that were affected
 */
export const getDailyProcessingResults = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const includeDetails = req.query.details === 'true';
    
    // Get recent invoices with different statuses to show processing results
    const recentInvoices = await Promise.all([
      // Recent overdue invoices
      Invoice.find({ status: 'overdue' })
        .sort({ updatedAt: -1 })
        .limit(Math.floor(limit / 3))
        .populate('customer_id', 'name email'),
      
      // Recent paid invoices  
      Invoice.find({ status: 'paid' })
        .sort({ updatedAt: -1 })
        .limit(Math.floor(limit / 3))
        .populate('customer_id', 'name email'),
        
      // Recent pending invoices
      Invoice.find({ status: 'pending' })
        .sort({ updatedAt: -1 })
        .limit(Math.floor(limit / 3))
        .populate('customer_id', 'name email')
    ]);

    const [overdueInvoices, paidInvoices, pendingInvoices] = recentInvoices;
    
    // Combine and format results
    const allInvoices = [
      ...overdueInvoices.map(inv => ({ ...inv.toObject(), processingStatus: 'overdue' })),
      ...paidInvoices.map(inv => ({ ...inv.toObject(), processingStatus: 'paid' })),
      ...pendingInvoices.map(inv => ({ ...inv.toObject(), processingStatus: 'pending' }))
    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Get summary statistics
    const summary = {
      totalInvoices: allInvoices.length,
      overdue: overdueInvoices.length,
      paid: paidInvoices.length, 
      pending: pendingInvoices.length,
      totalAmount: allInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    };

    const response = {
      success: true,
      data: {
        summary,
        invoices: includeDetails ? allInvoices : allInvoices.slice(0, limit)
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting daily processing results',
      error: error.message
    });
  }
};
