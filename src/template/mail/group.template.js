import formatter from 'string-template'

const group_mail_common_top = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" height="100%" style="background-color: #f5f5f5">
    <tbody>
        <tr>
            <td style="padding: 30px 0 40px 0; width: 100%;" align="center">
                <table style="width: 700px; background-color: #fff; border: 1px solid #ddd; border-spacing: 0;">
                <tbody>
                    <tr>
                        <td style="width: 100%; height: 150px; background-color: #1c3048; text-align: center;">
                            <a href="{service_domain}" target="_blank"><img src="{service_domain}/img/renewal/mail_logo.png"></a>
                        </td>
                    </tr>
                    <tr>
                      <td style="width: 100%; padding: 40px;">
                        <table style="width: 100%; border-spacing: 0;">
                        <tbody>
`
const group_mail_common_bottom = `
                          <tr>
                                <td style="border-bottom: 1px solid #ddd; padding-top: 30px;"></td>
                          </tr>
                          <tr>
                              <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.4; text-align: center; padding-top: 30px;">
                                  지능형 의료영상 관리 솔루션<br>
                                  <a href="{service_domain}" target="_blank" style="text-decoration:none; color:#fff;"><span style="font-size: 18px; color: #2e6bb8; font-weight: bold;">Surgstory.co.kr</span></a>
                              </td>
                          </tr>
                        </tbody>
                        </table>
                      </td>
                    </tr>
                </tbody>
                </table>
            </td>
        </tr>
    </tbody>
    </table>
`
const invite_group_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
        <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 채널에 참여하세요. <span style="font-size: 14px; color: #2e6bb8;">현재 {active_count}명 활동</span>
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 채널 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 초대하였습니다.<br>
      초대를 수락하여 수술동영상을 보관하고 팀원들과 공유해 보세요.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.6; padding: 20px; background-color: #f5f5f5;">
      {message}
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-top: 16px;">
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
      <td style="border-bottom: 1px solid #ddd; padding-top: 30px;"></td>
  </tr>
  <tr>
    <td align="center" style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.4; padding-top: 30px;">
      초대코드<br>
      <span style="font-size: 32px; color: #ffa00f; font-weight: bold;">{invite_code}</span>
    </td>
  </tr>

  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">초대 수락</div>
      </a>
    </td>
  </tr>
`
const invite_group_form_no_comment = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
        <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 채널에 참여하세요. <span style="font-size: 14px; color: #2e6bb8;">현재 {active_count}명 활동</span>
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 채널 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 초대하였습니다.<br>
      초대를 수락하여 수술동영상을 보관하고 팀원들과 공유해 보세요.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-top: 16px;">
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
      <td style="border-bottom: 1px solid #ddd; padding-top: 30px;"></td>
  </tr>
  <tr>
    <td align="center" style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.4; padding-top: 30px;">
      초대코드<br>
      <span style="font-size: 32px; color: #ffa00f; font-weight: bold;">{invite_code}</span>
    </td>
  </tr>

  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">초대 수락</div>
      </a>
    </td>
  </tr>
`
const group_grade_admin_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #2e6bb8;">채널 매니저</span>가 되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 채널 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 채널 매니저로 지정하였습니다.<br>
      채널 매니저는 채널과 관련된 모든 부분을 관리할 수 있습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">SurgStory</div>
      </a>
    </td>
  </tr>
`
const group_pause_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널 사용이 <span style="color: #2e6bb8;">제한</span>되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님의 채널 활동을
      <span style="color: #2e6bb8; font-weight: bold;">제한</span>하였습니다.<br>
      <span style="color: #ffa00f; font-weight: bold;">{pause_sdate}</span>부터 <span style="color: #ffa00f; font-weight: bold;">{pause_edate}</span>까지
      <span style="color: #ffa00f; font-weight: bold;">({pause_day}일간)</span> 해당 채널 활동이 제한됩니다.<br>
      이제 채널 활동을 할 수 없으며, 채널에 있는 파일에 접근할 수 없습니다.<br>
      ("{group_name}" 외에 다른 채널은 접근이 가능합니다.)
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 "{group_name}"의 채널 관리자인 {admin_name}님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">SurgStory</div>
      </a>
    </td>
  </tr>
`
const group_pause_unlimit_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널 사용이 <span style="color: #2e6bb8;">제한</span>되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님의 채널 활동을
      <span style="color: #2e6bb8; font-weight: bold;">정지</span>하였습니다.<br>
      <span style="color: #2e6bb8; font-weight: bold;">{pause_sdate}</span>부터 해당 채널 활동이 정지 됩니다.<br>
      이제 채널 활동을 할 수 없으며, 채널에 있는 파일에 접근할 수 없습니다.<br>
      ("{group_name}" 외에 다른 채널은 접근이 가능합니다.)
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 "{group_name}"의 채널 관리자인 {admin_name}님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">SurgStory</div>
      </a>
    </td>
  </tr>
`
const group_un_pause_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널의 활동 제한이 <span style="color: #2e6bb8;">해제</span>되어 다시 활동이 가능합니다
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 채널의 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;" rel="noopener noreferrer">SurgStory</a>
    </td>
  </tr>
`
const group_delete_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널의 팀원에서 제외되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 팀원에서 제외하였습니다.<br>
      이제 채널 활동을 할 수 없으며, 계정에 있는 파일에 접근할 수 없습니다.<br>
      ("{group_name}" 외에 다른 채널은 접근이 가능합니다.)
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 "{group_name}"의 채널 관리자인 {admin_name}님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">SurgStory</div>
      </a>
    </td>
  </tr>
`
const group_un_delete_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널의 팀원으로 <span style="color: #2e6bb8;">복원</span>되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 팀원으로 복원하였습니다.<br>
      이제 다시 채널 활동을 할 수 있습니다.<br>
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 "{group_name}" 채널 관리자인 {admin_name}님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">SurgStory</div>
      </a>
    </td>
  </tr>
`

const group_entrust_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널의 관리자로 위임되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">{member_name}</span>님,
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널 관리자였던 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님께서 회원님께<br>
      <span style="color: #2e6bb8; font-weight: bold;">채널 관리자를 위임</span>하였습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      현시각부터 <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>채널의 관리자로서 채널과 관련된 모든 사항을 관리할 수 있습니다.<br>
      감사합니다.
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">SurgStory</div>
      </a>
    </td>
  </tr>
`

const group_closure_other_member_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널 폐쇄 안내 메일.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      안녕하세요.<br />SurgStory 고객 지원팀입니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      회원님께서 가입하신 <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>채널이 채널 관리자에 의해<br />
      <span style="color: #ffa00f; font-weight: bold;">"{today}"</span>에 폐쇄되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      그동안 <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span> 채널의 팀원으로서 많은 활동 진심으로 감사드립니다.<br />
      이후 해당 채널에 접속이 불가하며, 채널 내 작성한 게시물은 채널 폐쇄와 동시에 삭제되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      기타 문의 사항은 SurgStory 고객센터로 문의해 주세요.<br />
      감사합니다.
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="{btn_link_url}" target="_blank" style="text-decoration: none;" rel="noopener noreferrer">
        <div style="width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; line-height: 40px;">SurgStory</div>
      </a>
    </td>
  </tr>
`


export default {
  'inviteGroupMember': (template_data = {}, no_comment = false) => {
    if (no_comment) {
      const template_html = group_mail_common_top + invite_group_form_no_comment + group_mail_common_bottom
      return formatter(template_html, template_data)
    }
    const template_html = group_mail_common_top + invite_group_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'groupAdmin': (template_data = {}) => {
    const template_html = group_mail_common_top + group_grade_admin_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'pauseGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_pause_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'pauseUnLimitGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_pause_unlimit_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'unPauseGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_un_pause_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'deleteGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_delete_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'unDeleteGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_un_delete_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'groupEntrustMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_entrust_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'groupClosureOtherMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_closure_other_member_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  }
}
