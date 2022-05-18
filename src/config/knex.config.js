export default {
  local: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      port: 3307,
      database: 'ai_voucher',
      user: 'root',
      password: '1234',
      timezone: 'UTC'
    },
    pool: {
      min: 10,
      max: 20
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },
  development: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      port: 3307,
      database: 'ai_voucher',
      user: 'root',
      password: '1234',
      timezone: 'UTC'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      port: 3307,
      database: 'ai_voucher',
      user: 'root',
      password: '1234',
      timezone: 'UTC'
    },
    pool: {
      min: 10,
      max: 20
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
}
