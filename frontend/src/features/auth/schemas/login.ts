// Email validation pattern (simple, matches general email format)
type EmailStr = string;

// Password constraints: 8-72 chars (same as backend)
type PasswordStr = string;

export interface LoginForm {
  email: EmailStr;
  password: PasswordStr;
}

// Conditional Data validations
export function validateLogin(data: LoginForm): string[] {
  const errors: string[] = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    errors.push("Invalid email format");
  }

  if (!data.password || data.password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }

  if (data.password.length > 72) {
    errors.push("Password must not exceed 72 characters.");
  }

  return errors;
}
