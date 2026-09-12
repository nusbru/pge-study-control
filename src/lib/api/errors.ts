export type ApiProblem = {
  title?: string;
  errors?: Record<string, string[]>;
  code?: string;
};

export class ApiError extends Error {
  constructor(public status: number, public problem: ApiProblem = {}) {
    super(problem.title ?? (status === 404 ? "Sessão não encontrada." : "Não foi possível concluir a operação. Tente novamente."));
  }
}

export async function responseError(response: Response) {
  const problem = await response.json().catch(() => ({})) as ApiProblem;
  return new ApiError(response.status, problem);
}
