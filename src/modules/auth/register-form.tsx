"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthActionState } from "./actions";
import styles from "./auth-form.module.css";

const initialState: AuthActionState = { ok: false };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const emailError = state.fieldErrors?.email?.join(" ");
  const passwordError = state.fieldErrors?.password?.join(" ");

  return (
    <section className={styles.panel} aria-labelledby="register-title">
      <Link className={styles.brand} href="/">PGE Study</Link>
      <div className={styles.heading}>
        <h1 id="register-title">Crie sua conta</h1>
        <p>Comece a organizar seu estudo com clareza.</p>
      </div>

      {state.formError && (
        <p className={styles.formError} role="alert">
          {state.formError}
        </p>
      )}

      <form className={styles.form} action={formAction}>
        <div className={styles.field}>
          <label htmlFor="register-email">E-mail</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "register-email-error" : undefined}
          />
          {emailError && (
            <p className={styles.fieldError} id="register-email-error">{emailError}</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="register-password">Senha</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "register-password-help register-password-error" : "register-password-help"}
          />
          <p className={styles.help} id="register-password-help">
            Use de 8 a 128 caracteres.
          </p>
          {passwordError && (
            <p className={styles.fieldError} id="register-password-error">{passwordError}</p>
          )}
        </div>

        <button type="submit" disabled={pending}>
          {pending ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className={styles.switchLink}>
        Já tem uma conta? <Link href="/login">Entrar</Link>
      </p>
    </section>
  );
}
