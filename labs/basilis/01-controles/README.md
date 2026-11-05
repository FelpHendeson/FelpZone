# Lab 01 — Controles

**Pergunta:** andar, atacar e esquivar ficam bons no celular e no navegador?

## O que tem

Um campo de grama com pedras, árvores, um lago e três bonecos de treino. Um personagem simples (o círculo dourado) anda, ataca e esquiva. Formas simples de propósito: a arte é o Lab 3.

| Ação | Celular | Teclado | Controle |
| --- | --- | --- | --- |
| Andar | Polegar na metade esquerda da tela (joystick) | WASD ou setas | Analógico esquerdo ou direcional |
| Atacar | Botão **Ataque** (segurar repete) | J ou Espaço | A ou X |
| Esquivar | Botão **Esquiva** | K ou Shift | B ou RB |

- **Mira automática:** o ataque vira sozinho para o boneco mais próximo, a até 2,5 tiles.
- **Esquiva:** um impulso curto na direção do movimento (ou para onde o personagem olha, se parado), com rastro.
- **Ataque:** um golpe em arco à frente; enquanto ataca, o personagem anda mais devagar.
- **Ajustes** (botão no topo): velocidade, aceleração, frenagem, zona morta, raio e tipo do joystick (flutuante ou fixo), resposta linear ou suave, 4/8 direções ou livre, zoom, distância e recarga da esquiva, mira automática, vibração e botões na tela. Tudo vale na hora e fica salvo no aparelho.
- **Depuração:** quadros por segundo, fonte de entrada em uso, intenção do joystick e velocidade.

## Como testar no celular

Com o computador e o celular na mesma rede Wi-Fi, dentro de `labs`:

```bash
npm run dev:rede
```

Abra no celular o endereço "Network" que o Vite mostrar e escolha o lab. Ou use a versão publicada: [felp-labs.vercel.app](https://felp-labs.vercel.app/basilis/01-controles/). A primeira vez pode pedir para liberar o Node.js no firewall do Windows.

## O que observar

1. O personagem responde na hora em que o polegar encosta? Para e anda quando você quer?
2. Joystick flutuante ou fixo?
3. Zona morta: pequena demais faz o personagem andar sozinho; grande demais deixa o controle "duro".
4. Resposta linear ou suave: dá para andar devagar quando quer?
5. Livre, 8 ou 4 direções?
6. Os botões de ataque e esquiva estão no lugar e no tamanho certos para o polegar direito?
7. A mira automática ajuda ou atrapalha?
8. Aceleração e frenagem: o personagem parece pesado, escorregadio ou preciso?
9. Fica fluido (perto de 60 fps) no seu celular?

## Verificado até agora

- Testes automáticos (`npm test`): zona morta e curva do joystick, direções presas, diagonal do teclado, aceleração e frenagem, esquiva e recarga, ataque segurado, mira automática, colisão com pedras, deslizar na parede, esquiva sem atravessar obstáculos e limpeza de ajustes salvos inválidos.
- No navegador do computador, em tamanho de celular (375 × 812) e de desktop: joystick por toque, ataque com mira automática, esquiva com rastro pelo teclado e o painel de ajustes.
- **Ainda não testado num celular de verdade**, nem com controle físico. A vibração só funciona em Android (o iPhone não a oferece no navegador).

## Conclusão

Pendente: preencher depois do teste no celular.
