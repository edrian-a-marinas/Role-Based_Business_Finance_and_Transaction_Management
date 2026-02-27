// schemas/user.ts

type ReadUser = {
  id: number;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone_number: string | null;
  role_id: 1 | 2;
  is_active: boolean;
  created_at: string;
  request_admin: boolean;
  requested_by: number;
};

export type ReadUserWithCount = ReadUser & {
  transaction_count?: number; 
};

export type ViewMode = "all" | "admin" | "standard";

export type PromoteUserPayload = {
  role_id: 1 | 2;
};

export type PromoteUserResponse = {
  message: string;
};

export type PromoteViewMode = "all" | "admin" | "standard";


export type DeletionRequest = {
  id: number;
  transaction_id: number;
  requested_by: number;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_by: number | null;
  reviewed_at: string | null;

  requester?: ReadUser | null;

  transaction?: TransactionInfo | null;
};


export type TransactionInfo = {
  id: number;
  amount: number;
  category_id: number;
  category_name: string;
  description: string;
  transaction_type: string;
  transaction_date: string;
};