import { expect, test, type Browser, type Page } from "@playwright/test";

// Contas, fichas, apostas, dominó e praça, como duas pessoas em iPhones.

interface Watched {
  page: Page;
  errors: string[];
}

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

async function signUp(browser: Browser, nickname: string): Promise<Watched> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${nickname}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${nickname}: ${message.text()}`);
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("E-mail").fill(`${nickname.toLowerCase()}.${unique()}@exemplo.com`);
  await page.getByLabel(/Apelido/).fill(nickname);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: /Criar conta e ganhar/ }).click();
  await expect(page.getByText("100 Funcoins").first()).toBeVisible();
  return { page, errors };
}

async function me(page: Page) {
  const response = await page.request.get("/api/conta");
  return ((await response.json()) as { me: { chips: number; inPlay: number; stats: { played: number; wins: number } } }).me;
}

test("conta: cadastro, coleta diária e dominó contra robô valendo Funcoins", async ({ browser }) => {
  const nick = `Ana${unique().slice(-5)}`;
  const { page, errors } = await signUp(browser, nick);

  // Apelido repetido é recusado (outra pessoa tentando o mesmo nome, em maiúsculas).
  const other = await browser.newContext();
  const intruder = await other.newPage();
  await intruder.goto("/");
  await intruder.getByRole("tab", { name: "Criar conta" }).click();
  await intruder.getByLabel("E-mail").fill(`outra.${unique()}@exemplo.com`);
  await intruder.getByLabel(/Apelido/).fill(nick.toUpperCase());
  await intruder.getByLabel("Senha").fill("senha-forte-123");
  await intruder.getByRole("button", { name: /Criar conta e ganhar/ }).click();
  await expect(intruder.locator(".account-form .error")).toContainText("já está em uso");

  await page.getByRole("button", { name: /Coletar 100 Funcoins \(1 de 7\)/ }).click();
  await expect(page.getByText("200 Funcoins").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Coleta de hoje feita · faltam 6/ })).toBeDisabled();

  // O preço da jogada é escolhido ao criar a sala e aparece fixo no lobby.
  await page.getByRole("radio", { name: /Dominó/ }).click();
  await page.getByLabel("Modalidade").selectOption("bloqueio");
  await page.getByLabel("Preço da jogada").selectOption("50");
  await page.getByRole("button", { name: /Jogar com amigos/ }).click();
  await page.waitForURL(/\/sala\/[A-Z0-9]{5}$/);
  await expect(page.locator(".price-tag")).toContainText("50 Funcoins por pessoa");
  await page.getByLabel("Meta").selectOption({ label: "Mão única" });
  await page.getByRole("button", { name: "+ Robô" }).click();
  await expect(page.getByText("Robô Fácil")).toBeVisible();
  await page.getByRole("button", { name: "Começar partida" }).click();
  await expect(page.locator(".domino-felt")).toBeVisible();
  expect(await me(page)).toMatchObject({ chips: 150, inPlay: 50 });

  // Joga até a partida acabar: toca nas pedras que servem.
  const final = page.getByRole("dialog").filter({ hasText: /venceu|venceram/ });
  for (let step = 0; step < 300 && !(await final.count()); step += 1) {
    const playable = page.locator(".hand-tile.playable");
    if (await playable.count()) {
      await playable.first().click({ timeout: 2_000 }).catch(() => undefined);
      const side = page.locator(".side-choice button").first();
      if (await side.count()) await side.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(300);
  }
  await expect(final).toBeVisible();

  const after = await me(page);
  expect(after.inPlay).toBe(0);
  expect(after.stats.played).toBe(1);
  // Saldo = 150 (depois da entrada) + a parte do pote de 100 que coube a ela.
  const code = page.url().split("/").pop()!;
  const { room } = (await (await page.request.get(`/api/rooms/${code}`)).json()) as {
    room: { results: { pot: number; seats: { playerId: string; name: string }[]; payouts: Record<string, number> }[] };
  };
  const result = room.results.at(-1)!;
  expect(result.pot).toBe(100);
  const seat = result.seats.find((item) => item.name === nick)!;
  expect(after.chips).toBe(150 + result.payouts[seat.playerId]);
  expect(errors).toEqual([]);
});

test("grupos: só quem divide um grupo se vê online, conversa, acena e se convida", async ({ browser }) => {
  const anaNick = `Lia${unique().slice(-5)}`;
  const biaNick = `Rui${unique().slice(-5)}`;
  const ana = await signUp(browser, anaNick);
  const bia = await signUp(browser, biaNick);

  // Sem grupo em comum, ninguém aparece.
  await expect(ana.page.getByText("Crie ou entre num grupo")).toBeVisible();

  await ana.page.getByRole("button", { name: "+ Criar um grupo" }).click();
  await ana.page.getByLabel("Nome do grupo").fill("Família");
  await ana.page.getByRole("button", { name: "Criar", exact: true }).click();
  const groupCode = (await ana.page.locator(".group-list code").first().textContent())!.trim();
  expect(groupCode).toMatch(/^[A-Z2-9]{6}$/);

  await bia.page.getByLabel("Código do grupo").fill(groupCode);
  await bia.page.getByRole("button", { name: "Entrar no grupo" }).click();
  await expect(bia.page.getByText("Você entrou no grupo!")).toBeVisible();

  const anaOnline = ana.page.locator(".online-list li", { hasText: biaNick });
  const biaOnline = bia.page.locator(".online-list li", { hasText: anaNick });
  await expect(anaOnline).toBeVisible({ timeout: 25_000 });
  await expect(biaOnline).toBeVisible({ timeout: 25_000 });

  await ana.page.getByLabel("Mensagem para o grupo").fill("Alguém pra um dominó?");
  await ana.page.locator(".plaza-card").getByRole("button", { name: "Enviar" }).click();
  await expect(bia.page.getByText("Alguém pra um dominó?")).toBeVisible({ timeout: 25_000 });

  await biaOnline.getByRole("button", { name: `Acenar para ${anaNick}` }).click();
  await expect(ana.page.getByText("acenou para você")).toBeVisible({ timeout: 25_000 });

  // Ana abre uma sala de dominó, volta ao menu e convida a Bia.
  await ana.page.getByRole("radio", { name: /Dominó/ }).click();
  await ana.page.getByRole("button", { name: /Jogar com amigos/ }).click();
  await ana.page.waitForURL(/\/sala\/[A-Z0-9]{5}$/);
  const code = ana.page.url().split("/").pop()!;
  await ana.page.getByRole("link", { name: /Início/ }).click();
  await ana.page.locator(".online-list li", { hasText: biaNick }).getByRole("button", { name: "Convidar" }).click();
  await expect(ana.page.getByText(`Convite enviado para ${biaNick}`)).toBeVisible();

  const invite = bia.page.locator(".notice-card", { hasText: `sala ${code}` });
  await expect(invite).toBeVisible({ timeout: 25_000 });
  await invite.getByRole("button", { name: "Entrar" }).click();
  await bia.page.waitForURL(new RegExp(code));
  await expect(bia.page.getByText(`Entrar como ${biaNick}`)).toBeVisible();
  await bia.page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(bia.page.locator(".player-list").getByText(biaNick)).toBeVisible();
  expect([...ana.errors, ...bia.errors]).toEqual([]);
});

test("truco contra robô: pedir truco, responder e fechar a mão", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByPlaceholder("Como vão te chamar na mesa").fill("Tina");
  await page.getByRole("radio", { name: /Truco/ }).click();
  await page.getByLabel("Modalidade").selectOption("mineiro");
  await page.getByRole("button", { name: /Jogar contra robôs/ }).click();
  await page.waitForURL(/\/sala\/[A-Z0-9]{5}$/);
  await expect(page.locator(".truco-felt")).toContainText("Manilhas: 4♣ 7♥ A♠ 7♦");

  const handOver = page.getByRole("dialog").filter({ hasText: /Fim da mão|venceu|venceram/ });
  let called = false;
  for (let step = 0; step < 200 && !(await handOver.count()); step += 1) {
    const answer = page.locator(".truco-dialog").getByRole("button", { name: /Aceitar|Jogar \(vale 3\)/ });
    if (await answer.count()) await answer.first().click({ timeout: 2_000 }).catch(() => undefined);
    // Pede truco (ou o valor seguinte, se o robô pediu antes) uma vez.
    const call = page.locator(".domino-hand").getByRole("button", { name: /^(TRUCO|SEIS|NOVE|DOZE)!$/ });
    if (!called && (await call.count())) {
      await call.click({ timeout: 2_000 }).catch(() => undefined);
      called = true;
    }
    const card = page.locator(".hand-card.playable");
    if (await card.count()) await card.first().click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
  await expect(handOver).toBeVisible();
  // Alguém pediu truco (a pessoa ou o robô) e a mesa narrou.
  await expect(page.locator(".log")).toContainText("TRUCO!");
  expect(errors).toEqual([]);
});
