import { type EntityId, type EntityChangeNotificationSubscriptionOptions, type EntityChangeNotificationSubscriberId, type IEntityChangeNotificationTask, type IAppLogger, type IAppConfig, type EntityChangeNotificationCallback } from '../app-facade/interfaces';
import { type EntityModel, type IChangeDependencyTracker } from './change-dependency-tracker';
import { AppConfig, AppException, AppExceptionCodeEnum, newUniqueId } from '../app-facade/implementation';
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
    this.logger = logger;
    this.changeDependencyTracker = changeDependencyTracker;
    this.taskStatus = 'idle';
    this.lastChangedPagesRevision = dayjs().toDate();
    this.subscriptionsBySubscribers = new Map<EntityChangeNotificationSubscriberId, NotificationSubscription>([]);
  }

  subscribeForChanges = (options: EntityChangeNotificationSubscriptionOptions, callback: EntityChangeNotificationCallback): EntityChangeNotificationSubscriberId => {
    this.logger.verbose(`(EntityChangeNotificationTask) registering new subscriber, options=${JSON.stringify(options)}`);

    const orderIsUsed = [...this.subscriptionsBySubscribers.values()].some(s => s.options.order === options.order);
    if(orderIsUsed) {
      this.logger.warn(`(EntityChangeNotificationTask) failed to register new subsriber, order is already in use, order=${options.order}, options=${JSON.stringify(options)}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown server error', 'error-page');
    };

    const subscriberId = newUniqueId();
    const subscription: NotificationSubscription = {
      callback,
      subscriberId,
      options
    };
    this.subscriptionsBySubscribers.set(subscriberId, subscription);

    this.logger.verbose(`(EntityChangeNotificationTask) new subscriber registered, id=${subscriberId}, options=${JSON.stringify(options)}`);
    return subscriberId;
  };
  
  unsubscribeFromChanges = (subscriberId: EntityChangeNotificationSubscriberId): void => {
    this.logger.verbose(`(EntityChangeNotificationTask) removing subscriber, id=${subscriberId}`);
    if(this.subscriptionsBySubscribers.delete(subscriberId)) {
      this.logger.verbose(`(EntityChangeNotificationTask) subscriber removed, id=${subscriberId}`);
    } else {
      this.logger.warn(`(EntityChangeNotificationTask) subscriber was not found, id=${subscriberId}`);
    }
  };

  initialize = async (): Promise<void> => {
    this.logger.verbose('(EntityChangeNotificationTask) starting in background...');
    this.startTaskTimerLoop(AppConfig.caching.invalidation);
    this.logger.verbose('(EntityChangeNotificationTask) started');
  };

  startTaskTimerLoop = (options: NotificationOptions) => {
    this.logger.verbose(`(EntityChangeNotificationTask) starting notification task timer loop`, options);
    if(options.intervalSeconds > MaxTimerIntervalSec) {
      this.logger.warn(`(EntityChangeNotificationTask) too large interval value speficified - ${options.intervalSeconds}, max allowed = ${MaxTimerIntervalSec}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'incorrect server configuration', 'error-page');
    }
    scheduleTimer(() => this.notificationTimerCallback(options), options.intervalSeconds * 1000);
  };

  notificationTimerCallback = async (options: NotificationOptions): Promise<void> => {
    this.logger.verbose(`(EntityChangeNotificationTask) notification timer callback, current status=${this.taskStatus}`);
    if(this.taskStatus === 'in-progress') {
      this.logger.verbose(`(EntityChangeNotificationTask) skipping notification callback iteration - still in progress`);
      return;  
    }
    await this.runNotificationTaskOnce(options);
    this.logger.verbose(`(EntityChangeNotificationTask) notification timer callback completed, current status=${this.taskStatus}`);
  };

  runNotificationTaskOnce = async (options: NotificationOptions): Promise<void> => {
    const since = this.lastChangedPagesRevision;
    this.logger.verbose(`(EntityChangeNotificationTask) running notification task, current status=${this.taskStatus}, since=${since.toISOString()}`);
    this.taskStatus = 'in-progress';

    try {
      const MaxChangeEntitiesCount = options.maxChangedPagesForPurge * AverageEntityTypesPerPage;

      const now = dayjs().toDate();
      const newLastRevision = now;

      const changedEntities = await this.changeDependencyTracker.getChangedEntities(since, MaxChangeEntitiesCount);
      this.logger.debug(`(EntityChangeNotificationTask) list of changed entities obtained, since=${since.toString()}, count=${changedEntities.length}`);

      await this.executeNotificationCallbacks(changedEntities);

      const elapsedSecs = dayjs().diff(dayjs(now), 'second');
      this.lastChangedPagesRevision = newLastRevision;
      const logMsg = `(EntityChangeNotificationTask) notification task ran, elapsed ${elapsedSecs} secs., set revision=${newLastRevision.toISOString()}`;
      if(elapsedSecs > CleanTaskWarnTimeoutSecs) {
        this.logger.warn(logMsg);
      } else {
        this.logger.verbose(logMsg);
      }
    } catch(err: any) {
      this.logger.warn(`(EntityChangeNotificationTask) unexpected exception occured during notification task run, last revision=${this.lastChangedPagesRevision.toISOString()}`, err);
    } finally {
      this.taskStatus = 'idle';
    }
  };

  executeNotificationCallbacks = async (changedEntities: Awaited<ReturnType<IChangeDependencyTracker['getChangedEntities']>>): Promise<void> => {
    this.logger.debug(`(EntityChangeNotificationTask) executing notification callbacks, numChanges=${isString(changedEntities) ? changedEntities : changedEntities.length}`);

    const allSubscriptions = orderBy([...(this.subscriptionsBySubscribers.values())], s => s.options.order.valueOf());
    if(changedEntities == 'too-much') {
      for(let i = 0; i < allSubscriptions.length; i++) {
        const subscription = allSubscriptions[i];
        try {
          await subscription.callback(subscription.subscriberId, {
            target: 'too-much'
          });
        } catch(err: any) {
          this.logger.warn(`(EntityChangeNotificationTask) got exception while executing callback for subscriber, subscriberId=${subscription.subscriberId}, order=${subscription.options.order}`, err);
        }
      }
      this.logger.debug(`(EntityChangeNotificationTask) notification callbacks executed, numChanges=${changedEntities}`);
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
          this.logger.debug(`(EntityChangeNotificationTask) executing callback for subscription with [all] target, subscriberId=${subscription.subscriberId}, order=${subscription.options.order}, numChanges=${changedEntities.length}`);
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
          this.logger.debug(`(EntityChangeNotificationTask) executing callback for subscription with matched ids, subscriberId=${subscription.subscriberId}, order=${subscription.options.order}, stats=${JSON.stringify(subscriptionChanges.map(s => [s.entity, s.ids.length]))}, numChanges=${changedEntities.length}`);
          await subscription.callback(subscription.subscriberId, {
            target: subscriptionChanges
          });
        }
      } catch(err: any) {
        this.logger.warn(`(EntityChangeNotificationTask) got exception while executing subscription callback, subscriberId=${subscription.subscriberId}, order=${subscription.options.order}, numChanges=${changedEntities.length}`, err);
      }
    }

    this.logger.debug(`(EntityChangeNotificationTask) notification callbacks executed, numChanges=${isString(changedEntities) ? changedEntities : changedEntities.length}`);
  };
}
