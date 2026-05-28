using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core column mapping for the ChatSessions table.
/// The session UUID is always supplied by the browser client via <c>crypto.randomUUID()</c>,
/// so <see cref="Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder.ValueGeneratedNever"/>
/// prevents EF from overwriting the client value with a server-generated one.
/// </summary>
public sealed class ChatSessionConfiguration : IEntityTypeConfiguration<ChatSession>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<ChatSession> builder)
    {
        builder.ToTable("ChatSessions");
        builder.HasKey(s => s.SessionId);

        // Client always supplies the UUID — do not generate server-side
        builder.Property(s => s.SessionId).ValueGeneratedNever();

        builder.Property(s => s.CreatedAt)
               .HasDefaultValueSql("GETUTCDATE()")
               .ValueGeneratedOnAdd();

        builder.Property(s => s.LastActivityAt).IsRequired();

        // JSON blobs — nvarchar(max) by default for non-nullable string
        builder.Property(s => s.MessagesJson)
               .IsRequired()
               .HasDefaultValue("[]");

        // ContextJson is nullable — no default needed
    }
}
