import formatter from 'string-template'
import _ from 'lodash'
import ServiceConfig from '../../service/service-config'

const invite_form = `
<div style="margin: 20px auto; box-sizing: border-box; width: 600px; padding: 40px; border-top: 5px solid #369; font-size: 16px; background-color: #fff; font-family: 'Noto Sans KR', '나눔고딕',NanumGothic,'맑은고딕',Malgun Gothic,'돋움',Dotum,Helvetica,'Apple SD Gothic Neo',Sans-serif;">
	<div style="box-sizing: border-box; width: 100%; border: 1px solid #999; padding: 20px; text-align: center;">
		<div>{user_name} 선생님 님께서</div>
		<div>{operation_name}동영상을 공유하셨습니다.</div>
		<div style="margin: 20px 0;">{comment}</div>
		<div style="color: #aaa; padding: 15px 0 20px 0; border-bottom: 1px solid #ccc;">동영상을 확인하시려면 로그인이 필요합니다.</div>
		<div style="padding: 20px 0 10px 0;">
			<a href="{url_prefix}/{share_key}" style="display: inline-block; padding: 14px 40px; background-color: #39f; text-decoration: none; font-size: 16px; color: #fff;" >동영상 확인하기</a>
		</div>
	</div>
	<div style="margin-top: 30px;background: #fff;text-align: center;">
		<div style="display: inline-block; vertical-align: top; margin-right: 15px; padding-top: 5px;"><a href="http://www.mteg.co.kr" each="_blank" target="_blank" style="text-decoration: none;"><img src="{service_url}/img/drive/mail_logo.png" style="border: 0;"></a></div>
		<div style="font-size: 12px; display: inline-block; text-align: left; color: #999;">
    	<div>서울특별시 마포구 성암로 330 DMC첨단산업센터 516호 (주)엠티이지</div>
      <div>330, Seongam-ro, Mapo-gu, Seoul, Republic of Korea</div>
			<div style="margin-top: 5px;">
    		<img src="{request_domain}/img/mail_dot.png" style="border: 0; margin-right: 5px;"><a href="http://www.mteg.co.kr" each="_blank" target="_blank" style="text-decoration: none;"><span style="font-size: 12px;color: #333;">www.mteg.co.kr</span></a>
				<img src="{request_domain}/img/mail_dot.png" style="border: 0; margin: 0 5px 0 15px;"><span style="font-size: 12px;color: #333;">02.859.3585</span>
			</div>
		</div>
  </div>
</div>
`

const getServiceInfo = () => {
  return ServiceConfig.getServiceInfo()
}

export default {
  'invite': (template_data = {}) => {
    return formatter(invite_form, _.merge(template_data, getServiceInfo()))
  },
}
