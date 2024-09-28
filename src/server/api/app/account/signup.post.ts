import { AppConfig, AppException, AppExceptionCodeEnum, type Locale, type Theme, SignUpResultEnum } from '@golobe-demo/shared';
import { type ISignUpDto, SignUpDtoSchema, type ISignUpResultDto } from '../../../api-definitions';
import { defineWebApiEventHandler } from './../../../utils/webapi-event-handler';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event) => {
  const signUpDto = await readBody(event) as ISignUpDto;

  const emailingEnabled = AppConfig.email;
  const userLogic = getServerServices()!.getUserLogic();
  const registrationResult = await userLogic.registerUserByEmail(signUpDto.email, signUpDto.password, emailingEnabled ? 'send-email' : 'verified', signUpDto.firstName, signUpDto.lastName, signUpDto.theme as Theme, signUpDto.locale as Locale, event);
  let responseDto: ISignUpResultDto | undefined;
  switch (registrationResult) {
    case 'already-exists':
      responseDto = {
        code: SignUpResultEnum.ALREADY_EXISTS
      };
      break;
    case 'insecure-password':
      throw new AppException(
        AppExceptionCodeEnum.BAD_REQUEST, 'Insecure password', 'error-stub');
      break;
    default:
      if (emailingEnabled) {
        responseDto = {
          code: SignUpResultEnum.SUCCESS
        };
      } else {
        responseDto = {
          code: SignUpResultEnum.AUTOVERIFIED
        };
      }
      break;
  }
  return responseDto;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: SignUpDtoSchema, captchaProtected: true });
