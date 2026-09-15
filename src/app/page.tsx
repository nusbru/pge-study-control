import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-user";
import styles from "./home.module.css";

const exampleSubjects = [
  { name: "Direito Constitucional", correct: 24, wrong: 6, percentage: 80 },
  { name: "Direito Administrativo", correct: 18, wrong: 12, percentage: 60 },
  { name: "Direito Tributário", correct: 21, wrong: 9, percentage: 70 },
];

const features = [
  {
    title: "Sessões de estudo",
    description: "Registre a data, o assunto e suas questões, com acertos e erros. Organize os estudos por jurisprudência, lei seca ou doutrina.",
  },
  {
    title: "Desempenho por assunto",
    description: "Veja percentuais acompanhados de números concretos. Filtre por período e tipo de questão para entender quais assuntos merecem mais atenção.",
  },
  {
    title: "Simulados com cronômetro",
    description: "Acompanhe o tempo de prova ou registre um simulado que já realizou. Adicione a correção depois e consulte seu aproveitamento e evolução.",
  },
  {
    title: "Histórico e revisão",
    description: "Consulte e edite seus registros. Guarde os links das listas de questões e das questões erradas para voltar ao que precisa revisar.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#conteudo">Pular para o conteúdo</a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="PGE Study — página inicial">PGE Study<span aria-hidden="true">.</span></Link>
        <nav className={styles.navigation} aria-label="Acesso à plataforma">
          <a className={styles.featuresLink} href="#recursos">Conhecer recursos</a>
          <Link className={styles.textLink} href="/login">Entrar</Link>
          <Link className={`primaryLink ${styles.primaryAction}`} href="/register">Criar conta</Link>
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="apresentacao">
          <div className={styles.heroCopy}>
            <p className={styles.audience}>Sua preparação para concursos da PGE</p>
            <h1 id="apresentacao">Transforme suas questões em direção de estudo.</h1>
            <p className={styles.introduction}>Com o PGE Study, cada sessão ajuda a entender seu desempenho. Reúna seus resultados, encontre os assuntos que precisam de atenção e escolha o próximo foco com mais clareza.</p>
            <div className={styles.actions}>
              <Link className={`primaryLink ${styles.primaryAction}`} href="/register">Criar conta <span aria-hidden="true">↗</span></Link>
              <Link className={styles.textLink} href="/login">Já tenho conta. Entrar</Link>
            </div>
            <p className={styles.heroNote}>Sessões, simulados e resultados em um só lugar.</p>
          </div>

          <figure className={styles.preview}>
            <figcaption className={styles.previewCaption}>
              <span>Um olhar sobre seus estudos</span>
              <span className={styles.exampleLabel}>Dados ilustrativos</span>
            </figcaption>
            <div className={styles.previewHeading}>
              <strong>Desempenho por assunto</strong>
              <span>Últimos 30 dias</span>
            </div>
            <ul className={styles.subjects}>
              {exampleSubjects.map((subject) => (
                <li key={subject.name}>
                  <div className={styles.subjectHeading}><strong>{subject.name}</strong><span>{subject.percentage}% de acertos</span></div>
                  <div className={styles.performanceBar} aria-hidden="true">
                    <span style={{ width: `${subject.percentage}%` }} />
                  </div>
                  <p>{subject.correct} acertos · {subject.wrong} erros · 30 questões</p>
                </li>
              ))}
            </ul>
            <p className={styles.previewNote}>O resultado de hoje ajuda a orientar a revisão de amanhã.</p>
          </figure>
        </section>

        <section className={styles.features} id="recursos" aria-labelledby="recursos-titulo">
          <div className={styles.sectionIntro}>
            <h2 id="recursos-titulo">Do registro à próxima revisão.</h2>
            <p>Você resolve as questões. A plataforma organiza os resultados para que cada etapa da preparação tenha um ponto de partida.</p>
          </div>
          <dl className={styles.featureList}>
            {features.map((feature) => (
              <div key={feature.title}>
                <dt>{feature.title}</dt>
                <dd>{feature.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.howItWorks} aria-labelledby="como-funciona">
          <h2 id="como-funciona">Uma rotina simples de acompanhar.</h2>
          <ol className={styles.steps}>
            <li><h3>Crie sua conta</h3><p>Tenha um espaço pessoal para reunir seus registros de estudo.</p></li>
            <li><h3>Registre sua prática</h3><p>Adicione os resultados de uma sessão ou acompanhe um simulado com cronômetro.</p></li>
            <li><h3>Escolha o próximo foco</h3><p>Consulte o desempenho e volte aos assuntos que merecem uma nova revisão.</p></li>
          </ol>
        </section>

        <section className={styles.invitation} aria-labelledby="comece">
          <div><h2 id="comece">Seu próximo estudo pode começar com mais clareza.</h2><p>Reúna seus resultados e dê direção à sua preparação.</p></div>
          <div className={styles.invitationActions}>
            <Link className={styles.lightAction} href="/register">Criar conta <span aria-hidden="true">↗</span></Link>
            <Link className={styles.textLink} href="/login">Já tem conta? Entrar</Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}><span>PGE Study</span><p>Controle de estudos para concursos da PGE.</p></footer>
    </div>
  );
}
