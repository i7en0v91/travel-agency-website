import { AppException, AppExceptionCodeEnum, isPasswordSecure, RecoverPasswordCompleteResultEnum } from '@golobe-demo/shared';
import { type IRecoverPasswordCompleteDto, RecoverPasswordCompleteDtoSchema, type IRecoverPasswordCompleteResultDto } from '../../../api-definitions';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { getCommonServices, getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event) => {
  const recoverPasswordCompleteDto = await readBody(event) as IRecoverPasswordCompleteDto;

  const logger = getCommonServices().getLogger().addContextProps({ component: 'WebApi' });
  if (!isPasswordSecure(recoverPasswordCompleteDto.password)) {
    logger.warn('insecure password');
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, '(recover-password-complete) insecure password', 'error-page');
  }

  const tokenLogic = getServerServices()!.getTokenLogic();
  const userLogic = getServerServices()!.getUserLogic();
  const registrationResult = await tokenLogic.consumeToken(recoverPasswordCompleteDto.id, recoverPasswordCompleteDto.value);
  let responseDto: IRecoverPasswordCompleteResultDto | undefined;
  switch (registrationResult.code) {
    case 'success':
      await userLogic.setUserPassword(registrationResult.userId!, recoverPasswordCompleteDto.password);
      responseDto = {
        code: RecoverPasswordCompleteResultEnum.SUCCESS
      };
      break;
    case 'already-consumed':
      responseDto = {
        code: RecoverPasswordCompleteResultEnum.ALREADY_CONSUMED
      };
      break;
    case 'token-expired':
      responseDto = {
        code: RecoverPasswordCompleteResultEnum.LINK_EXPIRED
      };
      break;
    case 'not-found':
    case 'failed':
      responseDto = {
        code: RecoverPasswordCompleteResultEnum.LINK_INVALID
      };
      break;
  }
  return responseDto;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: RecoverPasswordCompleteDtoSchema });
