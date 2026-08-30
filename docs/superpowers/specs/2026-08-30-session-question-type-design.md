# Tipo De Questao Da Sessao

## Objetivo

Permitir que o estudante classifique cada nova sessao pelo tipo de questao estudado e use essa classificacao para consultar o historico e analisar o desempenho no dashboard.

## Escopo

- Adicionar os tipos `Jurisprudencia`, `Lei Seca` e `Doutrina` ao cadastro e a edicao de sessoes.
- Tornar a escolha obrigatoria para novas sessoes e para qualquer sessao que for editada.
- Persistir a classificacao junto aos demais dados da sessao.
- Preservar sessoes existentes com a classificacao legada `Nao informado`.
- Exibir a classificacao no historico e nos detalhes da sessao.
- Permitir que o dashboard filtre os resultados por um tipo de cada vez.

Nao fazem parte desta alteracao categorias personalizadas, selecao de varios tipos ao mesmo tempo ou filtros por tipo no historico de sessoes.

## Modelo De Dados E Migracao

O Prisma recebera o enum `QuestionType`, com os valores internos:

- `JURISPRUDENCE` para `Jurisprudencia`;
- `BLACK_LETTER_LAW` para `Lei Seca`;
- `DOCTRINE` para `Doutrina`;
- `UNSPECIFIED` para `Nao informado`.

`StudySession` recebera o campo obrigatorio `questionType`, mapeado para a coluna `question_type`, sem valor padrao permanente. A migracao criara o enum, preenchera as sessoes existentes com `UNSPECIFIED`, tornara a coluna obrigatoria e removera o padrao usado durante a migracao. A aplicacao nao oferecera `UNSPECIFIED` no cadastro: esse valor existe apenas para representar dados legados cuja classificacao real e desconhecida.

O enum obrigatorio evita valores arbitrarios no banco e mantem a tipagem compartilhada pelo Prisma. A inclusao de novas categorias no futuro exigira uma migracao explicita, o que e adequado para o conjunto fixo definido neste escopo.

## Cadastro E Edicao

O formulario de sessao apresentara um grupo obrigatorio chamado `Tipo de questao`, com as opcoes `Jurisprudencia`, `Lei Seca` e `Doutrina`. As opcoes serao controles de escolha unica, com rotulo programatico, navegacao por teclado, foco visivel e mensagem de validacao associada ao grupo.

O estado controlado do formulario e os valores devolvidos depois de uma falha da Server Action incluirao `questionType`, evitando que a selecao seja perdida. O schema Zod aceitara somente os tres valores disponiveis no formulario e retornara `Selecione o tipo de questao.` quando nenhum valor valido for enviado.

Na edicao, uma sessao ja classificada carregara sua opcao atual. Uma sessao legada com `UNSPECIFIED` nao tera opcao preselecionada e exigira que o usuario escolha uma das tres categorias antes de salvar. Criacao e atualizacao continuarao passando pelo repositorio existente, que persistira o novo campo como parte de `StudySessionInput`.

## Historico E Detalhes

Cada item do historico mostrara o rotulo localizado do tipo junto aos metadados da sessao. A pagina de detalhes tambem exibira o tipo proximo ao assunto e a data. Registros legados mostrarao `Nao informado` nas duas telas.

Um unico mapeamento de valores internos para rotulos em portugues sera reutilizado pelo formulario, historico, detalhes e dashboard, evitando divergencias de nomenclatura.

## Filtro Do Dashboard

O dashboard recebera o parametro de URL `questionType`. Os valores publicos serao `all`, `jurisprudence`, `black-letter-law`, `doctrine` e `unspecified`. Valor ausente ou desconhecido sera interpretado como `all`.

A interface apresentara um segundo grupo de filtros de escolha unica com os rotulos `Todos`, `Jurisprudencia`, `Lei Seca`, `Doutrina` e `Nao informado`. Ao trocar o tipo, os parametros `period` e `today` serao preservados. Ao trocar o periodo, `questionType` tambem sera preservado. O filtro ativo sera indicado por texto e `aria-current`, sem depender apenas de cor.

`getDashboard` recebera o tipo validado alem do usuario, periodo e data de referencia. A CTE `filtered` aplicara a categoria junto aos filtros existentes de usuario e data. Assim, resumo geral, percentuais e agrupamento por assunto sempre serao calculados a partir do mesmo conjunto filtrado. A opcao `all` nao adicionara condicao de categoria; as demais usarao o valor correspondente do enum, incluindo `UNSPECIFIED` para sessoes antigas.

Quando o filtro escolhido nao encontrar questoes, o dashboard reutilizara o estado vazio e os percentuais indisponiveis existentes.

## Tratamento De Erros E Seguranca

- A validacao no servidor impedira valores ausentes, legados ou desconhecidos no cadastro e na edicao.
- O banco restringira a coluna aos valores do enum e nao permitira `NULL`.
- O filtro sera aplicado dentro da consulta que ja restringe os dados pelo usuario autenticado.
- Parametros invalidos de URL nao causarao erro nem serao enviados diretamente ao SQL; serao normalizados para `all`.
- Falhas de persistencia continuarao usando a mensagem generica atual sem expor detalhes do banco.

## Testes

Os testes unitarios cobrirao:

- aceitacao dos tres tipos validos e rejeicao de valor ausente, `UNSPECIFIED` ou desconhecido pelo schema;
- renderizacao e obrigatoriedade do grupo no formulario;
- preservacao da escolha depois de uma falha de validacao;
- carregamento do tipo na edicao e ausencia de preselecionamento para sessoes legadas;
- rotulos corretos no historico e nos detalhes;
- interpretacao dos parametros validos e invalidos do dashboard;
- preservacao do periodo, data e tipo nos links dos filtros;
- envio do filtro validado para a consulta.

Os testes de integracao cobrirao:

- persistencia do tipo na criacao e atualizacao;
- migracao conceitualmente representada por registros `UNSPECIFIED` e sua leitura como `Nao informado`;
- agregacao exclusiva da categoria selecionada;
- inclusao de todas as categorias quando o filtro for `all`;
- isolamento por usuario e compatibilidade do filtro de categoria com os filtros de periodo e data.

Depois da implementacao, serao executados os testes unitarios e de integracao relacionados, lint, verificacao de tipos e build de producao.
