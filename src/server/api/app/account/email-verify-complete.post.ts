import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type IEmailVerifyCompleteDto, type IEmailVerifyCompleteResultDto, EmailVerifyCompleteDtoSchema, EmailVerifyCompleteResultCode } from '../../../api-definitions';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event) => {
  const emailVerifyCompleteCompleteDto = await readBody(event) as IEmailVerifyCompleteDto;

  const tokenLogic = getServerServices()!.getTokenLogic();
  const registrationResult = await tokenLogic.consumeToken(emailVerifyCompleteCompleteDto.id, emailVerifyCompleteCompleteDto.value);
  let responseDto: IEmailVerifyCompleteResultDto | undefined;
  switch (registrationResult.code) {
    case 'success':
      responseDto = {
        code: EmailVerifyCompleteResultCode.SUCCESS
      };
      break;
    case 'already-consumed':
      responseDto = {
        code: EmailVerifyCompleteResultCode.ALREADY_CONSUMED
      };
      break;
    case 'token-expired':
      responseDto = {
        code: EmailVerifyCompleteResultCode.LINK_EXPIRED
      };
      break;
    case 'not-found':
    case 'failed':
      responseDto = {
        code: EmailVerifyCompleteResultCode.LINK_INVALID
      };
      break;
  }
  return responseDto;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: EmailVerifyCompleteDtoSchema });
