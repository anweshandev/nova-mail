/**
 * Create user_settings table
 * Stores user preferences and email settings
 */
export async function up(knex) {
  return knex.schema.createTable('user_settings', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('user_id', 36).notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.text('signature');
    table.boolean('auto_bcc').defaultTo(false);
    table.string('default_folder').defaultTo('INBOX');
    table.string('reading_pane').defaultTo('right'); // 'right', 'bottom', 'none'
    table.integer('emails_per_page').defaultTo(50);
    table.boolean('show_images').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Index for user lookups
    table.index('user_id');
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('user_settings');
}
