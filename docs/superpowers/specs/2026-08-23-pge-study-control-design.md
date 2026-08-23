# Plataforma de Controle de Estudos para PGE

## Objetivo

Criar uma plataforma web para estudantes de concursos da Procuradoria-Geral do Estado registrarem manualmente sessoes de estudo e acompanharem o desempenho em questoes por assunto.

O MVP deve permitir que cada estudante:

- crie uma conta com e-mail e senha;
- registre, consulte, edite e exclua apenas as proprias sessoes;
- informe qualquer combinacao valida de dois entre total, acertos e erros;
- tenha o terceiro valor calculado automaticamente;
- consulte numeros concretos e percentuais gerais e por assunto;
- filtre o dashboard por periodos rapidos;
- acesse os links externos da lista completa e das questoes erradas.

## Escopo Do MVP

### Incluido

- Cadastro por e-mail e senha.
- Login e logout.
- Dashboard individual por estudante.
- Cadastro, edicao, listagem e exclusao de sessoes de estudo.
- Assunto em texto livre, com normalizacao para agrupamento.
- Calculo automatico entre total, acertos e erros.
- Percentuais de acertos e erros.
- Links externos opcionais.
- Filtros de 7, 30 e 90 dias e de todo o historico.
- Interface responsiva para desktop e celular.
- Implantacao com Docker em servidor proprio.

### Fora Do Escopo

- Recuperacao de senha.
- Confirmacao de e-mail.
- Login social.
- Administracao de usuarios.
- Lista fixa ou cadastro separado de assuntos.
- Importacao automatica de plataformas de questoes.
- Aplicativo movel nativo.
- Compartilhamento de resultados entre usuarios.

## Arquitetura

A aplicacao sera um monolito modular em Next.js com App Router. Interface, autenticacao, regras de negocio e acesso aos dados serao implantados como uma unica aplicacao.

Componentes principais:

- **Next.js:** paginas, componentes, operacoes no servidor e protecao de rotas.
- **Auth.js:** autenticacao por credenciais e manutencao da sessao do usuario.
- **Prisma:** schema, migrations e acesso tipado ao banco.
- **PostgreSQL:** persistencia de usuarios e sessoes de estudo.
- **Docker Compose:** execucao da aplicacao e do PostgreSQL no servidor proprio.

Limites internos:

- `auth`: cadastro, hash e verificacao de senha, login, logout e sessao autenticada.
- `study-sessions`: validacao, calculos, criacao, leitura, edicao e exclusao.
- `dashboard`: filtros temporais, agregacoes e percentuais.
- `shared`: componentes visuais, schemas comuns e infraestrutura transversal.

Esses limites sao internos ao monolito. Nao sera criada uma API ou um servico separado sem uma necessidade concreta.

## Modelo De Dados

### User

- `id`: identificador unico.
- `email`: e-mail valido, normalizado, unico e limitado a 254 caracteres.
- `passwordHash`: hash seguro da senha.
- `createdAt`: data e hora de criacao.
- `updatedAt`: data e hora da ultima alteracao.

A senha deve possuir entre 8 e 128 caracteres. O limite evita entradas abusivas sem impor regras de composicao que incentivem senhas previsiveis.

### StudySession

- `id`: identificador unico.
- `userId`: proprietario da sessao.
- `studyDate`: data civil do estudo, sem componente de horario.
- `subject`: texto limpo preservado para exibicao.
- `subjectKey`: texto normalizado usado para agrupamento.
- `totalQuestions`: total de questoes.
- `correctAnswers`: quantidade de acertos.
- `wrongAnswers`: quantidade de erros.
- `questionListUrl`: link opcional da lista completa.
- `wrongQuestionListUrl`: link opcional das questoes erradas.
- `createdAt`: data e hora de criacao.
- `updatedAt`: data e hora da ultima alteracao.

Cada consulta ou alteracao de `StudySession` deve combinar o identificador do registro com o identificador do usuario autenticado.

O assunto e obrigatorio depois da limpeza e aceita no maximo 120 caracteres. Cada URL aceita no maximo 2.048 caracteres.

## Normalizacao De Assuntos

O estudante informara o assunto como texto livre. Ao salvar:

1. Remover espacos no inicio e no fim.
2. Substituir sequencias de espacos internos por um unico espaco.
3. Preservar o resultado em `subject`.
4. Converter esse resultado para minusculas em `subjectKey`.

Assim, ` Direito   Civil ` e `direito civil` pertencem ao mesmo grupo. Diferencas de acentuacao continuam formando grupos distintos.

Quando um grupo tiver grafias diferentes, o dashboard exibira a grafia da sessao mais recente dentro do periodo selecionado.

## Regras Numericas

O formulario possui `totalQuestions`, `correctAnswers` e `wrongAnswers`.

- Pelo menos dois campos devem ser preenchidos.
- Todos os valores devem ser inteiros nao negativos.
- O total deve ser maior que zero.
- Cada quantidade deve ser menor ou igual a 1.000.000 por sessao.
- A relacao `totalQuestions = correctAnswers + wrongAnswers` deve sempre ser verdadeira.

Calculos:

- Total e acertos informados: `wrongAnswers = totalQuestions - correctAnswers`.
- Acertos e erros informados: `totalQuestions = correctAnswers + wrongAnswers`.
- Total e erros informados: `correctAnswers = totalQuestions - wrongAnswers`.

O calculo automatico ocorre quando exatamente dois campos possuem valores. O terceiro campo e preenchido e marcado visualmente como calculado. Se os tres campos forem informados ou alterados, nenhum valor sera silenciosamente sobrescrito; uma combinacao inconsistente bloqueia o envio. Para trocar a combinacao usada como base, o estudante pode limpar um campo e informar os outros dois.

Exemplos aceitos:

- Total 50 e acertos 30 resultam em 20 erros.
- Acertos 30 e erros 20 resultam em total 50.
- Total 50 e erros 20 resultam em 30 acertos.

Exemplos rejeitados:

- Total igual a zero.
- Valores negativos ou decimais.
- Total 50, acertos 30 e erros 30.
- Total menor que acertos ou menor que erros.

Os tres valores resolvidos sao persistidos. Percentuais nao sao persistidos e serao calculados sob demanda:

- `% de acertos = correctAnswers / totalQuestions * 100`.
- `% de erros = wrongAnswers / totalQuestions * 100`.

A interface exibira os percentuais com uma casa decimal.

## URLs Externas

Os dois links sao opcionais. Quando preenchidos, devem ser URLs absolutas com protocolo HTTP ou HTTPS.

Na exibicao:

- os links abrem em nova aba;
- a nova aba nao recebe acesso ao contexto da pagina de origem;
- o conteudo externo nunca e carregado ou executado dentro da aplicacao.

## Telas E Navegacao

### Cadastro

- Campos de e-mail e senha.
- Validacao junto aos campos.
- Link para login de quem ja possui conta.

### Login

- Campos de e-mail e senha.
- Mensagem generica para credenciais invalidas.
- Link para cadastro.
- Sem recuperacao de senha no MVP.

### Dashboard

E a primeira tela apos o login. Deve conter:

- acao destacada para registrar uma sessao;
- filtros de `7 dias`, `30 dias`, `90 dias` e `Todo o periodo`;
- filtro inicial de 30 dias;
- indicadores gerais de total de questoes, acertos, erros e percentual de acertos;
- uma barra proporcional por assunto;
- totais concretos e percentuais de acertos e erros em cada assunto.

Os periodos incluem o dia atual. Por exemplo, `7 dias` significa hoje e os seis dias anteriores. O filtro considera `studyDate`, nao a data de criacao do registro.

### Historico

- Sessoes ordenadas por `studyDate` decrescente e, em caso de empate, por criacao decrescente.
- Paginacao no servidor com 20 sessoes por pagina.
- Data, assunto, quantidades e percentuais.
- Links externos quando existirem.
- Acoes para editar e excluir.
- Confirmacao antes da exclusao.

### Criacao E Edicao

- Data iniciada com o dia atual na criacao e editavel.
- Assunto em texto livre.
- Campos para total, acertos e erros.
- Indicacao do valor calculado automaticamente.
- Links externos opcionais.
- Erros exibidos junto aos campos.
- Valores preservados quando uma tentativa de gravacao falhar.

## Dashboard E Agregacao

O dashboard deve:

1. Filtrar sessoes pelo `userId` autenticado.
2. Filtrar por `studyDate` conforme o periodo escolhido.
3. Agrupar por `subjectKey`.
4. Somar total, acertos e erros antes de calcular percentuais.
5. Ordenar assuntos pelo total de questoes, do maior para o menor.

O percentual consolidado e ponderado pelo numero de questoes, nao a media simples dos percentuais das sessoes.

Exemplo: uma sessao com 8 acertos em 10 e outra com 1 acerto em 2 produzem 9 acertos em 12, ou 75%, e nao a media simples de 80% e 50%.

Sem dados no periodo, a tela mostra um estado vazio e nao tenta calcular percentuais.

## Direcao Visual

A interface seguira a direcao **Editorial juridico** escolhida durante o design:

- base clara e neutra;
- coral como cor de destaque e de erros;
- azul profundo para acertos e elementos estruturais;
- titulos com caracter editorial e dados com tipografia de alta legibilidade;
- composicao arejada, profissional e contemporanea;
- barras proporcionais como visualizacao principal do desempenho por assunto.

No desktop, os dados aproveitam a largura para comparacao. No celular, indicadores, barras e acoes ficam empilhados sem remover recursos essenciais.

## Fluxo De Dados

1. A interface valida os campos e calcula o terceiro valor quando aplicavel.
2. A operacao no servidor recebe os tres valores resolvidos.
3. O servidor repete todas as normalizacoes e validacoes.
4. O servidor obtem `userId` exclusivamente da sessao autenticada.
5. O Prisma cria, altera ou exclui o registro no PostgreSQL.
6. Dashboard e historico sao revalidados apos a operacao.

O cliente nunca e a autoridade final para calculos, validacao ou propriedade do registro.

## Seguranca

- Senhas sao armazenadas somente como hashes seguros.
- E-mails sao normalizados antes da verificacao de unicidade.
- Cookies de autenticacao usam `HttpOnly`, `SameSite` e `Secure` em producao.
- Paginas e operacoes privadas exigem sessao autenticada.
- O cliente nao envia nem escolhe o `userId` de uma operacao.
- Leituras e mutacoes de sessoes sempre incluem `userId` nos filtros.
- Um registro de outro usuario e tratado como inexistente.
- Segredos sao fornecidos por variaveis de ambiente e nao entram na imagem ou no repositorio.
- A aplicacao e publicada atras de HTTPS por um proxy reverso.
- O segredo usado para assinar sessoes deve ser longo, aleatorio e exclusivo do ambiente.
- O proxy reverso deve limitar requisicoes repetidas aos endpoints de cadastro e login.

## Tratamento De Erros

- Erros de validacao aparecem junto aos campos relacionados.
- Credenciais invalidas usam mensagem generica.
- E-mail duplicado e informado sem revelar outros dados da conta.
- Falhas inesperadas mostram mensagem segura ao usuario e detalhes apenas nos logs do servidor.
- Falhas de gravacao preservam os dados preenchidos.
- Exclusoes exigem confirmacao e so atualizam a interface depois de sucesso no servidor.
- Estados de carregamento impedem envios duplicados.

## Implantacao

O Docker Compose inclui:

- aplicacao Next.js;
- PostgreSQL;
- volume persistente para os dados;
- health checks da aplicacao e do banco;
- rede interna entre os servicos;
- configuracao por variaveis de ambiente.

As migrations Prisma serao executadas de forma controlada durante a implantacao, antes da nova versao receber trafego. O proxy reverso HTTPS permanece externo ao Compose para permitir Nginx, Caddy ou infraestrutura equivalente.

A documentacao operacional deve explicar:

- configuracao inicial;
- variaveis obrigatorias;
- execucao de migrations;
- backup e restauracao do PostgreSQL;
- atualizacao dos containers;
- verificacao dos health checks.

## Estrategia De Testes

### Testes Unitarios

- Todas as combinacoes de calculo entre total, acertos e erros.
- Rejeicao de valores negativos, decimais, total zero e inconsistencias.
- Calculo e formatacao de percentuais.
- Normalizacao de assuntos.
- Limites dos filtros de periodo.

### Testes De Integracao

- Cadastro com e-mail unico e senha protegida.
- Autenticacao valida e invalida.
- Criacao, leitura, edicao e exclusao de sessoes.
- Isolamento entre usuarios.
- Agregacao ponderada por assunto e periodo no PostgreSQL.
- Atualizacao dos resultados apos edicao ou exclusao.

### Testes Ponta A Ponta

- Cadastro, login e logout.
- Criacao usando cada uma das tres combinacoes numericas.
- Bloqueio de combinacao inconsistente.
- Exibicao da nova sessao no historico e no dashboard.
- Edicao e exclusao com atualizacao dos totais.
- Uso em larguras representativas de desktop e celular.

## Criterios De Aceitacao

O MVP estara concluido quando:

1. Um estudante puder se cadastrar, entrar e sair.
2. Rotas privadas nao forem acessiveis sem autenticacao.
3. Cada estudante puder consultar e alterar somente os proprios dados.
4. Uma sessao puder ser criada com quaisquer dois valores numericos validos.
5. O terceiro valor for calculado corretamente e validado novamente no servidor.
6. Combinacoes inconsistentes forem bloqueadas sem perder o formulario.
7. Historico mostrar quantidades, percentuais e links informados.
8. Edicao e exclusao atualizarem historico e dashboard.
9. Dashboard consolidar questoes por assunto normalizado e usar percentual ponderado.
10. Filtros de 7, 30 e 90 dias e todo o periodo produzirem resultados corretos.
11. A interface mantiver todos os recursos essenciais em desktop e celular.
12. A aplicacao e o PostgreSQL puderem ser executados pelo Docker Compose documentado.
13. Testes automatizados cobrirem regras numericas, isolamento e fluxos principais.
