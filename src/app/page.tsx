import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <p>Controle de estudos para concursos da PGE</p>
      <h1>PGE Study</h1>
      <p>Registre questões, acompanhe acertos e transforme erros em direção de estudo.</p>
      <nav aria-label="Acesso à plataforma">
        <Link href="/login">Entrar</Link>
        <Link href="/register">Criar conta</Link>
      </nav>
    </main>
  );
}
