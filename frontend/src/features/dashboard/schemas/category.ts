import { z } from "zod";

// schema for category validation
export const categorySchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  type: z.enum(["Expense", "Income"], { message: "Type must be Expense or Income" })
});

export type CategoryCreate = z.infer<typeof categorySchema>;
export type CategoryUpdate = z.infer<typeof categorySchema>;

export type CategoryRead = {
  id: number;
  name: string;
  description: string | null;
  type: "Expense" | "Income";
  created_at: string;
};

