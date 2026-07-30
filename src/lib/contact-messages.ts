import { existsSync, readFileSync, readdirSync, unlinkSync } from "fs";
import path from "path";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  at: string;
}

const MESSAGES_DIR = path.join(process.cwd(), "data", "messages");

export function listContactMessages(): ContactMessage[] {
  if (!existsSync(MESSAGES_DIR)) return [];

  const files = readdirSync(MESSAGES_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a));

  const messages: ContactMessage[] = [];

  for (const file of files) {
    try {
      const raw = readFileSync(path.join(MESSAGES_DIR, file), "utf-8");
      const parsed = JSON.parse(raw) as Omit<ContactMessage, "id">;
      messages.push({
        id: file.replace(/\.json$/, ""),
        name: parsed.name ?? "",
        email: parsed.email ?? "",
        subject: parsed.subject ?? "",
        message: parsed.message ?? "",
        at: parsed.at ?? "",
      });
    } catch {
      // skip corrupt files
    }
  }

  return messages;
}

export function deleteContactMessage(id: string): boolean {
  const safeId = id.replace(/[^0-9]/g, "");
  if (!safeId) return false;
  const filePath = path.join(MESSAGES_DIR, `${safeId}.json`);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}
