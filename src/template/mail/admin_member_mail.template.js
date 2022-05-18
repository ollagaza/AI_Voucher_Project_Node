import formatter from 'string-template'
import _ from 'lodash'
import ServiceConfig from '../../service/service-config'

const mail_top = `
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

const mail_bottom = `
              <tr>
                <td style="border-bottom: 1px solid #ddd; padding-top: 30px;"></td>
              </tr>
              <tr>
                <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.4; text-align: center; padding-top: 30px;">
                  지능형 의료영상 관리 솔루션<br>
                  <a href="https://www.surgstory.com/" target="_blank" style="text-decoration:none; color:#fff;"><span style="font-size: 18px; color: #2e6bb8; font-weight: bold;">Surgstory.co.kr</span></a>
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
const mail_visit_button = `
<tr>
  <td align="center" style="padding-top: 30px;">
    <a href="{service_domain}" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">SurgStory</a>
  </td>
</tr>
`

const mail_recall_button = `
<tr>
  <td align="center" style="padding-top: 30px;">
    <a href="{service_domain}" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">서지스토리</a>
  </td>
</tr>
`

const joinconfrim_member_form = `
<tr>
  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 22px; color: #2e6bb8; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
    SurgStory 회원이 되신 걸 환영합니다!
  </td>
</tr>
  <tr>
  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
    안녕하세요. <span style="color: #ffa00f; font-weight: bold;">{user_nickname}({user_id})</span>님,<br>
    고객님의 SurgStory 회원가입이 승인되었습니다.
  </td>
</tr>
<tr>
  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
    <span style="text-decoration: underline;">초대 메일을 받으신 경우,</span> 초대를 수락하여 초대코드를 입력하고 초대받은 채널에 가입해 보세요!<br>
    <span style="text-decoration: underline;">초대 메일이 없으신 경우,</span> 채널을 생성하여 팀원을 초대해 보세요!
  </td>
</tr>
`

const reject_member_form = `
<tr>
  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
  안녕하세요.<br>
  SurgStory 고객 지원팀입니다.
  </td>
</tr>
<tr>
  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
  <span style="color: #ffa00f; font-weight: bold;">{user_name}</span>님은 {regist_date}에 회원가입 신청을 해 주셨습니다.<br>
  현재 아래의 사유로 가입 승인이 완료되지 않고 있습니다. <br/>
  </td>
</tr>
<tr>
  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;padding-top: 16px;">
    <span style="font-weight: bold; font-size: 18px; color: #2e6bb8; letter-spacing: -0.5px; line-height: 1.4;">{admin_text}</span>
  </td>
</tr>
<tr>
  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
  support@mteg.co.kr 로 해당 사유에 대한 관련 자료를 보내주시면 확인 후 승인 절차가 진행됩니다.<br>
  감사합니다.<br>
  SurgStory팀 드림
  </td>
</tr>
`

const forced_leave_member_form = `
                <tr>
                  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
                  안녕하세요.<br>
                  SurgStory 고객 지원팀입니다.
                  </td>
                </tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
										<span style="color: #ffa00f; font-weight: bold;">{user_name}</span>님 께서는 <span style="color: #ffa00f; font-weight: bold;">{now_datetime}</span>시각부로 SurgStory 회원자격이 상실되었으며,<br/>
										사유는 아래와 같습니다.
									</td>
								</tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
										<span style="font-weight: bold; font-size: 18px; color: #2e6bb8; letter-spacing: -0.5px; line-height: 1.4;">{admin_text}</span>
									</td>
								</tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
										원활한 사이트 운영을 위한 조치이니 협조를 부탁드립니다.
										감사합니다.
									</td>
								</tr>
`

const leave_member_form = `
                <tr>
                  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
                  안녕하세요.<br>
                  {user_name}님, SurgStory 고객 지원팀입니다.
                  </td>
                </tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
										{user_name}님 께서는 {stop_start_date}부로 회원탈퇴를 하였습니다.
									</td>
								</tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
										그 동안 저희 SurgStory를 이용해 주셔서 감사합니다.
									</td>
								</tr>
`

const dormant_member_form = `
                <tr>
                  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
                  안녕하세요.<br>
                  {user_name}님, SurgStory 고객 지원팀입니다.
                  </td>
                </tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
										{user_name}님께서 장기간 사용이 없어 휴면계정으로 전환됩니다.
									</td>
								</tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
										감사합니다.
									</td>
								</tr>
`

const stop_member_form = `
                <tr>
                  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
                  안녕하세요.<br>
                  SurgStory 고객 지원팀입니다.
                  </td>
                </tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
										<span style="color: #ffa00f; font-weight: bold;">{user_name}</span>님은 <span style="color: #ffa00f; font-weight: bold;">{stop_start_date}부터 {stop_end_date}까지 ({stop_days}일간)</span><br/>
										SurgStory 회원 자격이 정지되며, 사유는 아래와 같습니다.
									</td>
								</tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px; padding-top: 16px;">
										<span style="font-weight: bold; font-size: 18px; color: #2e6bb8; letter-spacing: -0.5px; line-height: 1.4;">{admin_text}</span>
									</td>
								</tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
										원활한 사이트 이용을 위한 조치이니 협조를 부탁드립니다.
										감사합니다.
									</td>
								</tr>
`

const stopclear_member_form = `
                <tr>
                  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
                  안녕하세요.<br>
                  SurgStory 고객 지원팀입니다.
                  </td>
                </tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
										<span style="color: #ffa00f; font-weight: bold;">{user_name}</span>님, <span style="color: #ffa00f; font-weight: bold;">{stop_start_date}</span>에 시행되었던 회원 자격 정지가<br />
										<span style="color: #ffa00f; font-weight: bold;">{now_datetime}</span>시간 부로 해제되었습니다. 사유는 아래와 같습니다.
									</td>
								</tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px; padding-top: 16px;">
										<span style="font-weight: bold; font-size: 18px; color: #2e6bb8; letter-spacing: -0.5px; line-height: 1.4;">{admin_text}</span>
									</td>
								</tr>
								<tr>
									<td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
										앞으로 저희 SurgStory를 정상적으로 이용하실 수 있습니다.
										감사합니다.
									</td>
								</tr>
`

const getServiceInfo = () => {
  return ServiceConfig.getServiceInfo()
}

export default {
  'reject_member': (template_data = {}) => {
    const template_html = mail_top + reject_member_form + mail_visit_button + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'joinconfrim_member': (template_data = {}) => {
    const template_html = mail_top + joinconfrim_member_form + mail_visit_button + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'forced_leave_member': (template_data = {}) => {
    const template_html = mail_top + forced_leave_member_form + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'leave_member': (template_data = {}) => {
    const template_html = mail_top + leave_member_form + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'dormant_member': (template_data = {}) => {
    const template_html = mail_top + dormant_member_form + mail_visit_button + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'stop_member': (template_data = {}) => {
    const template_html = mail_top + stop_member_form + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'stopclear_member': (template_data = {}) => {
    const template_html = mail_top + stopclear_member_form + mail_visit_button + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
}
