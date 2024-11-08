import { AppConfig, type Locale, type Theme, RecoverPasswordResultEnum, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { type IRecoverPasswordDto, type IRecoverPasswordResultDto, RecoverPasswordDtoSchema } from '../../../api-definitions';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { getCommonServices, getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event) => {
  const logger = getCommonServices().getLogger();
  if (!AppConfig.email) {
    const msg = '(recover-password) cannot recover password as emailing is disabled';
    logger.warn(msg);
    throw new AppException(AppExceptionCodeEnum.EMAILING_DISABLED, 'cannot recover password as emailing is disabled', 'error-stub');
  }

  const passwordRecoveryDto = await readBody(event) as IRecoverPasswordDto;

  const userLogic = getServerServices()!.getUserLogic();
  const recoveryResult = await userLogic.recoverUserPassword(passwordRecoveryDto.email, passwordRecoveryDto.theme as Theme, passwordRecoveryDto.locale as Locale);
  let responseDto: IRecoverPasswordResultDto | undefined;
  switch (recoveryResult) {
    case 'success':
      responseDto = {
        code: RecoverPasswordResultEnum.SUCCESS
      };
      break;
    case 'user-not-found':
      responseDto = {
        code: RecoverPasswordResultEnum.USER_NOT_FOUND
      };
      break;
    case 'email-not-verified':
      responseDto = {
        code: RecoverPasswordResultEnum.EMAIL_NOT_VERIFIED
      };
      break;
  }
  return responseDto;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: RecoverPasswordDtoSchema, captchaProtected: true });
