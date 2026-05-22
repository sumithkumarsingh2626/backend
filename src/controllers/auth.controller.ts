import crypto from 'crypto';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { env } from '../configs/env';
import { HttpStatus } from '../constants';
import { User, type IUser } from '../models/user.model';
import { sendOtpEmail } from '../services/email.service';
import {
  decodeToken,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../services/token.service';
import { asyncHandler } from '../utils/async-handler.util';
import { sendSuccess } from '../utils/api-response.util';
import { logger } from '../utils/logger';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/AppError';

function buildOtp(): string {
  return crypto.randomInt(0, 10 ** env.OTP_LENGTH).toString().padStart(env.OTP_LENGTH, '0');
}

async function createOtpBundle(minutes: number): Promise<{ otp: string; hash: string; expiresAt: Date }> {
  const otp = buildOtp();
  const hash = await bcrypt.hash(otp, env.BCRYPT_COST_OTP);
  const expiresAt = new Date(Date.now() + minutes * 60_000);
  return { otp, hash, expiresAt };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const secure = env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response): void {
  const secure = env.NODE_ENV === 'production';

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
  });
}

function sanitizeUser(user: IUser): Record<string, unknown> {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    profileImage: user.profileImage,
    isVerified: user.isVerified,
    notificationPreferences: user.notificationPreferences,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function issueSession(user: IUser, res: Response): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id, user.role);

  user.activeRefreshTokenHash = hashToken(refreshToken);
  await user.save();
  setAuthCookies(res, accessToken, refreshToken);

  return { accessToken, refreshToken };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, phoneNumber, profileImage } = req.body as {
    fullName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    profileImage?: string;
  };

  const existing = await User.findOne({ email });

  if (existing?.isVerified) {
    throw new ConflictError('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST_PASSWORD);
  const { otp, hash, expiresAt } = await createOtpBundle(env.OTP_EXPIRY_MINUTES);

  const user =
    existing ??
    new User({
      email,
    });

  user.fullName = fullName;
  user.passwordHash = passwordHash;
  user.phoneNumber = phoneNumber;
  user.profileImage = profileImage;
  user.isVerified = false;
  user.otpCode = hash;
  user.otpExpiresAt = expiresAt;
  user.resetPasswordOtpCode = undefined;
  user.resetPasswordOtpExpiresAt = undefined;

  await user.save();

  try {
    await sendOtpEmail(email, otp, 'verification');
  } catch (mailError) {
    const message = mailError instanceof Error ? mailError.message : String(mailError);
    logger.error(`Registration OTP email failed for ${email}: ${message}`);

    if (env.NODE_ENV === 'production') {
      throw new AppError(
        'Account created but verification email could not be sent. Try resend OTP or contact support.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    logger.warn(`[DEV] Registration OTP for ${email}: ${otp}`);
  }

  sendSuccess(
    res,
    {
      email,
      otpExpiresAt: expiresAt,
    },
    'Registration successful. Please verify the OTP sent to your email.',
    HttpStatus.CREATED,
  );
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body as { email: string; otp: string };

  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError('User not found');
  if (user.isVerified) throw new BadRequestError('Account is already verified.');
  if (!user.otpCode || !user.otpExpiresAt) throw new BadRequestError('No OTP is pending for this account.');
  if (user.otpExpiresAt < new Date()) throw new AppError('OTP expired. Please request a new code.', HttpStatus.GONE);

  const isMatch = await bcrypt.compare(otp, user.otpCode);
  if (!isMatch) throw new UnauthorizedError('Invalid OTP.');

  user.isVerified = true;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;

  const session = await issueSession(user, res);

  sendSuccess(
    res,
    {
      ...session,
      user: sanitizeUser(user),
    },
    'OTP verified successfully.',
  );
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await User.findOne({ email });

  if (!user) throw new NotFoundError('User not found');
  if (user.isVerified) throw new BadRequestError('Account is already verified.');

  const { otp, hash, expiresAt } = await createOtpBundle(env.OTP_EXPIRY_MINUTES);
  user.otpCode = hash;
  user.otpExpiresAt = expiresAt;
  await user.save();

  await sendOtpEmail(email, otp, 'verification');

  sendSuccess(
    res,
    {
      email,
      otpExpiresAt: expiresAt,
    },
    'A new OTP has been sent.',
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email }).select('+activeRefreshTokenHash');
  if (!user) throw new UnauthorizedError('Invalid email or password.');
  if (!user.isVerified) throw new ForbiddenError('Please verify your email before logging in.');

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw new UnauthorizedError('Invalid email or password.');

  const session = await issueSession(user, res);

  sendSuccess(res, {
    ...session,
    user: sanitizeUser(user),
  });
});

export const refreshTokens = asyncHandler(async (req: Request, res: Response) => {
  const token =
    (req.cookies?.refreshToken as string | undefined) ??
    ((req.body as { refreshToken?: string }).refreshToken ?? undefined);

  if (!token) {
    throw new UnauthorizedError('Refresh token missing.');
  }

  const payload = decodeToken(token);

  if (!payload || payload.type !== 'refresh') {
    throw new UnauthorizedError('Invalid refresh token.');
  }

  const user = await User.findById(payload.id).select('+activeRefreshTokenHash');

  if (!user || !user.activeRefreshTokenHash) {
    throw new UnauthorizedError('Refresh session not found.');
  }

  if (user.activeRefreshTokenHash !== hashToken(token)) {
    throw new UnauthorizedError('Refresh token has been revoked.');
  }

  const session = await issueSession(user, res);

  sendSuccess(res, session, 'Tokens refreshed.');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();

  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('User not found');

  sendSuccess(res, { user: sanitizeUser(user) }, 'Authenticated user fetched.');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, {
      $unset: {
        activeRefreshTokenHash: 1,
      },
    });
  }

  clearAuthCookies(res);
  sendSuccess(res, undefined, 'Logged out successfully.');
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await User.findOne({ email });

  if (!user) {
    sendSuccess(res, undefined, 'If the email exists, a reset OTP has been sent.');
    return;
  }

  const { otp, hash, expiresAt } = await createOtpBundle(env.PASSWORD_RESET_EXPIRY_MINUTES);
  user.resetPasswordOtpCode = hash;
  user.resetPasswordOtpExpiresAt = expiresAt;
  await user.save();

  await sendOtpEmail(email, otp, 'password_reset');

  sendSuccess(
    res,
    {
      email,
      otpExpiresAt: expiresAt,
    },
    'If the email exists, a reset OTP has been sent.',
  );
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body as {
    email: string;
    otp: string;
    newPassword: string;
  };

  const user = await User.findOne({ email }).select('+activeRefreshTokenHash');

  if (!user || !user.resetPasswordOtpCode || !user.resetPasswordOtpExpiresAt) {
    throw new BadRequestError('No password reset request is pending.');
  }

  if (user.resetPasswordOtpExpiresAt < new Date()) {
    throw new AppError('OTP expired. Please request a new reset code.', HttpStatus.GONE);
  }

  const isMatch = await bcrypt.compare(otp, user.resetPasswordOtpCode);
  if (!isMatch) throw new UnauthorizedError('Invalid OTP.');

  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_COST_PASSWORD);
  user.resetPasswordOtpCode = undefined;
  user.resetPasswordOtpExpiresAt = undefined;
  user.activeRefreshTokenHash = undefined;
  await user.save();

  clearAuthCookies(res);

  sendSuccess(res, undefined, 'Password reset successful.');
});

export const adminPing = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { ok: true }, 'Admin route reachable.');
});
