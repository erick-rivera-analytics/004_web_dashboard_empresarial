import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────────────
export type User = {
  id: number;
  username: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: number;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateUserInput = {
  username: string;
  password: string;
  isActive?: boolean;
};

export type UpdateUserInput = {
  username?: string;
  password?: string;
  isActive?: boolean;
};

// ── Mapper ───────────────────────────────────────────────────────────────────
function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────
export async function listUsers(): Promise<User[]> {
  const result = await query<UserRow>(
    "SELECT id, username, is_active, created_at, updated_at FROM public.users ORDER BY created_at DESC",
    [],
  );
  return result.rows.map(mapUser);
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await query<UserRow>(
    "SELECT id, username, is_active, created_at, updated_at FROM public.users WHERE id = $1",
    [id],
  );
  if (result.rows.length === 0) return null;
  return mapUser(result.rows[0]);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await query<UserRow>(
    "SELECT id, username, is_active, created_at, updated_at FROM public.users WHERE username = $1",
    [username],
  );
  if (result.rows.length === 0) return null;
  return mapUser(result.rows[0]);
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const isActive = input.isActive ?? true;

  const result = await query<UserRow>(
    `INSERT INTO public.users (username, password_hash, is_active)
     VALUES ($1, $2, $3)
     RETURNING id, username, is_active, created_at, updated_at`,
    [input.username.trim().toLowerCase(), passwordHash, isActive],
  );
  return mapUser(result.rows[0]);
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User | null> {
  const setClauses: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.username !== undefined) {
    setClauses.push(`username = $${paramIndex++}`);
    values.push(input.username.trim().toLowerCase());
  }
  if (input.password !== undefined) {
    const hash = await bcrypt.hash(input.password, 10);
    setClauses.push(`password_hash = $${paramIndex++}`);
    values.push(hash);
  }
  if (input.isActive !== undefined) {
    setClauses.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
  }

  values.push(id);

  const result = await query<UserRow>(
    `UPDATE public.users SET ${setClauses.join(", ")} WHERE id = $${paramIndex}
     RETURNING id, username, is_active, created_at, updated_at`,
    values,
  );
  if (result.rows.length === 0) return null;
  return mapUser(result.rows[0]);
}

export async function deleteUser(id: number): Promise<boolean> {
  const result = await query(
    "DELETE FROM public.users WHERE id = $1",
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}
