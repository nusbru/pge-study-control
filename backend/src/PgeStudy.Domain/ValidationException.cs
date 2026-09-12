namespace PgeStudy.Domain;

public sealed class ValidationException(string field, string message) : Exception(message)
{
    public string Field { get; } = field;
}
