import { z } from "zod";

export const UserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  middle_name: z.string().nullable().optional(),
  last_name: z.string(),
  email: z.string().email(),
  phone_number: z.string().nullable().optional(),
  role_id: z.number(),
  is_active: z.boolean(),
  created_at: z.string().datetime().or(z.string()),
});

export type User = z.infer<typeof UserSchema>;

export type AuthContextType = {
  isLoggedIn:   boolean;
  user:         User | null;
  setLoggedIn:  (val: boolean) => void;
  setUser:      (user: User | null) => void;
  logout:       () => void;
};