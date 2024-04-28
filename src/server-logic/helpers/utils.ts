import { Decimal } from 'decimal.js';
import { sha256 } from 'ohash';
import type { Price, EntityDataAttrsOnly, IFlight, IFlightOffer, IStayOffer } from './../../shared/interfaces';

export function normalizePrice (value: Price | number, numZeros: number): Price {
  const raw = Math.floor(value instanceof Decimal ? value.toNumber() : value);
  if (numZeros <= 0) {
    return new Decimal(raw);
  }
  const base = Math.pow(10, numZeros);
  const remainder = raw % base;
  const floor = raw - remainder;
  return new Decimal((remainder > base / 2) ? (floor + base) : floor);
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
