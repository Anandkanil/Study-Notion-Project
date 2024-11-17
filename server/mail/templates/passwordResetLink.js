exports.passwordReset = (email, name, resetLink) => {
    return `<!DOCTYPE html>
    <html>
    
    <head>
        <meta charset="UTF-8">
        <title>Password Reset Request</title>
        <style>
            body {
                background-color: #ffffff;
                font-family: Arial, sans-serif;
                font-size: 16px;
                line-height: 1.4;
                color: #333333;
                margin: 0;
                padding: 0;
            }
    
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
            }
    
            .logo {
                max-width: 200px;
                margin-bottom: 20px;
            }
    
            .message {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 20px;
            }
    
            .body {
                font-size: 16px;
                margin-bottom: 20px;
            }
    
            .button {
                display: inline-block;
                background-color: #007BFF;
                color: #ffffff;
                text-decoration: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 16px;
                margin-top: 20px;
            }
    
            .support {
                font-size: 14px;
                color: #999999;
                margin-top: 20px;
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <a href="https://studynotion-edtech-project.vercel.app"><img class="logo"
                    src="https://i.ibb.co/7Xyj3PC/logo.png" alt="StudyNotion Logo"></a>
            <div class="message">Password Reset Request</div>
            <div class="body">
                <p>Hi ${name},</p>
                <p>We received a request to reset the password for your account associated with <span class="highlight">${email}</span>.</p>
                <p>You can reset your password by clicking the button below:</p>
                <a href="${resetLink}" class="button">Reset Password</a>
                <p>If you did not request this password reset, please ignore this email or contact us immediately to secure your account.</p>
            </div>
            <div class="support">If you have any questions or need assistance, please reach out to us at
                <a href="mailto:studynotionbiz@gmail.com">studynotionbiz@gmail.com</a>.
            </div>
        </div>
    </body>
    
    </html>`;
};
