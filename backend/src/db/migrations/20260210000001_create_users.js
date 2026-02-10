/**
 * Create users table
 * Stores user credentials and mail server configuration
 */
export async function up(knex) {
  return knex.schema.createTable('users', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('email').notNullable().unique();
    table.text('encrypted_password').notNullable();
    table.string('name');
    table.string('imap_host').notNullable();
    table.integer('imap_port').notNullable().defaultTo(993);
    table.string('imap_security').notNullable().defaultTo('SSL/TLS');
    table.string('smtp_host').notNullable();
    table.integer('smtp_port').notNullable().defaultTo(465);
    table.string('smtp_security').notNullable().defaultTo('SSL/TLS');
    table.integer('password_version').notNullable().defaultTo(1);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_login_at');
    
    // Index for email lookups
    table.index('email');
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('users');
}
