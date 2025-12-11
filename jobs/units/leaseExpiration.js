// Lease Expiration Processor Job
import User from '../../models/User.js';
import Unit from '../../models/Unit.js';
import { sendEmail } from '../../utils/emailService.js';

/**
 * Daily job to process lease expirations and send renewal reminders
 * Runs at 1:00 AM daily to check for expiring leases
 * @param {Date} processingDate - Optional date to process for (defaults to today)
 */
export const leaseExpirationProcessor = async (processingDate = null) => {
  const startTime = new Date();
  const processDate = processingDate || new Date();
  processDate.setHours(0, 0, 0, 0);
  
  console.log(`🏠 Starting lease expiration processing at ${startTime.toISOString()}`);
  console.log(`📅 Processing date: ${processDate.toISOString().split('T')[0]}`);

  try {
    const today = processDate;

    // Define expiration alert schedules (in days before expiration)
    const alertSchedules = [30, 15, 7, 1]; // 30 days, 2 weeks, 1 week, 1 day
    
    let totalProcessed = 0;
    let renewalsSent = 0;
    let expiredProcessed = 0;
    const details = [];

    // 1. Process lease renewals reminders
    for (const days of alertSchedules) {
      console.log(`📅 Checking leases expiring in ${days} days...`);
      
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(23, 59, 59, 999);

      // Find users with rented units expiring on the target date
      const usersWithExpiringLeases = await User.find({
        'rented_units': {
          $elemMatch: {
            end_date: {
              $gte: targetDate,
              $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        }
      }).populate('rented_units.unit_id', 'unit_number monthly_rate location');

      if (usersWithExpiringLeases.length === 0) {
        console.log(`   ✅ No leases expiring in ${days} days`);
        continue;
      }

      console.log(`   📋 Found ${usersWithExpiringLeases.length} users with leases expiring in ${days} days`);

      for (const user of usersWithExpiringLeases) {
        try {
          // Find the specific expiring units for this user
          const expiringUnits = user.rented_units.filter(rental => {
            const endDate = new Date(rental.end_date);
            return endDate >= targetDate && endDate < new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
          });

          if (expiringUnits.length === 0) continue;

          totalProcessed++;

          // Send renewal reminder email
          if (user.email) {
            const emailContent = generateRenewalReminderEmail(user, expiringUnits, days);
            
            await sendEmail({
              to: user.email,
              subject: emailContent.subject,
              text: emailContent.text,
              html: emailContent.html
            });

            renewalsSent++;
            console.log(`     ✅ Renewal reminder sent to ${user.email} (${expiringUnits.length} units, ${days} days)`);
          }

          details.push({
            type: 'renewal_reminder',
            customer_name: user.name,
            customer_email: user.email,
            units: expiringUnits.map(u => ({
              unit_number: u.unit_id?.unit_number,
              end_date: u.end_date
            })),
            days_until_expiration: days,
            email_sent: !!user.email
          });

        } catch (error) {
          console.error(`     ❌ Error processing renewal for ${user.email}:`, error.message);
        }
      }
    }

    // 2. Process actual lease expirations (end_date = today)
    console.log(`🔚 Processing leases expiring today...`);
    
    const usersWithExpiringToday = await User.find({
      'rented_units': {
        $elemMatch: {
          end_date: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }
    }).populate('rented_units.unit_id', 'unit_number monthly_rate location');

    for (const user of usersWithExpiringToday) {
      try {
        const expiringTodayUnits = user.rented_units.filter(rental => {
          const endDate = new Date(rental.end_date);
          return endDate >= today && endDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        });

        if (expiringTodayUnits.length === 0) continue;

        for (const rental of expiringTodayUnits) {
          // Update unit status to vacant
          if (rental.unit_id) {
            await Unit.findByIdAndUpdate(rental.unit_id._id, {
              unit_is: 'vacant',
              customer_email: null
            });

            console.log(`     🏠 Unit ${rental.unit_id.unit_number} marked as vacant`);
          }

          // Remove the rental from user's rented_units
          user.rented_units = user.rented_units.filter(
            r => r.unit_id?.toString() !== rental.unit_id?._id?.toString()
          );
        }

        await user.save();
        expiredProcessed++;

        // Send lease expiration notification
        if (user.email) {
          const emailContent = generateExpirationNotificationEmail(user, expiringTodayUnits);
          
          await sendEmail({
            to: user.email,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
          });

          console.log(`     📧 Expiration notification sent to ${user.email}`);
        }

        details.push({
          type: 'lease_expired',
          customer_name: user.name,
          customer_email: user.email,
          units: expiringTodayUnits.map(u => ({
            unit_number: u.unit_id?.unit_number,
            end_date: u.end_date
          })),
          units_released: expiringTodayUnits.length
        });

      } catch (error) {
        console.error(`❌ Error processing expiration for ${user.email}:`, error.message);
      }
    }

    const result = {
      totalProcessed,
      renewalRemindersSent: renewalsSent,
      leaseExpirations: expiredProcessed,
      details
    };

    console.log(`✅ Lease expiration processing completed:`);
    console.log(`   📋 Total processed: ${result.totalProcessed} customers`);
    console.log(`   📧 Renewal reminders sent: ${result.renewalRemindersSent}`);
    console.log(`   🔚 Lease expirations processed: ${result.leaseExpirations}`);

    return result;

  } catch (error) {
    console.error('❌ Fatal error in lease expiration processing:', error);
    throw error;
  }
};

/**
 * Generate renewal reminder email content
 */
const generateRenewalReminderEmail = (user, expiringUnits, days) => {
  const customerName = user.name;
  const isMultipleUnits = expiringUnits.length > 1;
  const unitsList = expiringUnits.map(u => u.unit_id?.unit_number || 'N/A').join(', ');
  
  let urgency, subject;
  if (days === 30) {
    urgency = 'upcoming';
    subject = `Lease Renewal Reminder - 30 Days Notice`;
  } else if (days === 15) {
    urgency = 'attention';
    subject = `Lease Renewal Reminder - 2 Weeks Notice`;
  } else if (days === 7) {
    urgency = 'urgent';
    subject = `URGENT: Lease Expires in 1 Week`;
  } else if (days === 1) {
    urgency = 'critical';
    subject = `FINAL NOTICE: Lease Expires Tomorrow`;
  } else {
    urgency = 'general';
    subject = `Lease Renewal Reminder`;
  }

  // Text version
  const text = `
Dear ${customerName},

This is a friendly reminder that your lease for ${isMultipleUnits ? 'units' : 'unit'} ${unitsList} ${isMultipleUnits ? 'are' : 'is'} set to expire in ${days} ${days === 1 ? 'day' : 'days'}.

Lease Details:
${expiringUnits.map(unit => `- Unit ${unit.unit_id?.unit_number}: Expires ${new Date(unit.end_date).toLocaleDateString()}`).join('\n')}

To avoid any interruption in service, please contact us as soon as possible to:
- Renew your lease
- Discuss new lease terms
- Schedule move-out if you're not renewing

Contact Information:
- Phone: [Your Phone Number]
- Email: [Your Email]
- Online Portal: ${process.env.CLIENT_URL || 'https://your-portal.com'}

If you're planning to vacate, please ensure:
- All personal items are removed by the expiration date
- Unit is left clean and in good condition
- Contact us to schedule final inspection

Thank you for choosing StorageUp for your storage needs.

Best regards,
StorageUp Management

---
This is an automated reminder. Please contact us if you have any questions.
  `.trim();

  // HTML version
  const urgencyColors = {
    upcoming: '#3b82f6',    // Blue
    attention: '#f59e0b',   // Orange
    urgent: '#dc2626',      // Red
    critical: '#991b1b',    // Dark red
    general: '#6b7280'      // Gray
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: ${urgencyColors[urgency]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${urgency === 'critical' ? '⚠️ ' : '🏠 '}Lease Renewal Reminder</h2>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${days} ${days === 1 ? 'Day' : 'Days'} Notice</p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
        <p><strong>Dear ${customerName},</strong></p>
        
        <p>This is a ${days <= 7 ? 'urgent' : 'friendly'} reminder that your lease for ${isMultipleUnits ? 'units' : 'unit'} <strong>${unitsList}</strong> ${isMultipleUnits ? 'are' : 'is'} set to expire in <strong style="color: ${urgencyColors[urgency]};">${days} ${days === 1 ? 'day' : 'days'}</strong>.</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: ${urgencyColors[urgency]};">Lease Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                ${expiringUnits.map(unit => `
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Unit ${unit.unit_id?.unit_number}:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Expires ${new Date(unit.end_date).toLocaleDateString()}</td>
                </tr>
                `).join('')}
            </table>
        </div>
        
        <div style="background-color: ${urgency === 'critical' ? '#f8d7da' : '#d1ecf1'}; border: 1px solid ${urgency === 'critical' ? '#f5c6cb' : '#bee5eb'}; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: ${urgency === 'critical' ? '#721c24' : '#0c5460'};">Action Required</h3>
            <p style="margin: 0;">To avoid any interruption in service, please contact us as soon as possible to:</p>
            <ul style="margin: 10px 0;">
                <li>Renew your lease</li>
                <li>Discuss new lease terms</li>
                <li>Schedule move-out if you're not renewing</li>
            </ul>
        </div>
        
        <h3 style="color: ${urgencyColors[urgency]};">Contact Information:</h3>
        <ul>
            <li><strong>Phone:</strong> [Your Phone Number]</li>
            <li><strong>Email:</strong> [Your Email]</li>
            <li><strong>Online Portal:</strong> <a href="${process.env.CLIENT_URL || 'https://your-portal.com'}" style="color: ${urgencyColors[urgency]};">Customer Portal</a></li>
        </ul>
        
        ${urgency === 'critical' ? `
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">If You're Moving Out:</h4>
            <ul style="margin: 0;">
                <li>Remove all personal items by expiration date</li>
                <li>Leave unit clean and in good condition</li>
                <li>Contact us to schedule final inspection</li>
            </ul>
        </div>
        ` : ''}
        
        <p><em>Thank you for choosing StorageUp for your storage needs.</em></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
        
        <p style="font-size: 0.9em; color: #6c757d;">
            Best regards,<br>
            <strong>StorageUp Management</strong>
        </p>
        
        <p style="font-size: 0.8em; color: #6c757d; margin-top: 30px;">
            This is an automated reminder. Please contact us if you have any questions.
        </p>
    </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
};

/**
 * Generate lease expiration notification email
 */
const generateExpirationNotificationEmail = (user, expiredUnits) => {
  const customerName = user.name;
  const isMultipleUnits = expiredUnits.length > 1;
  const unitsList = expiredUnits.map(u => u.unit_id?.unit_number || 'N/A').join(', ');

  const subject = `Lease Expiration Notice - ${unitsList}`;

  // Text version
  const text = `
Dear ${customerName},

This notification confirms that your lease for ${isMultipleUnits ? 'units' : 'unit'} ${unitsList} has expired as of today, ${new Date().toLocaleDateString()}.

Expired Lease Details:
${expiredUnits.map(unit => `- Unit ${unit.unit_id?.unit_number}: Expired ${new Date(unit.end_date).toLocaleDateString()}`).join('\n')}

${isMultipleUnits ? 'These units have' : 'This unit has'} been released from your account and ${isMultipleUnits ? 'are' : 'is'} now available for rental.

If you have any questions about final charges, deposits, or need assistance, please contact us immediately.

Thank you for choosing StorageUp for your storage needs.

Best regards,
StorageUp Management

Contact Information:
- Phone: [Your Phone Number]
- Email: [Your Email]
  `.trim();

  // HTML version
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #6c757d; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🔚 Lease Expiration Notice</h2>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString()}</p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
        <p><strong>Dear ${customerName},</strong></p>
        
        <p>This notification confirms that your lease for ${isMultipleUnits ? 'units' : 'unit'} <strong>${unitsList}</strong> has expired as of today.</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #6c757d;">Expired Lease Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                ${expiredUnits.map(unit => `
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Unit ${unit.unit_id?.unit_number}:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Expired ${new Date(unit.end_date).toLocaleDateString()}</td>
                </tr>
                `).join('')}
            </table>
        </div>
        
        <div style="background-color: #e9ecef; border: 1px solid #ced4da; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Status Update:</strong> ${isMultipleUnits ? 'These units have' : 'This unit has'} been released from your account and ${isMultipleUnits ? 'are' : 'is'} now available for rental.</p>
        </div>
        
        <p>If you have any questions about final charges, deposits, or need assistance, please contact us immediately.</p>
        
        <h3 style="color: #6c757d;">Contact Information:</h3>
        <ul>
            <li><strong>Phone:</strong> [Your Phone Number]</li>
            <li><strong>Email:</strong> [Your Email]</li>
        </ul>
        
        <p><em>Thank you for choosing StorageUp for your storage needs.</em></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
        
        <p style="font-size: 0.9em; color: #6c757d;">
            Best regards,<br>
            <strong>StorageUp Management</strong>
        </p>
    </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
};

/**
 * Get lease expiration statistics for reporting
 */
export const getLeaseExpirationStats = async (days = 30) => {
  try {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    // Find users with leases expiring within the specified period
    const usersWithExpiringLeases = await User.find({
      'rented_units': {
        $elemMatch: {
          end_date: {
            $gte: today,
            $lte: futureDate
          }
        }
      }
    }).populate('rented_units.unit_id', 'unit_number location');

    const expirationDetails = [];
    let totalExpiringUnits = 0;

    for (const user of usersWithExpiringLeases) {
      const expiringUnits = user.rented_units.filter(rental => {
        const endDate = new Date(rental.end_date);
        return endDate >= today && endDate <= futureDate;
      });

      if (expiringUnits.length > 0) {
        totalExpiringUnits += expiringUnits.length;
        expirationDetails.push({
          customer_name: user.name,
          customer_email: user.email,
          units: expiringUnits.map(u => ({
            unit_number: u.unit_id?.unit_number,
            end_date: u.end_date,
            days_until_expiration: Math.ceil((new Date(u.end_date) - today) / (1000 * 60 * 60 * 24))
          }))
        });
      }
    }

    return {
      period: `${days} days`,
      totalCustomersAffected: usersWithExpiringLeases.length,
      totalExpiringUnits,
      details: expirationDetails.sort((a, b) => 
        Math.min(...a.units.map(u => u.days_until_expiration)) - 
        Math.min(...b.units.map(u => u.days_until_expiration))
      )
    };

  } catch (error) {
    console.error('Error getting lease expiration stats:', error);
    throw error;
  }
};
