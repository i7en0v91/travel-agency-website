import { AppConfig, AppException, AppExceptionCodeEnum, newUniqueId, type EntityId, type IAppLogger, type IAppConfig } from '@golobe-demo/shared';
import type { EntityChangeNotificationSubscriptionOptions, EntityChangeNotificationSubscriberId, IEntityChangeNotificationTask, EntityChangeNotificationCallback } from './../types';
import type { EntityModel, IChangeDependencyTracker } from './change-dependency-tracker';
import { setInterval as scheduleTimer } from 'timers';
import dayjs from 'dayjs';
import isString from 'lodash-es/isString';
import groupBy from 'lodash-es/groupBy';
import orderBy from 'lodash-es/orderBy';
import toPairs from 'lodash-es/toPairs';

const MaxTimerIntervalSec = 2147483;
const CleanTaskWarnTimeoutSecs = 10;
const AverageEntityTypesPerPage = 10;

declare type NotificationOptions = NonNullable<IAppConfig['caching']['invalidation']>;
declare type NotificationSubscription = {
  subscriberId: EntityChangeNotificationSubscriberId,
  options: EntityChangeNotificationSubscriptionOptions,
  callback: EntityChangeNotificationCallback
};

export class EntityChangeNotificationTask implements IEntityChangeNotificationTask {
  private readonly logger: IAppLogger;
  private readonly changeDependencyTracker: IChangeDependencyTracker;
  private lastChangedPagesRevision: Date;
  private taskStatus: 'idle' | 'in-progress';

  private subscriptionsBySubscribers: Map<EntityChangeNotificationSubscriberId, NotificationSubscription>;

  public static inject = ['changeDependencyTracker', 'logger'] as const;
  constructor (changeDependencyTracker: IChangeDependencyTracker, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'EntityChangeNotificationTask' });
    this.changeDependencyTracker = changeDependencyTracker;
    this.taskStatus = 'idle';
    this.lastChangedPagesRevision = dayjs().toDate();
    this.subscriptionsBySubscribers = new Map<EntityChangeNotificationSubscriberId, NotificationSubscription>([]);
  }

  subscribeForChanges = (options: EntityChangeNotificationSubscriptionOptions, callback: EntityChangeNotificationCallback): EntityChangeNotificationSubscriberId => {
    this.logger.verbose('registering new subscriber', options);

    const orderIsUsed = Array.from(this.subscriptionsBySubscribers.values()).some(s => s.options.order === options.order);
    if(orderIsUsed) {
      this.logger.warn('failed to register new subsriber, order is already in use', undefined, { order: options.order, options });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown server error', 'error-page');
    };

    const subscriberId = newUniqueId();
    const subscription: NotificationSubscription = {
      callback,
      subscriberId,
      options
    };
    this.subscriptionsBySubscribers.set(subscriberId, subscription);

    this.logger.verbose('new subscriber registered', { id: subscriberId, options });
    return subscriberId;
  };
  
  unsubscribeFromChanges = (subscriberId: EntityChangeNotificationSubscriberId): void => {
    this.logger.verbose('removing subscriber', { id: subscriberId });
    if(this.subscriptionsBySubscribers.delete(subscriberId)) {
      this.logger.verbose('subscriber removed', { id: subscriberId });
    } else {
      this.logger.warn('subscriber was not found', undefined, { id: subscriberId });
    }
  };

  initialize = async (): Promise<void> => {
    this.logger.verbose('starting in background');
    this.startTaskTimerLoop(AppConfig.caching.invalidation);
    this.logger.verbose('started');
  };

  startTaskTimerLoop = (options: NotificationOptions) => {
    this.logger.verbose('starting notification task timer loop');
    if(options.intervalSeconds > MaxTimerIntervalSec) {
      this.logger.warn('too large interval value speficified', undefined, { interval: options.intervalSeconds, maxInterval: MaxTimerIntervalSec });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'incorrect server configuration', 'error-page');
    }
    scheduleTimer(() => this.notificationTimerCallback(options), options.intervalSeconds * 1000);
  };

  notificationTimerCallback = async (options: NotificationOptions): Promise<void> => {
    this.logger.verbose('notification timer callback, current', { status: this.taskStatus });
    if(this.taskStatus === 'in-progress') {
      this.logger.verbose('skipping notification callback iteration - still in progress');
      return;  
    }
    await this.runNotificationTaskOnce(options);
    this.logger.verbose('notification timer callback completed, current', { status: this.taskStatus });
  };

  runNotificationTaskOnce = async (options: NotificationOptions): Promise<void> => {
    const since = this.lastChangedPagesRevision;
    this.logger.verbose('running notification task, current', { status: this.taskStatus, since: since.toISOString() });
    this.taskStatus = 'in-progress';

    try {
      const MaxChangeEntitiesCount = options.maxChangedPagesForPurge * AverageEntityTypesPerPage;

      const now = dayjs().toDate();
      const newLastRevision = now;

      const changedEntities = await this.changeDependencyTracker.getChangedEntities(since, MaxChangeEntitiesCount);
      this.logger.debug('list of changed entities obtained', { since: since.toString(), count: changedEntities.length });

      await this.executeNotificationCallbacks(changedEntities);

      const elapsedSecs = dayjs().diff(dayjs(now), 'second');
      this.lastChangedPagesRevision = newLastRevision;
      if(elapsedSecs > CleanTaskWarnTimeoutSecs) {
        this.logger.warn('notification task ran', undefined, { elapsedSec: elapsedSecs, revision: newLastRevision.toISOString() });
      } else {
        this.logger.verbose('notification task ran', { elapsedSec: elapsedSecs, revision: newLastRevision.toISOString() });
      }
    } catch(err: any) {
      this.logger.warn('unexpected exception occured during notification task run, last', err, { revision: this.lastChangedPagesRevision.toISOString() });
    } finally {
      this.taskStatus = 'idle';
    }
  };

  executeNotificationCallbacks = async (changedEntities: Awaited<ReturnType<IChangeDependencyTracker['getChangedEntities']>>): Promise<void> => {
    const numChanges = isString(changedEntities) ? changedEntities : changedEntities.length;
    this.logger.debug('executing notification callbacks', numChanges);

    const allSubscriptions = orderBy(Array.from(this.subscriptionsBySubscribers.values()), s => s.options.order.valueOf());
    if(changedEntities == 'too-much') {
      for(let i = 0; i < allSubscriptions.length; i++) {
        const subscription = allSubscriptions[i];
        try {
          await subscription.callback(subscription.subscriberId, {
            target: 'too-much'
          });
        } catch(err: any) {
          this.logger.warn('got exception while executing callback for subscriber', err, { subscriberId: subscription.subscriberId, order: subscription.options.order });
        }
      }
      this.logger.debug('notification callbacks executed', { numChanges: changedEntities });
      return;
    }

    const changesByEntity = toPairs(groupBy(changedEntities, e => e.entity)).map(t => {
      return {
        entity: t[0] as EntityModel,
        ids: t[1].map(x => x.id as EntityId),
        idSet: new Set<EntityId>(t[1].map(x => x.id as EntityId))
      };
    });
    for(let i = 0; i < allSubscriptions.length; i++) {
      const subscription = allSubscriptions[i];
      try {
        if(subscription.options.target === 'all') {
          this.logger.debug('executing callback for subscription with [all] target', { subscriberId: subscription.subscriberId, order: subscription.options.order, numChanges: changedEntities.length });
          await subscription.callback(subscription.subscriberId, {
            target: changesByEntity
          });
          continue;
        }
        
        const subscriptionChanges: { entity: EntityModel; ids: EntityId[]; }[] = [];
        for(let j = 0; j < changesByEntity.length; j++) {
          const changes = changesByEntity[j];
          const targetIdsOptions = (subscription.options.target.find(t => t.entity === changes.entity))?.ids;
          if(!targetIdsOptions) {
            continue;
          }

          if(targetIdsOptions === 'all') {
            subscriptionChanges.push({
              entity: changes.entity,
              ids: changes.ids
            });
            continue;
          }

          const matchedIds = targetIdsOptions.filter(id => changes.idSet.has(id));
          if(matchedIds.length) {
            subscriptionChanges.push({
              entity: changes.entity,
              ids: matchedIds
            });
          }
        }

        if(subscriptionChanges.some(s => s.ids.length > 0)) {
          this.logger.debug('executing callback for subscription with matched ids', { subscriberId: subscription.subscriberId, order: subscription.options.order, numChanges: changedEntities.length });
          await subscription.callback(subscription.subscriberId, {
            target: subscriptionChanges
          });
        }
      } catch(err: any) {
        this.logger.warn('got exception while executing subscription callback', err, { subscriberId: subscription.subscriberId, order: subscription.options.order, numChanges: changedEntities.length });
      }
    }

    this.logger.debug('notification callbacks executed', numChanges);
  };
}
