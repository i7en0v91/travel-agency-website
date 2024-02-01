import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type ISignUpCompleteDto, SignUpCompleteDtoSchema, type ISignUpCompleteResultDto, SignUpCompleteResultCode } from '../../dto';

export default defineWebApiEventHandler(async (event) => {
  const signUpCompleteDto = await readBody(event) as ISignUpCompleteDto;

  const tokenLogic = ServerServicesLocator.getTokenLogic();
  const registrationResult = await tokenLogic.consumeToken(signUpCompleteDto.id, signUpCompleteDto.value);
  let responseDto: ISignUpCompleteResultDto | undefined;
  switch (registrationResult.code) {
    case 'success':
      responseDto = {
        code: SignUpCompleteResultCode.SUCCESS
      };
      break;
    case 'already-consumed':
      responseDto = {
        code: SignUpCompleteResultCode.ALREADY_CONSUMED
      };
      break;
    case 'token-expired':
      responseDto = {
        code: SignUpCompleteResultCode.LINK_EXPIRED
      };
      break;
    case 'not-found':
    case 'failed':
      responseDto = {
        code: SignUpCompleteResultCode.LINK_INVALID
      };
      break;
  }
  return responseDto;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: SignUpCompleteDtoSchema });
