import { z } from "zod";

export type ModalStep = "list" | "add" | "confirmAdd" | "edit" | "deleteConfirm";

// schema for category validation
export const categorySchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["Expense", "Income"], { message: "Type must be Expense or Income" })
});

export type CategoryCreate = z.infer<typeof categorySchema>;
export type CategoryUpdate = z.infer<typeof categorySchema>;

export type CategoryRead = {
  id: number;
  name: string;
  description: string;
  type: "Expense" | "Income";
  created_at: string;
};

