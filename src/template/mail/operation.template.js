import formatter from 'string-template'

const operation_link_email_form = `
<html>
<body>
<table class="mteg_main_form" style="margin: 0; background-color: #f5f5f5; width: 100%; border-spacing: 0; padding: 0;">
  <tbody>
    <tr>
      <td style="padding: 30px 0 40px 0; width: 100%;" align="center">
        <table style="width: 700px; background-color: #fff; border: 1px solid #ddd; border-spacing: 0;">
          <tr>
            <td style="text-align: center; background-color: #1c3048; height: 150px; vertical-align: middle; padding: 0;">
              <img src="{service_domain}/img/renewal/mail_logo.png">
            </td>
          </tr>
          <tr>
            <td style="width: 100%;">
              <table style="width: 100%; padding: 50px; border-spacing: 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; font-size: 15px; font-weight: 400; color: #555;">
                <tr>
                  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
                    안녕하세요.<br>
                    <span style="color: #ffa00f; font-weight: bold;">{user_name}</span>님이 <span style="color: #2e6bb8; font-weight: bold;">"{operation_name}"</span> 수술/시술을 공유하였습니다.<br>
                    다음은 {user_name}님이 보낸 메세지 입니다.
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
                  <td align="center" style="padding-top: 30px;">
                    <a href="{btn_link_url}" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">수술/시술 확인</a>
                  </td>
                </tr>
`
const operation_link_email_form_limitTime = `
                <tr>
                  <td align="center" style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 12px; color: #555; letter-spacing:-0.5px; line-height: 1.4; padding-top: 15px;">
                    공유된 수술/시술은 <span style="color: #ffa00f; font-weight: bold;">{expire_date}까지</span> 유지되며 그 이후에는 접근하실 수 없습니다.
                  </td>
                </tr>
`;
const operation_link_email_form_bottom = `
                <tr>
                  <td style="border-bottom: 1px solid #ddd; padding-top: 30px;">
                  </td>
                </tr>
                <tr>
                  <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.4; text-align: center; padding-top: 30px;">
                    지능형 의료영상 관리 솔루션<br>
                    <a style="text-decoration:none; color:#fff;"><span style="font-size: 18px; color: #2e6bb8; font-weight: bold;" href="{service_domain}" target="_blank">SurgStory.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </tbody>
</table>
</body>
</html>
`;

export default {
  'linkEmail': (template_data = {}) => {
    if (template_data.expire_date) {
      return formatter(operation_link_email_form + operation_link_email_form_limitTime + operation_link_email_form_bottom, template_data)
    } else {
      return formatter(operation_link_email_form + operation_link_email_form_bottom, template_data)
    }
  },
}
