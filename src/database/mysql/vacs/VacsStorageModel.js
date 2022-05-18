import MySQLModel from '../../mysql-model'

export default class VacsStorageModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'vacs_storage'
    this.selectable_fields = ['*']
    this.log_prefix = '[VacsStorageModel]'
  }

  updateStorageStatus = async (date, used, total) => {
    const sql = `
      INSERT INTO ${this.table_name} (\`state_date\`, \`used_size\`, \`total_size\`, \`modify_date\`)
      VALUES (?, ?, ?, current_timestamp())
      ON DUPLICATE KEY UPDATE
        \`used_size\` = VALUES(\`used_size\`),
        \`total_size\` = VALUES(\`total_size\`),
        \`modify_date\` = current_timestamp()
    `
    const query_result = await this.database.raw(sql, [date, used, total])

    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].affectedRows > 0
  }

  getCurrentStorageStatus = async () => {
    return await this.findOne(null, ['*'], { name: 'state_date', direction: 'desc' })
  }

  increaseCount = async (date, upload_count = 0, delete_count = 0) => {
    const params = {
      'modify_date': this.database.raw('NOW()')
    }
    if (upload_count) {
      params.upload_count = this.database.raw(`\`upload_count\` + ${upload_count}`)
    }
    if (delete_count) {
      params.delete_count = this.database.raw(`\`delete_count\` + ${delete_count}`)
    }
    return await this.update({ state_date: date }, params)
  }
}
