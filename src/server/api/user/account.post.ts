import isString from 'lodash/isString';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type IUpdateAccountDto, UpdateAccountDtoSchema, type IUpdateAccountResultDto, UpdateAccountResultCode } from '../../dto';
import { type Locale, type Theme } from '../../../shared/constants';
import { type EntityId } from '../../../shared/interfaces';
import { getServerSession } from '#auth';

export default defineWebApiEventHandler(async (event) => {
  const userLogic = ServerServicesLocator.getUserLogic();

  const updateAccountDto = await readBody(event) as IUpdateAccountDto;
  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

  const updateResult = await userLogic.updateUserAccount(userId, updateAccountDto.firstName, updateAccountDto.lastName, updateAccountDto.password, updateAccountDto.emails?.map(e => e?.trim()), updateAccountDto.theme as Theme, updateAccountDto.locale as Locale);
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
}, { logResponseBody: true, authorizedOnly: true, validationSchema: UpdateAccountDtoSchema, captchaProtected: true });
