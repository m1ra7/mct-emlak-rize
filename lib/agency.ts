import { sql } from "drizzle-orm";
import { listings, user } from "@/db/schema";
export function isAgencyOwner(account: {
  email: string;
  role: string;
  active: boolean;
}) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return (
    !!email &&
    account.active &&
    account.role === "admin" &&
    account.email.trim().toLowerCase() === email
  );
}
export function agencyListingsScope() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return sql`false`;
  return sql`${listings.userId} in (select ${user.id} from ${user} where lower(${user.email})=${email} and ${user.role}='admin' and ${user.active}=true)`;
}
