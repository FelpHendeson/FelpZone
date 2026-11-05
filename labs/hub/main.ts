import './style.css';
import { SECTIONS } from './catalog.ts';

const list = document.getElementById('secoes')!;

for (const section of SECTIONS) {
  const block = document.createElement('section');
  block.id = section.id;

  const title = document.createElement('h2');
  title.textContent = section.title;
  const description = document.createElement('p');
  description.className = 'descricao';
  description.textContent = section.description;
  block.append(title, description);

  if (section.labs.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'vazio';
    empty.textContent = 'Nenhum lab ainda.';
    block.append(empty);
  }

  for (const lab of section.labs) {
    const card = document.createElement('a');
    card.className = 'cartao';
    card.href = lab.path;
    const header = document.createElement('span');
    header.className = 'cabecalho';
    const name = document.createElement('strong');
    name.textContent = lab.title;
    const status = document.createElement('span');
    status.className = `estado estado-${lab.status === 'Em teste' ? 'teste' : lab.status === 'Concluído' ? 'concluido' : 'descartado'}`;
    status.textContent = lab.status;
    header.append(name, status);
    const question = document.createElement('span');
    question.className = 'pergunta';
    question.textContent = lab.question;
    card.append(header, question);
    block.append(card);
  }

  list.append(block);
}
