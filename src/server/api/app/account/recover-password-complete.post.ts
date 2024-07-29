import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type IRecoverPasswordCompleteDto, RecoverPasswordCompleteDtoSchema, type IRecoverPasswordCompleteResultDto } from '../../../dto';
import { RecoverPasswordCompleteResultEnum } from './../../../../shared/constants';
import { isPasswordSecure } from '../../../../shared/common';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';

export default defineWebApiEventHandler(async (event) => {
  const recoverPasswordCompleteDto = await readBody(event) as IRecoverPasswordCompleteDto;

  const logger = CommonServicesLocator.getLogger();
  if (!isPasswordSecure(recoverPasswordCompleteDto.password)) {
    const msg = '(recover-password-complete) insecure password';
    logger.warn(msg);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, msg, 'error-page');
  }

  const tokenLogic = ServerServicesLocator.getTokenLogic();
  const userLogic = ServerServicesLocator.getUserLogic();
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
