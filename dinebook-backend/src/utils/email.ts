import nodemailer from 'nodemailer';


const createTransporter = () => {
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
    
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }
  
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER || 'test@dinebook.com',
    to,
    subject: 'Verify Your Email - DineBook',
    html: `
      <h2>Welcome to DineBook!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="http://localhost:4200/verify?token=${token}" style="padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>If you didn't sign up, please ignore this email.</p>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  
  
  if (process.env.NODE_ENV === 'development') {
    }
};

export const sendBookingConfirmationEmail = async (
  to: string,
  bookingDetails: {
    bookingId: string;
    restaurantName: string;
    date: string;
    time: string;
    guests: number;
    specialRequests?: string;
  }
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER || 'bookings@dinebook.com',
      to,
      subject: `Booking Confirmation - ${bookingDetails.restaurantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d32f2f; text-align: center;">Booking Confirmed!</h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Booking Details:</h3>
            <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
            <p><strong>Restaurant:</strong> ${bookingDetails.restaurantName}</p>
            <p><strong>Date:</strong> ${bookingDetails.date}</p>
            <p><strong>Time:</strong> ${bookingDetails.time}</p>
            <p><strong>Guests:</strong> ${bookingDetails.guests}</p>
            ${bookingDetails.specialRequests ? `<p><strong>Special Requests:</strong> ${bookingDetails.specialRequests}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666;">Your table has been reserved successfully!</p>
            <p style="color: #666; font-size: 14px;">Please arrive on time. For any changes or cancellations, please contact the restaurant directly.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="text-align: center; color: #999; font-size: 12px;">
            Thank you for choosing DineBook!<br>
            This is an automated email, please do not reply.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
      const testUrl = nodemailer.getTestMessageUrl(info);
    };
    
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        emailConfig: {
          to,
          from: process.env.EMAIL_USER || 'bookings@dinebook.com',
          hasEmailUser: !!process.env.EMAIL_USER,
          hasEmailPass: !!process.env.EMAIL_PASS,
          nodeEnv: process.env.NODE_ENV
        }
      });
    }
    
    throw error;
  }
};