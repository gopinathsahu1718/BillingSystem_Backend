export const Verification_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f6fa;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
              overflow: hidden;
              border: 1px solid #ddd;
          }
          .header {
              background-color: #1565c0;
              color: white;
              padding: 15px;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
          }
          .content {
              padding: 25px;
              color: #333;
              line-height: 1.8;
          }
          .verification-code {
              display: block;
              margin: 20px 0;
              font-size: 32px;
              color: #1565c0;
              background: #e3f2fd;
              border: 2px solid #1565c0;
              padding: 15px;
              text-align: center;
              border-radius: 5px;
              font-weight: bold;
              letter-spacing: 4px;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 15px;
              text-align: center;
              color: #777;
              font-size: 12px;
              border-top: 1px solid #ddd;
          }
          p {
              margin: 0 0 15px;
          }
          .warning {
              color: #d32f2f;
              font-size: 14px;
              margin-top: 20px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Admin Panel - Verify Your Email</div>
          <div class="content">
              <p>Hello Admin,</p>
              <p>Thank you for registering! Please confirm your email address by entering the verification code below:</p>
              <span class="verification-code">{verificationCode}</span>
              <p>This code will expire in <strong>5 minutes</strong>.</p>
              <p class="warning">⚠️ If you did not request this code, please ignore this email and secure your account.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Admin Panel. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
`;

export const Welcome_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Admin Panel</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
              color: #333;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              border: 1px solid #ddd;
          }
          .header {
              background-color: #1565c0;
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 26px;
              font-weight: bold;
          }
          .content {
              padding: 25px;
              line-height: 1.8;
          }
          .welcome-message {
              font-size: 18px;
              margin: 20px 0;
              color: #1565c0;
              font-weight: bold;
          }
          .button {
              display: inline-block;
              padding: 12px 25px;
              margin: 20px 0;
              background-color: #1565c0;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              transition: background-color 0.3s;
          }
          .button:hover {
              background-color: #0d47a1;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 15px;
              text-align: center;
              color: #777;
              font-size: 12px;
              border-top: 1px solid #ddd;
          }
          p {
              margin: 0 0 15px;
          }
          ul {
              padding-left: 20px;
          }
          li {
              margin-bottom: 10px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Welcome to Admin Panel!</div>
          <div class="content">
              <p class="welcome-message">Hello {name},</p>
              <p>Congratulations! Your admin account has been successfully verified and activated.</p>
              <p>You now have access to the admin panel where you can:</p>
              <ul>
                  <li>Manage system settings and configurations</li>
                  <li>Monitor user activities and analytics</li>
                  <li>Access administrative tools and reports</li>
                  <li>Manage content and resources</li>
              </ul>
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Thank you for joining our team!</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Admin Panel. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
          </div>
      </div>
  </body>
  </html>
`;