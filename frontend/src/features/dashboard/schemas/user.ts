type ReadUser = {
  id:              number;
  email:           string;
  first_name:      string;
  middle_name:     string | null;
  last_name:       string;
  phone_number:    string | null;
  role_id:         1 | 2;
  is_active:       boolean;
  created_at:      string;
  request_admin:   boolean;
  requested_by:    number;
};

export type ReadUserWithCount = ReadUser & {
  transaction_count?: number;
};

export type ViewMode        = "all" | "admin" | "standard";
export type PromoteViewMode = "all" | "admin" | "standard";

export type PromoteUserPayload  = { role_id: 1 | 2 };
export type PromoteUserResponse = { message: string };

export type DeletionRequest = {
  id:             number;
  transaction_id: number;
  requested_by:   number;
  status:         "pending" | "approved" | "rejected";
  requested_at:   string;
  reviewed_by:    number | null;
  reviewed_at:    string | null;
  requester?:     ReadUser | null;
  transaction?:   TransactionInfo | null;
};

export type TransactionInfo = {
  id:               number;
  amount:           number;
  category_id:      number;
  category_name:    string;
  description:      string;
  transaction_type: string;
  transaction_date: string;
};

// Shared with auth/schemas/register.ts and backend schemas/users.py
export const nameRegex  = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
export const phoneRegex = /^09\d{9}$/;

export function validateProfileUpdate(fields: {
  firstName:  string;
  lastName:   string;
  middleName: string;
  phone:      string;
}): string[] {
  const { firstName, lastName, middleName, phone } = fields;
  const errors: string[] = [];

  if (!firstName.trim())
    errors.push("First name is required.");
  else if (firstName.trim().length > 50)
    errors.push("First name must be 50 characters or fewer.");
  else if (!nameRegex.test(firstName.trim()))
    errors.push("First name cannot contain numbers or special characters.");

  if (!lastName.trim())
    errors.push("Last name is required.");
  else if (lastName.trim().length > 50)
    errors.push("Last name must be 50 characters or fewer.");
  else if (!nameRegex.test(lastName.trim()))
    errors.push("Last name cannot contain numbers or special characters.");

  if (middleName.trim()) {
    if (middleName.trim().length > 50)
      errors.push("Middle name must be 50 characters or fewer.");
    else if (!nameRegex.test(middleName.trim()))
      errors.push("Middle name cannot contain numbers or special characters.");
  }

  if (phone.trim() && !phoneRegex.test(phone.trim()))
    errors.push("Phone number must be 11 digits and start with 09.");

  return errors;
}


export function validatePasswordChange(fields: {
  currentPw: string;
  newPw:     string;
  confirmPw: string;
}): string[] {
  const { currentPw, newPw, confirmPw } = fields;
  const errors: string[] = [];
  if (!currentPw)
    errors.push("Current password is required.");
  if (!newPw)
    errors.push("New password is required.");
  else if (newPw.length < 8)
    errors.push("New password must be at least 8 characters.");
  else if (newPw.length > 72)
    errors.push("New password must be at most 72 characters.");
  if (newPw && confirmPw && newPw !== confirmPw)
    errors.push("New passwords do not match.");
  if (currentPw && newPw && newPw === currentPw)
    errors.push("New password must differ from the current password.");
  return errors;
}