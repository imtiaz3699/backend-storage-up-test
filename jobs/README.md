# Daily Processing System for StorageUp

This directory contains the automated daily processing system for StorageUp, providing comprehensive business automation and reporting.

## 📁 Directory Structure

```
jobs/
├── index.js                    # Main job scheduler and coordinator
├── admin/
│   └── jobController.js        # Admin API endpoints for job management
├── invoicing/
│   ├── overdueDetection.js     # Detect and update overdue invoices
│   └── lateFees.js             # Apply late fees to overdue invoices
├── notifications/
│   └── paymentReminders.js     # Send payment reminder emails
├── reporting/
│   └── financialSummary.js     # Generate daily financial reports
├── units/
│   └── leaseExpiration.js      # Process lease expirations and renewals
└── README.md                   # This file
```

## 🕐 Job Schedule

| Job Name | Schedule | Time | Description |
|----------|----------|------|-------------|
| **Overdue Detection** | Daily | 12:01 AM | Updates pending invoices to overdue status |
| **Late Fees** | Daily | 12:30 AM | Applies late fees to overdue invoices |
| **Lease Expiration** | Daily | 1:00 AM | Processes lease expiration and renewals |
| **Payment Reminders** | Daily | 9:00 AM | Sends payment reminder emails |
| **Financial Summary** | Daily | 11:00 PM | Generates and emails daily financial report |

## 🚀 Features

### 1. Invoice Management
- **Overdue Detection**: Automatically updates invoice status when past due date
- **Late Fee Processing**: Applies configurable late fees with grace period
- **Aging Analysis**: Categorizes overdue invoices by age (1-30, 31-60, 60+ days)

### 2. Customer Notifications
- **Smart Reminders**: Multi-stage payment reminders (3 days, 1 day, due date, overdue)
- **HTML Email Templates**: Professional, branded email communications
- **Lease Renewal Alerts**: Automatic reminders at 30, 15, 7, and 1 day before expiration

### 3. Lease Management
- **Expiration Processing**: Automatically releases expired units
- **Renewal Reminders**: Proactive customer communication
- **Unit Status Updates**: Keeps unit inventory accurate

### 4. Financial Reporting
- **Daily Revenue Tracking**: Comprehensive financial summaries
- **Occupancy Metrics**: Real-time unit occupancy rates
- **Performance Analytics**: Payment rates, collection efficiency
- **Executive Dashboards**: HTML email reports for management

### 5. Admin Management
- **Manual Job Execution**: Trigger any job on-demand via API
- **Job Status Monitoring**: Real-time status of all scheduled jobs
- **Statistics Dashboard**: Comprehensive analytics and insights
- **Individual Job Controls**: Enable/disable specific jobs

## 📊 API Endpoints

### Admin Job Management
```
GET  /api/admin/daily-processing/status          # Get all job statuses
GET  /api/admin/daily-processing/dashboard       # Comprehensive dashboard
POST /api/admin/daily-processing/run/:jobName    # Manually run specific job
GET  /api/admin/daily-processing/stats/:statType # Get specific statistics
```

### Available Job Names
- `overdueDetection`
- `lateFees`
- `paymentReminders`
- `leaseExpiration`
- `financialSummary`

### Available Stat Types
- `overdue` - Overdue invoice statistics with aging
- `lateFees` - Late fee collection performance
- `leaseExpiration` - Upcoming lease expirations
- `financial` - Financial performance metrics

## ⚙️ Configuration

### Environment Variables

```env
# Core Configuration
DAILY_PROCESSING_ENABLED=true
TIMEZONE=America/New_York

# Job Controls (all default to true)
OVERDUE_DETECTION_ENABLED=true
PAYMENT_REMINDERS_ENABLED=true
FINANCIAL_SUMMARY_ENABLED=true
LATE_FEES_ENABLED=true
LEASE_EXPIRATION_ENABLED=true

# Late Fee Settings
DEFAULT_LATE_FEE_MINIMUM=25.00
DEFAULT_LATE_FEE_PERCENTAGE=5.0
LATE_FEE_GRACE_PERIOD_DAYS=5
HIGH_VALUE_OVERDUE_THRESHOLD=500

# Reporting
DAILY_FINANCIAL_REPORT_EMAIL=true
ADMIN_EMAIL_RECIPIENTS=admin@company.com,manager@company.com
```

### Job Customization
Each job can be individually controlled:
- **Enable/Disable**: Toggle jobs via environment variables
- **Schedule Modification**: Edit cron expressions in `jobs/index.js`
- **Configuration**: Adjust business rules via environment variables

## 📈 Business Impact

### Immediate Value
1. **Revenue Protection**: Automatic late fee application recovers lost income
2. **Cash Flow**: Proactive payment reminders improve collection rates
3. **Operational Efficiency**: Eliminates manual invoice status updates
4. **Customer Experience**: Professional, timely communications

### Long-term Benefits
1. **Business Intelligence**: Daily insights drive better decision-making
2. **Scalability**: Handles growing customer base automatically
3. **Compliance**: Consistent, documented business processes
4. **Competitive Advantage**: Professional property management automation

## 🔧 Usage Examples

### Manual Job Execution
```bash
# Run overdue detection manually
curl -X POST http://localhost:5000/api/admin/daily-processing/run/overdueDetection

# Get financial statistics for last 60 days
curl "http://localhost:5000/api/admin/daily-processing/stats/financial?days=60"
```

### Dashboard Integration
The system provides comprehensive APIs for building admin dashboards:
- Real-time job status
- Financial performance metrics
- Overdue account aging
- Lease expiration forecasts

## 🚨 Monitoring & Alerts

### Console Logging
- **Detailed Execution Logs**: Every job provides comprehensive output
- **Error Tracking**: Failed jobs log full error details
- **Performance Metrics**: Job duration and success rates

### Admin Alerts
- **High-Value Overdue**: Automatic alerts for large overdue amounts
- **Job Failures**: Immediate notification of failed jobs
- **System Health**: Daily processing system status

### Email Reports
- **Daily Financial Summary**: Comprehensive business metrics
- **Exception Reports**: Unusual patterns or failures

## 📋 Implementation Notes

### Dependencies
- `node-cron`: Job scheduling
- `nodemailer`: Email notifications (already configured)
- All existing StorageUp models and utilities

### Error Handling
- **Graceful Degradation**: Individual job failures don't affect others
- **Retry Logic**: Built-in error recovery for transient issues
- **Comprehensive Logging**: Full audit trail of all operations

### Performance
- **Database Optimization**: Efficient queries with proper indexing
- **Parallel Processing**: Multiple jobs run independently
- **Resource Management**: Memory and CPU efficient operations

## 🔄 Maintenance

### Regular Tasks
1. **Monitor Job Logs**: Review daily execution logs
2. **Update Configurations**: Adjust business rules as needed
3. **Performance Review**: Analyze job execution times
4. **Email Template Updates**: Keep customer communications fresh

### Troubleshooting
1. **Job Not Running**: Check environment variables and cron schedule
2. **Email Issues**: Verify SMTP configuration
3. **Database Errors**: Check MongoDB connection and indexes
4. **Timezone Issues**: Verify `TIMEZONE` environment variable

---

## 📞 Support

For questions or issues with the Daily Processing System:
1. Check the console logs for detailed error messages
2. Verify environment variable configuration
3. Use the admin API endpoints to check system status
4. Review this documentation for configuration options

The system is designed to be self-healing and provides comprehensive logging for easy troubleshooting.
