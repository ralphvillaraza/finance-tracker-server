import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  signup,
  verifySignup,
  login,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import {
  SignupSchema,
  VerifySignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../schemas/auth.schema.js';

const router = Router();

router.post('/signup', validate(SignupSchema, 'body'), signup);
router.post('/verify-signup', validate(VerifySignupSchema, 'body'), verifySignup);
router.post('/login', validate(LoginSchema, 'body'), login);
router.post('/forgot-password', validate(ForgotPasswordSchema, 'body'), forgotPassword);
router.post('/reset-password', validate(ResetPasswordSchema, 'body'), resetPassword);

export default router;
