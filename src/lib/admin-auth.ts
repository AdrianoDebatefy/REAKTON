import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.ADMIN_SECRET || "reakton-dev-secret-change-in-production"
);

export async function isAdmin(): Promise<boolean> {
  const token = cookies().get("reakton_admin")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
