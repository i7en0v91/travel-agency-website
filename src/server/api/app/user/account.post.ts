import { type EntityId, AppException, AppExceptionCodeEnum, type Locale, type Theme } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { extractUserIdFromSession } from './../../../utils/auth';
import { type IUpdateAccountDto, UpdateAccountDtoSchema, type IUpdateAccountResultDto, UpdateAccountResultCode } from '../../../api-definitions';
import { getServerSession } from '#auth';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event) => {
  const userLogic = getServerServices()!.getUserLogic();

  const updateAccountDto = await readBody(event) as IUpdateAccountDto;
  const authSession = await getServerSession(event);
  const userId: EntityId | undefined = extractUserIdFromSession(authSession);
  if (!userId) {
    throw new AppException(
      AppExceptionCodeEnum.UNAUTHENTICATED,
      'authorization required to access',
      'error-stub'
    );
  }

  const updateResult = await userLogic.updateUserAccount(userId, updateAccountDto.firstName, updateAccountDto.lastName, updateAccountDto.password, updateAccountDto.emails?.map(e => e?.trim()), updateAccountDto.theme as Theme, updateAccountDto.locale as Locale, event);
  let responseDto: IUpdateAccountResultDto | undefined;
  switch (updateResult) {
    case 'email-already-exists':
      responseDto = {
        code: UpdateAccountResultCode.EMAIL_ALREADY_EXISTS
      };
      break;
    case 'deleting-last-email':
      responseDto = {
        code: UpdateAccountResultCode.DELETING_LAST_EMAIL
      };
      break;
    case 'email-autoverified':
      responseDto = {
        code: UpdateAccountResultCode.EMAIL_AUTOVERIFIED
      };
      break;
    default:
      responseDto = {
        code: UpdateAccountResultCode.SUCCESS
      };
      break;
  }
  return responseDto;
}, { logResponseBody: false, authorizedOnly: true, validationSchema: UpdateAccountDtoSchema, captchaProtected: true });
