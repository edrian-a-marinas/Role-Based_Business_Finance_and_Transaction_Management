import { z } from "zod"
import type { ReactNode } from "react";


// shared 
export type TransactionsProps = {
  children: ReactNode;
};

export type OnCloseProps = {
  onClose: () => void;
};

export type Category = {
  id: number;
  name: string;
};


// Create Transaction
export type Transaction = {
  amount: number;
  category_id: number;
  description: string;
  transaction_date: string;
  transaction_type: "credit" | "debit";
};

// Create a Zod schema for validation
export const transactionSchema = z.object({
  amount: z
    .number()
    .refine(val => val > 0, { message: "Please enter an amount" }) // Covers empty or 0
    .gt(1, { message: "Amount must be greater than 1" }) // Amount must be greater than 1
    .max(999999999999, { message: "Amount exceeds the limit" }),

  category_id: z
    .number()
    .min(1, { message: "Please choose a category" })
    .refine(val => val !== 0, { message: "Category is required" }),

  description: z
    .string()
    .min(1, { message: "Description is required" }),

  transaction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format. Use YYYY-MM-DD" }),

  transaction_type: z
    .enum(["credit", "debit"], { message: "Invalid transaction type" })
});

export type TransactionCreate = z.infer<typeof transactionSchema>;



// View Transactions
export type ReadTransaction = {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  transaction_type: string;
  description: string;
  transaction_date: string;
  created_at: string;
  deleted_at: string | null;
};
