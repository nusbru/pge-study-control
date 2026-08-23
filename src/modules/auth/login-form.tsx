"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthActionState } from "./actions";
import styles from "./auth-form.module.css";

const initialState: AuthActionState = { ok: false };

export function LoginForm({ registered = false }: Readonly<{ registered?: boolean }>) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const emailError = state.fieldErrors?.email?.join(" ");
  const passwordError = state.fieldErrors?.password?.join(" ");

  return (
    <section className={styles.panel} aria-labelledby="login-title">
      <Link className={styles.brand} href="/">PGE Study</Link>
      <div className={styles.heading}>
        <h1 id="login-title">Entre na sua conta</h1>
        <p>Continue de onde parou nos seus estudos.</p>
      </div>

      {registered && (
        <p className={styles.success} role="status">
          Conta criada. Entre para continuar.
        </p>
      )}
      {state.formError && (
        <p className={styles.formError} role="alert">
          {state.formError}
        </p>
      )}

      <form className={styles.form} action={formAction}>
        <div className={styles.field}>
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "login-email-error" : undefined}
          />
          {emailError && <p className={styles.fieldError} id="login-email-error">{emailError}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "login-password-error" : undefined}
          />
          {passwordError && (
            <p className={styles.fieldError} id="login-password-error">{passwordError}</p>
          )}
        </div>

        <button type="submit" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className={styles.switchLink}>
        Ainda não tem conta? <Link href="/register">Criar conta</Link>
      </p>
    </section>
  );
}
