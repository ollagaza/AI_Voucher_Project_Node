import formatter from 'string-template'
import _ from 'lodash'
import ServiceConfig from '../../service/service-config'

const create_user_form = `
<div style="width: 100%;background: #fff;padding-top: 50px;">
	<div style="width: 430px;background: #fff;border-top: 10px solid #3061a5;border-bottom: 1px solid #3061a5;margin: auto;">
        <h1 style="width: 430px;text-align: center;border-bottom: 1px solid #999;color: #7fa2d3;margin: auto;padding: 20px 0;">{service_name} 인증메일</h1>
        <p style="width: 430px;font-size: 14px;color: #7fa2d3;margin: 30px 0;text-align: center;line-height: 24px;">{user_name} 회원님, 안녕하세요.<br><br>
A.I 바우쳐 플랫폼 계정을 등록해 주셔서 감사합니다. <br>
계정을 활성화하려면 확인버튼을 클릭하세요.<br>
확인 버튼을 클릭해도 아무 반응이 없으면 링크를 복사해 <br>
브라우저 주소 입력 창에 붙여 넣거나 직접 입력해 주세요.<br>
{url_prefix}?auth_key={auth_key}&amp;member_seq={member_seq}</p>
        <div class="table_btn4" style="width: 430px;text-align: center;">
        	<a href="{url_prefix}?auth_key={auth_key}&member_seq={member_seq}" style="text-decoration: none;"><button type="submit" class="info_btn1" style="cursor: pointer;width: 200px;height: 43px;border-radius: 5px;background: #252a37;font-size: 18px;color: #fff;">확인</button></a>
        </div>
        <div class="copy" style="margin-top: 30px;background: #fff;text-align: center;padding-bottom: 20px;">
        	<img src="{request_domain}/img/mail_sent.png" style="border: 0;">
        	<p>{address_kor}</p>
        	<p>{address_en}</p>
        	<img src="{request_domain}/img/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_domain}</span> <img src="{request_domain}/img/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_telephone}</span>
        </div>
     </div>
</div>
`

const find_user_info_form = `
<div style="width: 100%; background: #fff;padding-top: 50px;">
  <div style="width: 600px; background: #fff;border-top: 10px solid #3061a5;border-bottom: 1px solid #3061a5;margin: auto;padding: 30px 30px;">
    <h1 style="width: 100%;text-align: center;border-bottom: 1px solid #999;color: #7fa2d3;margin: auto;padding-bottom: 20px;">{service_name} 비밀번호 인증코드</h1>
    <p style="width: 100%; font-size: 14px;color: #7fa2d3; margin: 15px 0;text-align: center; line-height: 24px;">{user_name} 회원님, 안녕하세요.<br /><br />
      아래의 인증코드를 입력하시고 새로운 비밀번호로 변경하여 주시기 바랍니다. <br />
    </p>
    <div style="text-align:left; width: 80%; margin: 0 auto;">
  		<p style="margin:0 0 8px 0;padding:0;">계정정보</p>
  		<table style="width:100%;border-top:2px solid #444444;border-collapse:collapse;border-spacing:0;font-family:dotum,sans-serif;font-size:12px;color:#444">
  			<colgroup><col width="120px"><col></colgroup>
  			<tbody><tr>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0;background:#f9f9f9">아이디</td>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0"><strong>{user_id}</strong></td>
  			</tr>
  			<tr>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0;background:#f9f9f9">인증코드</td>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0"><strong>{send_code}</strong></td>
  			</tr>
  		</tbody></table>
  	</div>
    <div class="copy" style="margin-top: 30px;background: #fff;text-align: center;">
    	<img src="{request_domain}/img/rop/mail_sent.png" style="border: 0;">
    	<p>{address_kor}</p>
        	<p>{address_en}</p>
    	<img src="{request_domain}/img/rop/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_domain}</span> <img src="{request_domain}/img/rop/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_telephone}</span>
    </div>
  </div>
</div>
`

const memberUsed_form = `
<div style="width: 100%; background: #fff;padding-top: 50px;">
  <div style="width: 600px; background: #fff;border-top: 10px solid #3061a5;border-bottom: 1px solid #3061a5;margin: auto;padding: 30px 30px;">
    <h1 style="width: 100%;text-align: center;border-bottom: 1px solid #999;color: #7fa2d3;margin: auto;padding-bottom: 20px;">{service_name} 회원강제 탈퇴 안내</h1>
    <p style="width: 100%; font-size: 14px;color: #7fa2d3; margin: 15px 0;text-align: center; line-height: 24px;">{user_name} 회원님, 안녕하십니까.<br /><br />
      아래와 같은 사유로 강제 탈퇴 되었음을 알려드립니다.. <br />
    </p>
    <div style="text-align:left; width: 80%; margin: 0 auto;">
  		<p style="margin:0 0 8px 0;padding:0;">계정정보/사유</p>
  		<table style="width:100%;border-top:2px solid #444444;border-collapse:collapse;border-spacing:0;font-family:dotum,sans-serif;font-size:12px;color:#444">
  			<colgroup><col width="120px"><col></colgroup>
  			<tbody><tr>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0;background:#f9f9f9">아이디</td>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0"><strong>{user_id}</strong></td>
  			</tr>
  			<tr>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0;background:#f9f9f9">사유</td>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0"><strong>{rejectText}</strong></td>
  			</tr>
  		</tbody></table>
  	</div>
    <div class="copy" style="margin-top: 30px;background: #fff;text-align: center;">
    	<img src="{request_domain}/img/jiin/mail_sent.png" style="border: 0;">
    	<p>{address_kor}</p>
        	<p>{address_en}</p>
    	<img src="{request_domain}/img/jiin/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_domain}</span> <img src="{request_domain}/img/jiin/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_telephone}</span>
    </div>
  </div>
</div>
`

const getServiceInfo = () => {
  return ServiceConfig.getServiceInfo()
}

export default {
  'createUser': (template_data = {}) => {
    return formatter(create_user_form, _.merge(template_data, getServiceInfo()))
  },
  'findUserInfo': (template_data = {}) => {
    return formatter(find_user_info_form, _.merge(template_data, getServiceInfo()))
  },
  'memberUsed2': (template_data = {}) => {
    return formatter(memberUsed_form, _.merge(template_data, getServiceInfo()))
  },
}
