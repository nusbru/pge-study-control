namespace PgeStudy.Domain;

public sealed record QuestionCounts
{
    public int Total { get; }
    public int Correct { get; }
    public int Wrong { get; }

    private QuestionCounts(int total, int correct, int wrong) => (Total, Correct, Wrong) = (total, correct, wrong);

    public static QuestionCounts Resolve(int? total, int? correct, int? wrong)
    {
        if (new[] { total, correct, wrong }.Count(value => value.HasValue) < 2)
            throw new ValidationException("totalQuestions", "Informe pelo menos dois valores.");
        // Use a wider intermediate so hostile inputs cannot overflow during derivation.
        long resolvedTotal = total ?? (long)correct!.Value + wrong!.Value;
        long resolvedCorrect = correct ?? resolvedTotal - wrong!.Value;
        long resolvedWrong = wrong ?? resolvedTotal - resolvedCorrect;
        if (new[] { resolvedTotal, resolvedCorrect, resolvedWrong }.Any(value => value is < 0 or > 1_000_000))
            throw new ValidationException("totalQuestions", "Use números inteiros entre 0 e 1.000.000.");
        if (resolvedTotal == 0)
            throw new ValidationException("totalQuestions", "O total deve ser maior que zero.");
        if (resolvedTotal != resolvedCorrect + resolvedWrong)
            throw new ValidationException("totalQuestions", "O total deve ser igual à soma de acertos e erros.");
        return new((int)resolvedTotal, (int)resolvedCorrect, (int)resolvedWrong);
    }

    public static decimal Percentage(long part, long total) => total > 0
        ? decimal.Round((decimal)part / total * 100, 1, MidpointRounding.AwayFromZero)
        : throw new ArgumentOutOfRangeException(nameof(total));
}
