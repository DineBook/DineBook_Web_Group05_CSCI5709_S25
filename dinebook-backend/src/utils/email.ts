import nodemailer from "nodemailer";

const createTransporter = () => {
  if (process.env.NODE_ENV === "development" && !process.env.EMAIL_USER) {
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "ethereal.user@ethereal.email",
        pass: "ethereal.pass",
      },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER || "noreply@dinebook.com",
    to,
    subject: "Verify Your Email - DineBook",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; font-size: 28px; margin: 0; font-weight: 700;">DineBook</h1>
        </div>
        
        <h2 style="color: #6366f1; text-align: center; font-size: 24px; margin-bottom: 20px;">Welcome to DineBook!</h2>
        
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for joining DineBook! We're excited to help you discover amazing restaurants and make memorable dining experiences.
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Please verify your email address by clicking the button below to activate your account:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://dine-book-web-group05-csci-5709-s25.vercel.app/verify?token=${token}" 
               style="padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.25);">
              Verify Email Address
            </a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin: 20px 0 0 0;">
            If you didn't create an account with DineBook, please ignore this email. Your email address will not be added to our system.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin: 0;">
          Thank you for choosing DineBook!<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV === "development") {
  }
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER || "noreply@dinebook.com",
    to,
    subject: "Reset Your Password - DineBook",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; font-size: 28px; margin: 0; font-weight: 700;">DineBook</h1>
        </div>
        
        <h2 style="color: #6366f1; text-align: center; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h2>
        
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            We received a request to reset your password for your DineBook account.
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Click the button below to reset your password. This link will expire in 1 hour for your security.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://dine-book-web-group05-csci-5709-s25.vercel.app/reset-password?token=${token}" 
               style="padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.25);">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin: 20px 0 0 0;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged and secure.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin: 0;">
          Thank you for using DineBook!<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV === "development" && !process.env.EMAIL_USER) {
    const testUrl = nodemailer.getTestMessageUrl(info);
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
      from: process.env.EMAIL_USER || "bookings@dinebook.com",
      to,
      subject: `Booking Confirmation - ${bookingDetails.restaurantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; font-size: 28px; margin: 0; font-weight: 700;">DineBook</h1>
          </div>
          
          <h2 style="color: #10b981; text-align: center; font-size: 24px; margin-bottom: 20px;">🎉 Booking Confirmed!</h2>
          
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 30px; border-radius: 12px; margin: 20px 0; border: 1px solid #d1fae5;">
            <h3 style="color: #047857; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Your Reservation Details:</h3>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1;">
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong style="color: #1f2937;">Booking ID:</strong> <span style="color: #6366f1; font-weight: 600;">${bookingDetails.bookingId}</span></p>
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong style="color: #1f2937;">Restaurant:</strong> ${bookingDetails.restaurantName}</p>
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong style="color: #1f2937;">Date:</strong> ${bookingDetails.date}</p>
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong style="color: #1f2937;">Time:</strong> ${bookingDetails.time}</p>
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong style="color: #1f2937;">Guests:</strong> ${bookingDetails.guests}</p>
              ${bookingDetails.specialRequests
          ? `<p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong style="color: #1f2937;">Special Requests:</strong> ${bookingDetails.specialRequests}</p>`
          : ""
        }
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="color: #059669; font-size: 16px; font-weight: 600; margin: 0 0 10px 0; text-align: center;">
                ✅ Your table has been reserved successfully!
              </p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                Please arrive on time. For any changes or cancellations, please contact the restaurant directly or use your DineBook account.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
              Need to make changes to your booking?
            </p>
            <a href="https://dine-book-web-group05-csci-5709-s25.vercel.app/my-bookings" 
               style="padding: 12px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.25);">
              Manage My Bookings
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin: 0;">
            Thank you for choosing DineBook!<br>
            This is an automated email, please do not reply.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === "development" && !process.env.EMAIL_USER) {
      const testUrl = nodemailer.getTestMessageUrl(info);
    }

    return info;
  } catch (error) {
    console.error("Email sending failed:", error);

    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        emailConfig: {
          to,
          from: process.env.EMAIL_USER || "bookings@dinebook.com",
          hasEmailUser: !!process.env.EMAIL_USER,
          hasEmailPass: !!process.env.EMAIL_PASS,
          nodeEnv: process.env.NODE_ENV,
        },
      });
    }

    throw error;
  }
};
