import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import MigrationModel from '../../database/mysql/Migrations/MigrationModel'

const MigrationServiceClass = class {
  constructor () {
    this.log_prefix = '[MigrationService]'
  }

  getMigrationModel = (database) => {
    if (database) {
      return new MigrationModel(database)
    }
    return new MigrationModel(DBMySQL)
  }

  setGroupCounts = async () => {
    const output = new StdObject()

    log.debug(this.log_prefix, '[Start setGroupCounts Migration]')

    const migration_model = this.getMigrationModel(DBMySQL)
    const group_counts = await migration_model.createGroupCounts()
    output.add('Group_Counts', group_counts[0].message)

    const content_counts = await migration_model.createContentCounts()
    output.add('Content_Counts', content_counts[0].message)

    log.debug(this.log_prefix, '[End setGroupCounts Migration]')

    return output
  }
}

const migration_service = new MigrationServiceClass()

export default migration_service
