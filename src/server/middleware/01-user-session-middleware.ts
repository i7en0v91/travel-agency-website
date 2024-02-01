import { H3Event } from 'h3';
import { initializeSession, getSession } from '../../server-logic/session/server';
import { WebApiRoutes } from '../../shared/constants';
import { getServerSession } from '#auth';

async function updateSessionUser (event: H3Event): Promise<void> {
  try {
    let userId = ((await getServerSession(event)) as any)?.id;
    if (userId) {
      userId = parseInt(userId);
      const sessionId = await getSession(event).sessionId;
      const sessionLogic = ServerServicesLocator.getSessionLogic();
      await sessionLogic.setSessionUser(sessionId, userId);
    }
  } catch (err: any) {
    const logger = ServerServicesLocator.getLogger();
    logger.warn('(user-session-middleware) failed to update session user', err);
  }
}

export default defineEventHandler(async (event) => {
  try {
    if (event.path.startsWith(`${WebApiRoutes.Logging}`) ||
    // auth endpoints are handled by thrid-party nuxt-auth code
        event.path.startsWith(`${WebApiRoutes.Authentication}`)) {
      return;
    }

    if ((globalThis as any).ServerServicesLocator) {
      await initializeSession(event);
      await updateSessionUser(event);
    }
  } catch (err: any) {
    // errors in middleware wont be intercepted by standard hooks
    const logger = CommonServicesLocator.getLogger();
    logger?.error('(user-session-middleware) failed to initialize session', err);
  }
});
