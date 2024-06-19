import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type IRecoverPasswordDto, type IRecoverPasswordResultDto, RecoverPasswordDtoSchema } from '../../dto';
import { type Locale, type Theme, RecoverPasswordResultEnum } from '../../../shared/constants';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import AppConfig from './../../../appconfig';

export default defineWebApiEventHandler(async (event) => {
  const logger = CommonServicesLocator.getLogger();
  if (!AppConfig.email) {
    const msg = '(recover-password) cannot recover password as emailing is disabled';
    logger.warn(msg);
    throw new AppException(AppExceptionCodeEnum.EMAILING_DISABLED, 'cannot recover password as emailing is disabled', 'error-stub');
  }

  const passwordRecoveryDto = await readBody(event) as IRecoverPasswordDto;

  const userLogic = ServerServicesLocator.getUserLogic();
  const recoveryResult = await userLogic.recoverUserPassword(passwordRecoveryDto.email, passwordRecoveryDto.theme as Theme, passwordRecoveryDto.locale as Locale, event);
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
