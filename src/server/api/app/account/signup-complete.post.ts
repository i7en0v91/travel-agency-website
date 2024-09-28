import { SignUpCompleteResultEnum } from '@golobe-demo/shared';
import { type ISignUpCompleteDto, SignUpCompleteDtoSchema, type ISignUpCompleteResultDto } from '../../../api-definitions';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event) => {
  const signUpCompleteDto = await readBody(event) as ISignUpCompleteDto;

  const tokenLogic = getServerServices()!.getTokenLogic();
  const registrationResult = await tokenLogic.consumeToken(signUpCompleteDto.id, signUpCompleteDto.value);
  let responseDto: ISignUpCompleteResultDto | undefined;
  switch (registrationResult.code) {
    case 'success':
      responseDto = {
        code: SignUpCompleteResultEnum.SUCCESS
      };
      break;
    case 'already-consumed':
      responseDto = {
        code: SignUpCompleteResultEnum.ALREADY_CONSUMED
      };
      break;
    case 'token-expired':
      responseDto = {
        code: SignUpCompleteResultEnum.LINK_EXPIRED
      };
      break;
    case 'not-found':
    case 'failed':
      responseDto = {
        code: SignUpCompleteResultEnum.LINK_INVALID
      };
      break;
  }
  return responseDto;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: SignUpCompleteDtoSchema });
