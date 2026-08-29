import { LoginForm } from "@/modules/auth/login-form";
import styles from "@/modules/auth/auth-form.module.css";

type LoginPageProps = {
  searchParams: Promise<{ registered?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered } = await searchParams;

  return (
    <main className={styles.page}>
      <LoginForm registered={registered === "1"} />
    </main>
  );
}
