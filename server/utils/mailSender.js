const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
  try {
    // Create a transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail', // You can use any email service (e.g., Gmail, SendGrid, etc.)
      auth: {
        user: process.env.EMAIL_USER, // Your email address (e.g., 'your-email@gmail.com')
        pass: process.env.EMAIL_PASS  // Your email password or app-specific password
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender's email address (dynamic)
      to: email,                    // Recipient's email address (dynamic)
      subject: title,               // Email subject (dynamic)

      // text: body,
      html: body                   // Email body (dynamic)
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = mailSender;