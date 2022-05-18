import MySQLModel from '../../mysql-model'

export default class ProFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_info'
    this.selectable_fields = [`${this.table_name}.seq`, `${this.table_name}.profile_image_path`, `${this.table_name}.member_seq`
      , `${this.table_name}.profile`, `${this.table_name}.is_channel`, `${this.table_name}.is_mentoring`]
    this.log_prefix = '[ProFileModel]'
  }

  getProFileInfo = async group_seq => {
    const oKnex = this.database.select(this.selectable_fields.concat('member.hospname'))
      .from(this.table_name)
      .innerJoin('member', 'member.seq', `${this.table_name}.member_seq`)
      .where(`${this.table_name}.seq`, group_seq)
      .limit(1)
    return oKnex.first()
  }

  updateProFileInfo = async (group_seq, upload_type, input_data) => {
    return this.database.raw(`update group_info set profile = json_replace(profile, '$.${upload_type}', ?) where seq = ?`, [input_data, group_seq])
  }

  updateChannelFlag = async (group_seq, param) => {
    return this.update({ seq: group_seq }, { is_channel: param })
  }

  updateMentoFlag = async (group_seq, param) => {
    return this.update({ seq: group_seq }, { is_mentoring: param })
  }
}
