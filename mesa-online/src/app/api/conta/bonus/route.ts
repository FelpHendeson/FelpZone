import { SESSION_COOKIE, claimDailyBonus } from "@/server/accounts";
import { handle, json, readCookie } from "@/server/http";

export async function POST(request: Request) {
  return handle(async () => json({ me: await claimDailyBonus(readCookie(request, SESSION_COOKIE)) }));
}
