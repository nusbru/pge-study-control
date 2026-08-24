---
name: PGE Study
description: Um caderno de estrategia editorial para transformar questoes em direcao de estudo.
colors:
  paper-neutral: "#f7f7f4"
  surface-white: "#ffffff"
  legal-ink: "#25283a"
  muted-ink: "#747680"
  structural-line: "#e6e6df"
  action-coral: "#e95d3f"
  precision-blue: "#4a568c"
  success-ink: "#2f664b"
  success-surface: "#f1f8f4"
  error-ink: "#9b2f24"
  error-surface: "#fff5f3"
typography:
  display:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  control: "0.625rem"
  panel: "1rem"
spacing:
  xs: "0.45rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.legal-ink}"
    textColor: "{colors.surface-white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.7rem 1rem"
    height: "2.875rem"
  button-primary-hover:
    backgroundColor: "{colors.precision-blue}"
    textColor: "{colors.surface-white}"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.legal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.7rem 0.8rem"
    height: "2.875rem"
  panel:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.legal-ink}"
    rounded: "{rounded.panel}"
    padding: "2rem"
---

# Design System: PGE Study

## 1. Overview

**Creative North Star: "Caderno de Estratégia"**

O sistema deve parecer uma ferramenta pessoal de raciocínio: organizada como um caderno bem editado, precisa como uma planilha confiável e calma como uma rotina de estudo sustentável. A hierarquia editorial existe para orientar a leitura, enquanto controles familiares desaparecem durante a tarefa.

A interface é sóbria, clara e encorajadora. Ela rejeita a aparência de SaaS genérico, a gamificação infantil, o jurídico antiquado e dashboards carregados. A autoridade vem de números verificáveis, espaçamento disciplinado e linguagem direta.

**Key Characteristics:**

- Informação antes de ornamentação.
- Percentuais sempre acompanhados por contagens concretas.
- Coral raro para ação e erro; azul para precisão e acerto.
- Estrutura responsiva sem remover capacidades no celular.
- Movimento curto, funcional e dispensável sob movimento reduzido.

## 2. Colors

A paleta combina neutros quase acromáticos com dois sinais funcionais: Coral de Ação e Azul de Precisão.

### Primary

- **Coral de Ação:** reservado a ações principais, estados de erro e ênfase que exige resposta.

### Secondary

- **Azul de Precisão:** representa acertos, comparações e estados estruturais de confiança.

### Neutral

- **Papel Neutro:** fundo contínuo da aplicação, sem aparência de pergaminho ou bege decorativo.
- **Superfície Branca:** painéis e campos que precisam se separar do fundo.
- **Tinta Jurídica:** texto principal, botões de alta prioridade e navegação ativa.
- **Tinta Atenuada:** ajuda, metadados e texto secundário que ainda exige contraste legível.
- **Linha Estrutural:** divisores e contornos discretos.

**The Two Signals Rule.** Coral significa agir ou corrigir; azul significa compreender ou acertar. Nunca trocar esses papéis para decorar uma tela.

**The Quiet Canvas Rule.** Neutros ocupam a maior parte da superfície. Cores saturadas não podem competir com os dados.

## 3. Typography

**Display Font:** Georgia, com Times New Roman como fallback.

**Body Font:** Inter, com system-ui como fallback.

**Character:** títulos editoriais dão identidade às páginas; textos, dados, rótulos e controles usam uma sans familiar para leitura rápida. A combinação é contrastante sem parecer uma publicação decorativa.

### Hierarchy

- **Display:** peso forte e linha compacta, usado apenas no título principal da página.
- **Headline:** serif para títulos de seção curtos e hierarquia de estados vazios.
- **Title:** sans em peso forte para assuntos, painéis e itens de histórico.
- **Body:** sans regular, com conteúdo explicativo limitado a 70 caracteres por linha.
- **Label:** sans forte sem caixa alta obrigatória nem espaçamento exagerado.

**The Data Is Sans Rule.** Números, percentuais, campos, botões e rótulos nunca usam a fonte editorial.

## 4. Elevation

Profundidade nasce primeiro de camadas tonais e linhas estruturais. Sombras são ambientes e raras: aparecem somente em painéis elevados, diálogos ou estados que realmente se sobrepõem ao fluxo. No celular, superfícies principais podem perder a sombra e manter separação por fundo e borda.

### Shadow Vocabulary

- **Painel ambiente:** sombra ampla e pouco opaca para autenticação ou superfícies elevadas isoladas.
- **Estado elevado:** sombra mais curta apenas durante sobreposição ou interação, nunca como decoração de todos os blocos.

**The Tonal-First Rule.** Se fundo, linha e espaçamento já explicam a hierarquia, sombra é proibida.

## 5. Components

Componentes são refinados e contidos: familiares no uso, precisos nos estados e consistentes entre telas.

### Buttons

- **Shape:** cantos suavemente arredondados pelo token `control`.
- **Primary:** Tinta Jurídica sobre Superfície Branca, altura confortável e rótulo sans forte.
- **Hover / Focus:** hover migra para Azul de Precisão; foco usa contorno coral visível e externo.
- **Disabled / Loading:** preserva dimensões, reduz ênfase e troca o texto por uma ação em andamento.

### Chips

- **Style:** filtros temporais são compactos, com fundo neutro e texto legível.
- **State:** selecionado usa Tinta Jurídica com texto branco; não selecionado permanece tonal e não compete com resultados.

### Cards / Containers

- **Corner Style:** painéis principais usam o token `panel`; blocos internos usam `control`.
- **Background:** Superfície Branca sobre Papel Neutro.
- **Shadow Strategy:** seguir estritamente a regra Tonal-First.
- **Border:** Linha Estrutural em um pixel quando a separação tonal não basta.
- **Internal Padding:** maior em desktop, reduzido sem perda de toque no celular.

### Inputs / Fields

- **Style:** campo branco, borda neutra, rótulo acima e ajuda abaixo.
- **Focus:** contorno coral de três pixels com offset; nunca depender apenas da mudança de cor da borda.
- **Error / Disabled:** erro usa texto e borda Error Ink, associado por `aria-describedby`; desabilitado mantém leitura e reduz contraste de ação.

### Navigation

- Navegação superior direta, com marca, Dashboard, Sessões e ação de saída. O estado ativo é estrutural, não decorativo. Em telas pequenas, os mesmos destinos permanecem acessíveis sem uma barra horizontal comprimida.

### Performance Bar

- Uma única barra horizontal combina Azul de Precisão para acertos e Coral de Ação para erros. Contagens e percentuais permanecem em texto; a cor nunca é a única fonte de significado.

## 6. Do's and Don'ts

### Do:

- **Do** manter percentuais próximos de acertos, erros e total que os originaram.
- **Do** usar Coral de Ação com parcimônia para ação principal, foco e erro.
- **Do** usar Azul de Precisão para acertos e comparação de desempenho.
- **Do** preservar foco visível, rótulos programáticos e significado independente de cor.
- **Do** empilhar conteúdo no celular mantendo ações e números essenciais.
- **Do** usar transições entre 150 e 250 ms apenas para comunicar estado e removê-las sob `prefers-reduced-motion`.

### Don't:

- **Don't** produzir um **SaaS genérico** com gradientes, glassmorphism, hero metrics ou grades repetitivas de cards.
- **Don't** introduzir **gamificação infantil** com troféus, confetes, mascotes ou recompensas excessivas.
- **Don't** imitar um **jurídico antiquado** com brasões decorativos, pergaminho, dourado ou formalidade pesada.
- **Don't** criar um **dashboard carregado** com gráficos redundantes, muitas cores ou informação sem hierarquia.
- **Don't** usar faixas coloridas laterais em cards, texto em gradiente ou cor como único indicador.
- **Don't** aplicar serif em dados, rótulos, campos ou botões.
