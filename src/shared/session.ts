import { type ISessionDto } from '../server/dto';
import { type SessionValues, type Session, type IConcurrentlyModifyingEntity } from './interfaces';

export function buildSessionDto (session: Omit<Session, keyof IConcurrentlyModifyingEntity>): ISessionDto {
  return {
    sessionId: session.sessionId,
    values: session.values
  };
}

export function parseSessionDto (dto: ISessionDto): Omit<Session, keyof IConcurrentlyModifyingEntity> {
  return {
    sessionId: dto.sessionId,
    values: dto.values
  };
}

export function getNewSessionValues (): SessionValues {
  return [];
}
