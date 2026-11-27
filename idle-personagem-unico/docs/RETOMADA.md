# Retomar o projeto em outro computador

Posição em 27/11/2026: implementação artística publicada no commit `b271466`, na `main` do repositório `FelpHendeson/FelpZone`. O projeto fica no subdiretório `idle-personagem-unico`. [Jogo publicado](https://idle-personagem-unico.vercel.app/).

## Atualizar e executar

Em um checkout existente, na raiz `FelpZone`:

```powershell
git switch main
git pull --ff-only origin main
cd idle-personagem-unico
npm ci
npm run dev
```

Para um computador sem checkout:

```powershell
git clone https://github.com/FelpHendeson/FelpZone.git
cd FelpZone/idle-personagem-unico
npm ci
npm run dev
```

Usar Node.js 22.12+; a entrega foi validada com Node 24. O app local abre em `http://localhost:3000`. O `package-lock.json` está no diretório deste projeto; executar `npm ci` nele instala os workspaces web/motor e o Sharp usado no bake.

O modo “Jogar neste aparelho” funciona sem credenciais de banco. Para desenvolver conta/sincronização local, configurar `apps/web/.env.local` conforme [exemplo versionado](../apps/web/.env.example), com credenciais do ambiente autorizado. Os valores reais, dependências, builds e saves pessoais não são transferidos pelo Git. Para continuar a mesma jornada entre aparelhos no site publicado, usar a conta do jogo; uma jornada local pertence ao navegador em que foi criada.

## O que está no repositório

- Código do jogo, integração das animações, testes e lockfile.
- `apps/web/public/arte/animacoes-fontes/`: oito PNGs fonte.
- `apps/web/public/arte/animacoes-v1/`: oito WebP e metadados dos 16 quadros de cada raça.
- `scripts/preparar-animacoes.mjs`: bake reproduzível. Na raiz do projeto: `node scripts/preparar-animacoes.mjs humano anao elfo orc lobisomem sangue-palido draconato silfo`.
- [Prompts e verificação](ANIMACOES-V1.md), [casos de QA](ANIMACOES-V1-QA.json), [evidência de produção](ANIMACOES-V1-PRODUCAO.json) e [prévia animada](previas/animacoes-v1.gif). Nenhum asset necessário ao jogo depende da pasta temporária ou da pasta pessoal `.codex` desta máquina.

## Verificações da entrega

```powershell
npm run test -w @idle-pu/motor -- --maxWorkers=1 --pool=threads
npm run test -w @idle-pu/web -- --maxWorkers=1
npm run lint
npm run typecheck
npm run build
```

Integração com Redis real: `npm run test:integracao -w @idle-pu/web`, com Redis disponível conforme o helper `apps/web/test-integracao/redisLocal.ts`. A última entrega registrou 361 testes de motor, 81 web e três de integração. O pool padrão de processos excedeu cinco segundos no teste de 20 mil sementes nesta máquina; a suíte inteira passou com threads sem mudar teste ou limite.

## Continuação planejada

Consultar [roadmap](ROADMAP.md) e [decisões](DECISOES.md). Próxima fatia: F13.7, auditoria global em execução, seguida da F13.8 e aceite web antes de F14/mobile. Este pacote não encerra a auditoria global. Evoluções de arte pendentes: ferramentas por profissão, armas/equipamentos visíveis, reações de dano, monstros e pets; o trabalho atual usa gesto comum.
