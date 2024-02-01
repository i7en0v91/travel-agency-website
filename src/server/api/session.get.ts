import { buildSessionDto } from '../../shared/session';
import { getSession } from '../../server-logic/session/server';
import { defineWebApiEventHandler } from './../utils/webapi-event-handler';
import { type ISessionDto } from './../dto';

export default defineWebApiEventHandler(async (event) => {
  const responseDto: ISessionDto = buildSessionDto(await getSession(event));
  return responseDto;
}, { logResponseBody: true, authorizedOnly: false });
