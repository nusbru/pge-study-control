CREATE TYPE "QuestionType" AS ENUM (
  'JURISPRUDENCE',
  'BLACK_LETTER_LAW',
  'DOCTRINE',
  'UNSPECIFIED'
);

ALTER TABLE "study_sessions"
  ADD COLUMN "question_type" "QuestionType" NOT NULL DEFAULT 'UNSPECIFIED';

ALTER TABLE "study_sessions"
  ALTER COLUMN "question_type" DROP DEFAULT;

CREATE INDEX "study_sessions_user_id_question_type_study_date_idx"
  ON "study_sessions"("user_id", "question_type", "study_date");
