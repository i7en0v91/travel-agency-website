import { parseSessionDto } from '../../shared/session';
import { setAllValues, setValue } from '../../server-logic/session/server';
import { defineWebApiEventHandler } from './../utils/webapi-event-handler';
import { type ISessionDto, SessionDtoSchema } from './../dto';

export default defineWebApiEventHandler(async (event) => {
  const query = getQuery(event);
  const key = query.key as string;
  if (key) {
    const value = await readBody(event);
    await setValue(event, key, value ?? null);
  } else {
    const sessionDto = await readBody(event) as ISessionDto;
    const session = parseSessionDto(sessionDto);
    await setAllValues(event, session.values);
  }
}, { logResponseBody: false, authorizedOnly: false, validationSchema: SessionDtoSchema });
