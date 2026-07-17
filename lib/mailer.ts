import nodemailer from "nodemailer";

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function readMailerConfig(): MailerConfig {
  const host = process.env.SMTP_HOST ?? process.env.EMAIL_HOST ?? "";
  const user = process.env.SMTP_USER ?? process.env.EMAIL_USER ?? "";
  const pass = process.env.SMTP_PASS ?? process.env.EMAIL_PASS ?? "";
  const from = process.env.SMTP_FROM ?? process.env.EMAIL_FROM ?? "";
  const portValue = process.env.SMTP_PORT ?? process.env.EMAIL_PORT ?? "587";
  const secureValue = process.env.SMTP_SECURE ?? (portValue === "465" ? "true" : "false");

  const port = Number(portValue);
  if (!host || !user || !pass || !from || Number.isNaN(port)) {
    throw new Error("Missing SMTP config in .env");
  }

  return {
    host,
    port,
    secure: secureValue.toLowerCase() === "true",
    user,
    pass,
    from,
  };
}

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = readMailerConfig();
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}

export async function sendPasswordResetOtpEmail(
  to: string,
  otpCode: string,
  expiresMinutes: number,
): Promise<void> {
  const config = readMailerConfig();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Ma OTP dat lai mat khau",
    text: `Ma OTP cua ban la: ${otpCode}. Ma co hieu luc trong ${expiresMinutes} phut.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2>Dat lai mat khau</h2>
        <p>Ban vua yeu cau dat lai mat khau.</p>
        <p>Ma OTP cua ban la:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otpCode}</p>
        <p>Ma co hieu luc trong <strong>${expiresMinutes} phut</strong>.</p>
        <p>Nếu không phải bạn, vui lòng bỏ qua email này.</p>
      </div>
    `,
  });
}

export async function sendRegistrationOtpEmail(
  to: string,
  otpCode: string,
  expiresMinutes: number,
): Promise<void> {
  const config = readMailerConfig();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Mã OTP xác thực tài khoản",
    text: `Mã OTP xác thực tài khoản FinnCenter của bạn là: ${otpCode}. Mã có hiệu lực trong ${expiresMinutes} phút.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2>Xác thực tài khoản FinnCenter</h2>
        <p>Bạn vừa đăng ký tài khoản FinnCenter.</p>
        <p>Mã OTP của bạn là:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otpCode}</p>
        <p>Mã có hiệu lực trong <strong>${expiresMinutes} phút</strong>.</p>
        <p>Nếu không phải bạn, vui lòng bỏ qua email này.</p>
      </div>
    `,
  });
}

export async function sendTeacherBankAccountOtpEmail(
  to: string,
  otpCode: string,
  expiresMinutes: number,
): Promise<void> {
  const config = readMailerConfig();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Ma OTP xac nhan thay doi tai khoan rut tien",
    text: `Ma OTP xac nhan thay doi tai khoan rut tien FinnCenter cua ban la: ${otpCode}. Ma co hieu luc trong ${expiresMinutes} phut. Neu khong phai ban, vui long lien he quan tri vien.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2>Xac nhan thay doi tai khoan rut tien</h2>
        <p>Ban vua yeu cau thay doi tai khoan nhan tien tren FinnCenter.</p>
        <p>Ma OTP cua ban la:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otpCode}</p>
        <p>Ma co hieu luc trong <strong>${expiresMinutes} phut</strong>.</p>
        <p>Neu khong phai ban, vui long lien he quan tri vien ngay.</p>
      </div>
    `,
  });
}

export async function sendCourseCertificateEmail(
  to: string,
  username: string,
  courseName: string,
): Promise<void> {
  const config = readMailerConfig();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: `Chứng chỉ hoàn thành khóa học: ${courseName}`,
    text: `Chúc mừng ${username}! Bạn đã hoàn thành khóa học ${courseName} và đủ điều kiện nhận chứng chỉ.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2>Chuc mung ${username}!</h2>
        <p>Bạn đã hoàn thành khóa học <strong>${courseName}</strong>.</p>
        <p>Chứng chỉ hoàn thành đã được ghi nhận trong hệ thống.</p>
        <p>Cam on ban da hoc cung FinnCenter.</p>
      </div>
    `,
  });
}

export async function sendBasicEmail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const config = readMailerConfig();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <p>${text}</p>
      </div>
    `,
  });
}
