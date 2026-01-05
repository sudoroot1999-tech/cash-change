-- Seed default notification templates

-- Welcome email template
INSERT INTO notification_templates (name, type, channels, subject, template)
VALUES (
    'welcome_email',
    'transactional',
    ARRAY['email'],
    'Welcome to {{companyName}}!',
    '<html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4CAF50;">Welcome {{userName}}!</h1>
            <p>Thank you for joining {{companyName}}. We''re excited to have you on board.</p>
            <p>Your account has been successfully created with email: <strong>{{userEmail}}</strong></p>
            <div style="margin: 30px 0;">
                <a href="{{dashboardUrl}}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Go to Dashboard
                </a>
            </div>
            <p>If you have any questions, feel free to contact our support team.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">© {{year}} {{companyName}}. All rights reserved.</p>
        </div>
    </body>
    </html>'
);

-- Deposit confirmation
INSERT INTO notification_templates (name, type, channels, subject, template, sms_template)
VALUES (
    'deposit_confirmed',
    'transactional',
    ARRAY['email', 'sms', 'in_app'],
    'Deposit Confirmed - {{amount}}',
    '<html>
    <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">✓ Deposit Confirmed</h2>
            <p>Hi {{userName}},</p>
            <p>Your deposit has been successfully confirmed!</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Amount:</strong> {{amount}}</p>
                <p><strong>Currency:</strong> {{currency}}</p>
                <p><strong>Transaction ID:</strong> {{transactionId}}</p>
                <p><strong>Date:</strong> {{date}}</p>
            </div>
            <p>Your new balance is: <strong>{{newBalance}}</strong></p>
        </div>
    </body>
    </html>',
    'Deposit of {{amount}} {{currency}} confirmed. New balance: {{newBalance}}. TxID: {{transactionId}}'
);

-- Withdrawal request
INSERT INTO notification_templates (name, type, channels, subject, template, sms_template)
VALUES (
    'withdrawal_requested',
    'transactional',
    ARRAY['email', 'sms', 'in_app'],
    'Withdrawal Request Received',
    '<html>
    <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #FF9800;">Withdrawal Request</h2>
            <p>Hi {{userName}},</p>
            <p>We have received your withdrawal request.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
                <p><strong>Address:</strong> {{address}}</p>
                <p><strong>Status:</strong> Pending Approval</p>
            </div>
            <p>We will process your request within 24 hours.</p>
        </div>
    </body>
    </html>',
    'Withdrawal request of {{amount}} {{currency}} received. Status: Pending approval.'
);

-- Security alert - Login
INSERT INTO notification_templates (name, type, channels, subject, template, sms_template)
VALUES (
    'security_login_alert',
    'security',
    ARRAY['email', 'sms'],
    'Security Alert: New Login Detected',
    '<html>
    <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f44336;">🔒 Security Alert</h2>
            <p>Hi {{userName}},</p>
            <p>A new login to your account was detected:</p>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800;">
                <p><strong>Time:</strong> {{loginTime}}</p>
                <p><strong>IP Address:</strong> {{ipAddress}}</p>
                <p><strong>Device:</strong> {{device}}</p>
                <p><strong>Location:</strong> {{location}}</p>
            </div>
            <p>If this wasn''t you, please secure your account immediately.</p>
        </div>
    </body>
    </html>',
    'Security Alert: New login from {{location}}. IP: {{ipAddress}}. If not you, secure your account immediately.'
);

-- Price alert
INSERT INTO notification_templates (name, type, channels, subject, template, push_template)
VALUES (
    'price_alert',
    'price_alert',
    ARRAY['push', 'in_app'],
    'Price Alert: {{symbol}} reached {{price}}',
    '<p><strong>{{symbol}}</strong> has {{direction}} your target price of <strong>{{price}}</strong></p>
    <p>Current price: <strong>{{currentPrice}}</strong></p>',
    '{{symbol}} {{direction}} {{price}}. Current: {{currentPrice}}'
);

-- KYC status update
INSERT INTO notification_templates (name, type, channels, subject, template, sms_template)
VALUES (
    'kyc_status_update',
    'kyc_update',
    ARRAY['email', 'sms', 'in_app'],
    'KYC Verification Update',
    '<html>
    <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>KYC Verification Update</h2>
            <p>Hi {{userName}},</p>
            <p>Your KYC verification status has been updated to: <strong>{{status}}</strong></p>
            {{#if approved}}
            <div style="background: #d4edda; padding: 15px; border-radius: 4px; color: #155724;">
                <p>✓ Your account is now fully verified!</p>
            </div>
            {{else}}
            <div style="background: #f8d7da; padding: 15px; border-radius: 4px; color: #721c24;">
                <p>{{reason}}</p>
            </div>
            {{/if}}
        </div>
    </body>
    </html>',
    'KYC verification {{status}}. {{#if approved}}Account verified!{{else}}{{reason}}{{/if}}'
);
