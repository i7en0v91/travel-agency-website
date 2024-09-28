import { type EntityDataAttrsOnly, type IFlight, type IFlightOffer, type IStayOffer } from '@golobe-demo/shared';
import { sha256 } from 'ohash';
import { randomBytes } from 'crypto';

export const ImageCategoryInfosCacheKey = 'ImageCategoryInfos';
export const AllAirlineCompaniesCacheKey = 'AllAirlineCompanies';
export const AllAirplanesCacheKey = 'AllAirplanes';
export const NearestAirlineCompanyCacheKey = 'NearestAirlineCompany';

export function getSomeSalt (): string {
  return randomBytes(12).toString('base64');
}

export function calculatePasswordHash (password: string): string {
  return sha256(password);
};

export function verifyPassword (password: string, salt: string, expectedHash: string) {
  return expectedHash === calculatePasswordHash(`${salt}${password}`);
}

/***
   * Creates a unique string from @param flight data which can be used to identify the flight
   */
export function buildFlightUniqueDataKey (flight: EntityDataAttrsOnly<IFlight>): string {
  const strData = `F-${flight.departAirport.id}-${flight.arriveAirport.id}-${Math.floor(flight.departTimeUtc.getTime() / 60000)}-${Math.floor(flight.arriveTimeUtc.getTime() / 60000)}-${flight.airlineCompany.id}-${flight.airplane.id}`;
  return sha256(strData);
};

/***
 * Creates a unique string from @param offer data which can be used to identify the offer
 */
export function buildFlightOfferUniqueDataKey (offer: EntityDataAttrsOnly<IFlightOffer>): string {
  const strData = `FO-${buildFlightUniqueDataKey(offer.departFlight)}-${offer.arriveFlight ? buildFlightUniqueDataKey(offer.arriveFlight) : '0'}-${offer.class}-${offer.numPassengers}`;
  return sha256(strData);
}

/***
 * Creates a unique string from @param offer data which can be used to identify the offer
 */
export function buildStayOfferUniqueDataKey (offer: EntityDataAttrsOnly<IStayOffer>): string {
  const strData = `SO-${offer.stay.id}-${Math.floor(offer.checkIn.getTime() / 60000)}-${Math.floor(offer.checkOut.getTime() / 60000)}-${offer.numGuests}-${offer.numRooms}`;
  return sha256(strData);
}
