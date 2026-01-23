-- Seed default notification templates

-- Welcome email template
INSERT INTO notification_templates (name, type, channels, subject, template)
VALUES (
    'welcome_email',
    'transactional',
    ARRAY['email'],
    'Welcome to {{companyName}}!',
    '
    <!DOCTYPE html>
    <html>

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wellcome</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }

            .header {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }

            .content {
                background: white;
                padding: 30px;
                border: 1px solid #e9ecef;
            }

            .code-box {
                background: #f8f9fa;
                border: 2px solid #007bff;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
            }

            .code {
                font-size: 32px;
                font-weight: bold;
                color: #007bff;
                letter-spacing: 4px;
                font-family: 'Courier New', monospace;
            }

            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 0 0 8px 8px;
                font-size: 14px;
                color: #6c757d;
            }

            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
        </style>
    </head>

    <body>
        <div class="header">
            <h1>Welcome {{userName}}!</h1>
        </div>
        <div class="content">
            <p>Hello,</p>

            <p>Thank you for joining {{companyName}}. We''re excited to have you on board.</p>
            <p>Your account has been successfully created with email: <strong>{{userEmail}}</strong></p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <hr />
            <p>© {{year}} {{companyName}}. All rights reserved.</p>

            <p>Best regards,<br>
                {{companyName}} Team</p>
        </div>

        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2026 Crypto Exchange. All rights reserved.</p>
        </div>
    </body>

    </html>
    '
);

-- verification email template
INSERT INTO notification_templates (name, type, channels, subject, template)
VALUES (
    'verification_email',
    'transactional',
    ARRAY['email'],
    'Verification Email',
    '
    <!DOCTYPE html>
    <html>

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Email</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }

            .header {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }

            .content {
                background: white;
                padding: 30px;
                border: 1px solid #e9ecef;
            }

            .code-box {
                background: #f8f9fa;
                border: 2px solid #007bff;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
            }

            .code {
                font-size: 32px;
                font-weight: bold;
                color: #007bff;
                letter-spacing: 4px;
                font-family: 'Courier New', monospace;
            }

            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 0 0 8px 8px;
                font-size: 14px;
                color: #6c757d;
            }

            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
        </style>
    </head>

    <body>
        <div class="header">
            <h1>🔐 Verification Email</h1>
        </div>

        <div class="content">
            <p>Hello,</p>

            <p>You requested a verification email for your account. Please use the link below to complete your verification:
            </p>
            <strong> 🔐 Your Antiphishing code is : {{AntiphishingCode}} </strong>
            <div class="code-box">
                <a class="code" href="#">Verify Email</a>
            </div>
        </div>

        <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
                <li>This email expires in <strong>{{expiresInMinutes}} minutes</strong></li>
                <li>Do not share this email with anyone</li>
                <li>If you didn't request verify your email, please ignore this email</li>
            </ul>
        </div>

        <p>If you're having trouble, please contact our support team.</p>

        <p>Best regards,<br>
            The Security Team</p>
        </div>

        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2026 Crypto Exchange. All rights reserved.</p>
        </div>
    </body>

    </html>
    '
);

-- verification code email template
INSERT INTO notification_templates (name, type, channels, subject, template)
VALUES (
    'verification_code_email',
    'transactional',
    ARRAY['email'],
    'Verification Code',
    '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }
            .content {
                background: white;
                padding: 30px;
                border: 1px solid #e9ecef;
            }
            .code-box {
                background: #f8f9fa;
                border: 2px solid #007bff;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
            }
            .code {
                font-size: 32px;
                font-weight: bold;
                color: #007bff;
                letter-spacing: 4px;
                font-family: 'Courier New', monospace;
            }
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 0 0 8px 8px;
                font-size: 14px;
                color: #6c757d;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔐 Verification Code</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>You requested a verification code for your account. Please use the code below to complete your verification:</p>
            
            <div class="code-box">
                <div class="code">{{code}}</div>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                    <li>This code expires in <strong>{{expiresInMinutes}} minutes</strong></li>
                    <li>Do not share this code with anyone</li>
                    <li>If you didn't request this code, please ignore this email</li>
                </ul>
            </div>
            
            <p>If you're having trouble, please contact our support team.</p>
            
            <p>Best regards,<br>
            The Security Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2026 Crypto Exchange. All rights reserved.</p>
        </div>
    </body>
    </html>
    '
);

-- verification code email template
INSERT INTO notification_templates (name, type, channels, subject, template)
VALUES (
    'reset_password_email',
    'transactional',
    ARRAY['email'],
    'Reset Password',
    '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }
            .content {
                background: white;
                padding: 30px;
                border: 1px solid #e9ecef;
            }
            .code-box {
                background: #f8f9fa;
                border: 2px solid #007bff;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
            }
            .code {
                font-size: 32px;
                font-weight: bold;
                color: #007bff;
                letter-spacing: 4px;
                font-family: 'Courier New', monospace;
            }
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 0 0 8px 8px;
                font-size: 14px;
                color: #6c757d;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔐 Reset Password</h1>
        </div>

        <div class="content">
            <p>Hello,</p>

            <strong> 🔐 Your Antiphishing code is : {{antiphishingCode}} </strong>

            <p>You requested to reset your password. Click the link below:</p>

            <div class="code-box">
                <a href="${resetUrl}" class="code">
                    Reset Password
                </a>
            </div>

            <p>Or copy and paste this link: ${resetUrl}</p>
        </div>

        <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
                <li>This link expires in <strong>{{expiresInMinutes}} minutes</strong></li>
                <li>Do not share this email or link with anyone</li>
                <li>If you didn't request this, please secure your account immediately.</li>
            </ul>
        </div>

        <p>If you're having trouble, please contact our support team.</p>

        <p>Best regards,<br>
            The Security Team</p>
        </div>

        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2026 Crypto Exchange. All rights reserved.</p>
        </div>
    </body>
    </html>
    '
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
