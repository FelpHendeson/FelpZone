import { asObject, handle, json, readJson } from "@/server/http";
import { createRoomFor } from "@/server/rooms";

export async function POST(request: Request) {
  return handle(async () => {
    const body = asObject(await readJson(request));
    const { room, playerId, token } = await createRoomFor({ name: body.name, gameId: body.gameId });
    return json({ room, playerId, token }, 201);
  });
}
