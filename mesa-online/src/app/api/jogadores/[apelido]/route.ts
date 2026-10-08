import { publicProfile } from "@/server/accounts";
import { handle, json } from "@/server/http";

export async function GET(_request: Request, ctx: RouteContext<"/api/jogadores/[apelido]">) {
  return handle(async () => {
    const { apelido } = await ctx.params;
    return json({ profile: await publicProfile(decodeURIComponent(apelido)) });
  });
}
