/**
 * Create sessions table
 * Stores active JWT sessions for token validation and revocation
 */
export async function up(knex) {
  return knex.schema.createTable('sessions', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('jti', 36).notNullable().unique(); // JWT ID for token identification
    table.text('token').notNullable(); // The actual JWT token
    table.integer('password_version').notNullable(); // To invalidate sessions when password changes
    table.string('ip_address');
    table.text('user_agent');
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at').defaultTo(knex.fn.now());
    
    // Indexes for lookups
    table.index('jti');
    table.index('user_id');
    table.index('expires_at');
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('sessions');
}
