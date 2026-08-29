# Detalhes Da Sessao De Estudo

## Objetivo

Permitir que o estudante abra, a partir do historico de sessoes, uma pagina somente leitura com os dados de estudo de uma sessao especifica.

## Escopo

- Adicionar o link `Ver detalhes` a cada item da listagem de sessoes.
- Criar a rota protegida `/sessions/[id]`.
- Exibir assunto, data de estudo, total de questoes, acertos, erros e seus percentuais.
- Exibir os links opcionais da lista completa e da lista de erros quando estiverem cadastrados.
- Disponibilizar as acoes `Voltar ao historico` e `Editar sessao`.

Nao fazem parte desta alteracao a exclusao pela pagina de detalhes, mudancas no modelo de dados ou alteracoes no formulario de sessao.

## Arquitetura E Fluxo De Dados

A nova pagina sera um Server Component do App Router em `src/app/(protected)/sessions/[id]/page.tsx`. Ela obtera o usuario autenticado com `requireUserId()`, recebera o identificador pelos parametros da rota e consultara `getSession(userId, id)`.

A consulta existente combina o identificador da sessao com o identificador do usuario. Se nenhum registro for encontrado, inclusive quando pertencer a outro usuario, a pagina chamara `notFound()`. Nenhuma API ou nova operacao de repositorio sera criada.

## Interface

Na listagem, `Ver detalhes` sera o primeiro link do grupo de acoes, antes de `Editar` e `Excluir`, e apontara para `/sessions/<id>`. O link mantera os estilos, foco visivel e area minima de toque ja aplicados as acoes existentes.

A pagina de detalhes seguira a linguagem visual sobria das paginas protegidas. O cabecalho apresentara o titulo `Detalhes da sessao`, uma descricao curta e a acao `Editar sessao`. O conteudo mostrara:

- assunto;
- data de estudo formatada em portugues do Brasil e UTC, como na listagem;
- acertos, com quantidade e percentual;
- erros, com quantidade e percentual;
- total de questoes;
- lista de questoes, quando houver URL;
- lista de erros, quando houver URL.

Os links externos abrirao em nova aba com `noopener noreferrer`. Ao final, `Voltar ao historico` levara a `/sessions`.

## Tratamento De Erros E Seguranca

- A autenticacao continuara sendo exigida pelo layout protegido e por `requireUserId()`.
- Uma sessao ausente ou inacessivel resultara em pagina nao encontrada, sem revelar se o identificador pertence a outro usuario.
- Campos opcionais sem valor nao deixarao rotulos ou espacos vazios na interface.

## Testes

Os testes unitarios verificarao:

- a presenca e o destino de `Ver detalhes` para cada sessao listada;
- a consulta da sessao com o usuario autenticado e o identificador da rota;
- a renderizacao dos dados numericos, percentuais, data e links opcionais;
- os destinos de `Voltar ao historico` e `Editar sessao`;
- a chamada de `notFound()` quando a sessao nao for encontrada.

Depois da implementacao, serao executados os testes unitarios relacionados, lint e verificacao de tipos.
