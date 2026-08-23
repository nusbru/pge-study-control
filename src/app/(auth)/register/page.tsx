import { RegisterForm } from "@/modules/auth/register-form";
import styles from "@/modules/auth/auth-form.module.css";

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <RegisterForm />
    </main>
  );
}
