-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "study_date" DATE NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "subject_key" VARCHAR(120) NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "correct_answers" INTEGER NOT NULL,
    "wrong_answers" INTEGER NOT NULL,
    "question_list_url" VARCHAR(2048),
    "wrong_question_list_url" VARCHAR(2048),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "study_sessions_user_id_study_date_idx" ON "study_sessions"("user_id", "study_date" DESC);

-- CreateIndex
CREATE INDEX "study_sessions_user_id_subject_key_study_date_idx" ON "study_sessions"("user_id", "subject_key", "study_date");

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_sessions"
  ADD CONSTRAINT "study_sessions_total_positive" CHECK ("total_questions" > 0 AND "total_questions" <= 1000000),
  ADD CONSTRAINT "study_sessions_correct_range" CHECK ("correct_answers" >= 0 AND "correct_answers" <= 1000000),
  ADD CONSTRAINT "study_sessions_wrong_range" CHECK ("wrong_answers" >= 0 AND "wrong_answers" <= 1000000),
  ADD CONSTRAINT "study_sessions_counts_consistent" CHECK ("total_questions" = "correct_answers" + "wrong_answers");
