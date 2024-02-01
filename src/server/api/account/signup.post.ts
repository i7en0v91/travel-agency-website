import { type Locale, type Theme } from '../../../shared/constants';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { defineWebApiEventHandler } from './../../utils/webapi-event-handler';
import { type ISignUpDto, SignUpDtoSchema, type ISignUpResultDto, SignUpResultCode } from './../../dto';
import AppConfig from './../../../appconfig';

export default defineWebApiEventHandler(async (event) => {
  const signUpDto = await readBody(event) as ISignUpDto;

  const emailingEnabled = AppConfig.email;
  const userLogic = ServerServicesLocator.getUserLogic();
  const registrationResult = await userLogic.registerUserByEmail(signUpDto.email, signUpDto.password, emailingEnabled ? 'send-email' : 'verified', signUpDto.firstName, signUpDto.lastName, signUpDto.theme as Theme, signUpDto.locale as Locale);
  let responseDto: ISignUpResultDto | undefined;
  switch (registrationResult) {
    case 'already-exists':
      responseDto = {
        code: SignUpResultCode.ALREADY_EXISTS
      };
      break;
    case 'insecure-password':
      throw new AppException(
        AppExceptionCodeEnum.BAD_REQUEST, 'Insecure password', 'error-stub');
      break;
    default:
      if (emailingEnabled) {
        responseDto = {
          code: SignUpResultCode.SUCCESS
        };
      } else {
        responseDto = {
          code: SignUpResultCode.AUTOVERIFIED
        };
      }
      break;
  }
  return responseDto;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: SignUpDtoSchema, captchaProtected: true });
