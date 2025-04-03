import { type Theme, type Locale, type IOfferBookingData, type IImageEntitySrc, type IAppLogger, AppException, AppExceptionCodeEnum, type StayServiceLevel, type EntityId, type OfferKind, ImageCategory } from '@golobe-demo/shared';
import { ApiEndpointUserTickets, type IBookingDetailsDto, type IToggleFavouriteOfferResultDto, type IImageUploadResultDto, type IUserAccountDto, UpdateAccountResultCode, ApiEndpointBookingDetails, ApiEndpointStayOfferFavourite, ApiEndpointFlightOfferFavourite, ApiEndpointUserImageUpload, ApiEndpointUserAccount, type IUpdateAccountDto, type IUpdateAccountResultDto, type IBookingResultDto, ApiEndpointFlightOfferBook, ApiEndpointStayOfferBook, type IUserTicketsResultDto, ApiEndpointUserFavourites, type IUserFavouritesResultDto } from './../server/api-definitions';
import { buildStoreDefinition, type PublicStore } from './../helpers/stores/pinia';
import { LOADING_STATE, StoreKindEnum } from './../helpers/constants';
import { mapBookingDetails } from './../helpers/entity-mappers';
import { getObject, post } from './../helpers/rest-utils';
import assign from 'lodash-es/assign';
import set from 'lodash-es/set';
import deepmerge from 'lodash-es/merge';
import omit from 'lodash-es/omit';

export declare type UserUpdateData = { 
  firstName?: string, 
  lastName?: string,
  password?: string,
  emails?: string[] 
};

export declare type UserUpdateSkipped = false;

declare type LOADING = typeof LOADING_STATE;

type UserImageUploadData = { 
  content: Buffer,
  category: ImageCategory,
  name?: string
}

type BookingOfferInfo = {
  offerKind: OfferKind,
  id: EntityId
};

interface IUserAccount {
  firstName: string | null,
  lastName: string | null,
  emails: string[],
  cover: IImageEntitySrc | null,
  avatar: IImageEntitySrc | null
}

declare type NuxtAuthStatus = ReturnType<typeof useAuth>['status']['value'];
declare type BookStatus = 'pending' | 'success' | 'error';
declare type NewBookingState<TOffer extends OfferKind> = 
(
  TOffer extends 'flights' ? IOfferBookingData<'flights'> :
  TOffer extends 'stays' ? IOfferBookingData<'stays'> :
  undefined
) & { status: BookStatus };
  
type UserBookingInfo = {
  offerId: EntityId,
  bookedTimestamp: number,
  bookingId: string
};
declare type State = {
  s_authStatus: NuxtAuthStatus | undefined,
  s_userId: EntityId | undefined,
  s_userInfo: IUserAccount | undefined,
  s_favourites: { [P in OfferKind]: EntityId[] } | undefined,
  s_bookings: UserBookingInfo[] | undefined,
  s_newBookingStates: ({ [P in OfferKind]: (NewBookingState<P> | null) }) | undefined
};

const StoreId = StoreKindEnum.UserAccount;

function throwIfExecutingActionOnServer() {
  if(import.meta.server) {
    const store = useUserAccountStore();
    store.getLogger().error('operations with user via store is not possible on server');
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'illegal operation', 'error-page');
  }
}

async function sendFetchBookingRequest (bookingId: EntityId, logger: IAppLogger): Promise<BookingOfferInfo> {
  const resultDto = await getObject<IBookingDetailsDto>(`/${ApiEndpointBookingDetails(bookingId)}`, undefined, 'no-store', true, undefined, 'throw');
  if (!resultDto) {
    logger.warn('exception occured while sending fetch booking HTTP request', undefined, { bookingId });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }
  const result = mapBookingDetails(resultDto);

  logger.verbose('fetch booking offer info HTTP request completed', { result });
  return {
    id: result.offer.id,
    offerKind: result.offer.kind
  };
}

async function sendBookOfferRequest (offerId: EntityId, kind: OfferKind, serviceLevel: StayServiceLevel | undefined, logger: IAppLogger): Promise<EntityId> {
  const url = kind === 'flights' ? `/${ApiEndpointFlightOfferBook(offerId)}` : `/${ApiEndpointStayOfferBook(offerId)}`;
  const resultDto = await post(url, serviceLevel ? { serviceLevel } : undefined, undefined, undefined, true, undefined, 'default');
  if (!resultDto) {
    logger.warn('exception occured while sending create booking HTTP request', undefined, { offerId, kind });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }

  const bookingId = (resultDto as IBookingResultDto).bookingId;
  logger.verbose('create booking HTTP request completed', { offerId, kind, bookingId });
  
  return bookingId;
}

async function sendToggleFavouriteRequest(kind: OfferKind, offerId: EntityId, logger: IAppLogger): Promise<boolean> {
  const resultDto = await post(
    kind === 'flights' ? 
    `/${ApiEndpointFlightOfferFavourite(offerId)}` : 
    `/${ApiEndpointStayOfferFavourite(offerId)}`, 
    undefined, undefined, undefined, true, undefined, 'default') as IToggleFavouriteOfferResultDto;
  if (!resultDto) {
    logger.warn('exception occured while sending toggle offer HTTP request', undefined, { offerId, kind });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }
  const isFavourite = resultDto.isFavourite;
  logger.verbose('send toggle favourite offer HTTP request completed', { offerId, kind, isFavourite });
  return isFavourite;
}

async function sendUploadImageRequest(
  uploadData: UserImageUploadData,
  logger: IAppLogger
): Promise<IImageEntitySrc> {
  logger.info('sending upload image request', { uploadData });
  const store = useUserAccountStoreInternal();
  if(!store.isAuthenticated) {
    logger.warn('cannot upload image, user is unauthenticated', undefined, { uploadData });
    throw new AppException(AppExceptionCodeEnum.UNAUTHENTICATED, 'failed to upload user image', 'error-page');
  }

  const query = (uploadData.name?.length ?? 0) > 0 ? { fileName: uploadData.name, category: uploadData.category } : undefined;
  const uploadResultDto = (await post<any, IImageUploadResultDto>(`/${ApiEndpointUserImageUpload}`, query, uploadData.content, undefined, true, undefined, 'throw'))!;
  const uploadedImageInfo: IImageEntitySrc = {
    slug: uploadResultDto.slug,
    timestamp: uploadResultDto.timestamp
  };
  logger.verbose('image upload request completed', { uploadData, result: uploadedImageInfo });

  return uploadedImageInfo;
}

async function sendUpdateRequest (
  updateData: UserUpdateData, 
  captchaToken: string,
  locale: Locale,
  theme: Theme,
  logger: IAppLogger
): Promise<UpdateAccountResultCode> {
  logger.info('sending user account update request', { updateData });
  
  const dto: IUpdateAccountDto = {
    ...updateData,
    captchaToken,
    locale,
    theme
  };

  const resultDto = await post(`/${ApiEndpointUserAccount}`, undefined, dto, undefined, true, undefined, 'throw') as IUpdateAccountResultDto;
  logger.verbose('user account update request completed', { resultDto });
  return resultDto.code;
}

function mapUserAccountDto(dto: IUserAccountDto): Partial<IUserAccount> {
  return {
    firstName: dto.firstName,
    lastName: dto.lastName,
    emails: dto.emails,
    avatar: dto.avatarSlug ? { slug: dto.avatarSlug, timestamp: dto.avatarTimestamp } : undefined,
    cover: dto.coverSlug ? { slug: dto.coverSlug, timestamp: dto.coverTimestamp } : undefined
  };
};

function getUnauthenticatedState(): State {
  return {
    s_authStatus: undefined,
    s_userId: undefined,
    s_userInfo: undefined,
    s_bookings: undefined,
    s_favourites: undefined,
    s_newBookingStates: undefined
  };
}

const storeDefBuilder = () => buildStoreDefinition(StoreId, 
  (clientSideOptions) => { 
    // TODO: uncomment preview state
    // const { enabled } = usePreviewState();
    const enabled = false;

    const nuxtApp = clientSideOptions.nuxtApp;
    const getCurrentLocale = () => (nuxtApp.$i18n as ReturnType<typeof useI18n>).locale.value as Locale;

    const userDataFetch = 
      useFetch(`/${ApiEndpointUserAccount}`, {
        server: false,
        lazy: true,
        immediate: false,
        cache: 'no-store',
        dedupe: 'cancel',
        transform: mapUserAccountDto,
        method: 'GET' as const,
        $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-stub' })
      });
    
    const userTicketsFetch =
      useFetch(`/${ApiEndpointUserTickets}`, {
        server: false,
        lazy: true,
        immediate: false,
        cache: 'no-store',
        dedupe: 'cancel',
        method: 'GET' as const,
        transform: (resultDto): { flights: UserBookingInfo[], stays: UserBookingInfo[] } => { 
          const typedDto = resultDto as IUserTicketsResultDto;
          return {
            flights: typedDto.flights,
            stays: typedDto.stays
          };
        },
        $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-stub' })
      });

    const userFavouritesFetch =
      useFetch(`/${ApiEndpointUserFavourites}`, {
        server: false,
        lazy: true,
        immediate: false,
        cache: 'no-store',
        dedupe: 'cancel',
        method: 'GET' as const,
        transform: (resultDto): { [P in OfferKind]: EntityId[] } => { 
          const typedDto = resultDto as IUserFavouritesResultDto;
          return {
            flights: typedDto.flightIds,
            stays: typedDto.stayIds
          };
        },
        $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-stub' })
      });

    const authStatus: Ref<ReturnType<typeof useAuth>['status']['value']> = ref('unauthenticated');
    const authSyncTrigger = ref(0);
    let authSessionInitialized = false;
    
    const { status, data, getSession } = useAuth();
    watch([status, data, authSyncTrigger], async () => {
      if(!authSessionInitialized) {
        authSessionInitialized = true;
        if(status.value === 'unauthenticated') {
          getSession({ force: true });
          return;
        }
      }

      authStatus.value = status.value;
      const store = useUserAccountStoreInternal();
      store.syncAuthStatus({ 
        newAuthStatus: status.value, 
        userId: (data.value as any)?.id as EntityId 
      });
    }, { immediate: false });
    
    watch(userDataFetch.status, () => {
      const store = useUserAccountStoreInternal();
      switch(userDataFetch.status.value) {
        case 'success':
          store.userDataFetchSucceeded(userDataFetch.data.value!);
          break;
        case 'error':
          store.userDataFetchFailed(userDataFetch.error.value);
          break;
      }
    }, { immediate: false });

    watch(userTicketsFetch.status, () => {
      const store = useUserAccountStoreInternal();
      switch(userTicketsFetch.status.value) {
        case 'success':
          store.userTicketsFetchSucceeded([
            ...userTicketsFetch.data.value!.flights, 
            ...userTicketsFetch.data.value!.stays
          ]);
          break;
        case 'error':
          store.userTicketsFetchFailed(userTicketsFetch.error.value);
          break;
      }
    }, { immediate: false });

    watch(userFavouritesFetch.status, () => {
      const store = useUserAccountStoreInternal();
      switch(userFavouritesFetch.status.value) {
        case 'success':
          store.userFavouritesFetchSucceeded(userFavouritesFetch.data.value!);
          break;
        case 'error':
          store.userFavouritesFetchFailed(userFavouritesFetch.error.value);
          break;
      }
    }, { immediate: false });

    return {
      getCurrentLocale,
      authStatus,
      userDataFetch,
      userTicketsFetch,
      userFavouritesFetch,
      authSyncTrigger
    };
  },
  {
    state: (): State => {
      return getUnauthenticatedState();
    },
    getters: {
      /**
       * User entity id (if authenticated). 
       * On server side this store always consider user as unauthenticated
       * @see isAuthenticated
       */
      userId(): EntityId | undefined {
        if(import.meta.server) {
          return undefined;
        }

        if(!this.isAuthenticated) {
          return undefined;
        }
        return this.s_userId;
      },

      /**
       * Whether user is logged into the system with personal credentials.
       * On server side this store always consider user as unauthenticated
       */
      isAuthenticated(): boolean {
        if(import.meta.server) {
          return false;
        }

        return this.clientSetupVariables().authStatus.value === 'authenticated';
      },

      /**
       * User first/last name. {@constant undefined} if not {@link isAuthenticated}
       **/
      name(): { firstName: string | null, lastName: string | null } | LOADING | undefined {
        if(!this.isAuthenticated) {
          return undefined;
        }

        return this.s_userInfo !== undefined ? {
          firstName: this.s_userInfo.firstName,
          lastName: this.s_userInfo.lastName,
        } : LOADING_STATE;
      },

      /**
       * User emails. {@constant undefined} if not {@link isAuthenticated}
       */
      emails(): string[] | LOADING | undefined {
        if(!this.isAuthenticated) {
          return undefined;
        }

        return this.s_userInfo !== undefined ? this.s_userInfo.emails : LOADING_STATE;
      },

      /**
       * User avatar. {@constant null} if not added, {@constant undefined} if not {@link isAuthenticated}
       */
      avatar(): IImageEntitySrc | null | LOADING | undefined {
        if(!this.isAuthenticated) {
          return undefined;
        }

        return this.s_userInfo !== undefined ? this.s_userInfo.avatar : LOADING_STATE;
      },

      /**
       * User cover. {@constant null} if not added, {@constant undefined} if not {@link isAuthenticated}
       */
      cover(): IImageEntitySrc | null | LOADING | undefined {
        if(!this.isAuthenticated) {
          return undefined;
        }

        return this.s_userInfo !== undefined ? this.s_userInfo.cover : LOADING_STATE;
      },

      /**
       * Offers marked as user's favourite. {@constant undefined} if not {@link isAuthenticated}
       */
      favourites(): { [P in OfferKind]: EntityId[] } | LOADING | undefined {
        if(!this.isAuthenticated) {
          return undefined;
        }

        return this.s_favourites !== undefined ? {
          flights: [...this.s_favourites.flights],
          stays: [...this.s_favourites.stays]
        } : LOADING_STATE;
      },

      /**
       * Offers booked by user. {@constant undefined} if not {@link isAuthenticated}
       */
      bookings(): UserBookingInfo[] | LOADING | undefined {
        if(!this.isAuthenticated) {
          return undefined;
        }

        return this.s_bookings !== undefined ? this.s_bookings : LOADING_STATE;
      },
    },
    actions: {
      /**
       * Updates user personal information
       * @param captchaToken - although method is available for authenticated users only,
       * additional verification may be useful as changing some personal data fields, 
       * e.g. emails, triggers external services (e.g. SMTP client).
       * KB: param naming is important, {@link IAppConfig.logging.common.redact}
       * @returns update result code or {@link UserUpdateSkipped} in case update fails 
       * but user is not interested in result of this updates anymore
       */
      async changePersonalInfo(updateFields: UserUpdateData, captchaToken: string): Promise<UpdateAccountResultCode | UserUpdateSkipped> {
        throwIfExecutingActionOnServer();        

        const locale = this.clientSetupVariables().getCurrentLocale();
        const theme = useThemeSettings().currentTheme.value;
        const updateData: UserUpdateData = {
          ...updateFields,
          firstName: updateFields.firstName,
          lastName: updateFields.lastName,
          password: updateFields.password,
          emails: updateFields.emails
        };

        try {
          const resultCode = await sendUpdateRequest(updateData, captchaToken, locale, theme, this.getLogger());
          this.updateRequestSucceeded({ updateData, resultCode });
          return resultCode;
        } catch(err: any) {
          if(!this.updateRequestFailed({ updateData, err })) {
            if(err) {
              throw err;
            } else {
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'user image upload request failed', 'error-stub');
            }
          }
          return false;
        }
      },

      /**
      * Uploads user avatar image
      * @returns uploaded entity url information or {@link UserUpdateSkipped} in case upload fails 
      * but user is not interested in result of this upload anymore
      */
      async uploadAvatar(fileContent: Buffer, fileName?: string): Promise<IImageEntitySrc | UserUpdateSkipped> {
        throwIfExecutingActionOnServer();

        const uploadData: UserImageUploadData = {
          content: fileContent, 
          name: fileName,
          category: ImageCategory.UserAvatar,
        };
        try {
          const result = await sendUploadImageRequest(
            uploadData,
            this.getLogger()
          );
          this.uploadImageRequestSucceeded({ uploadData, result });
          return result;
        } catch(err: any) {
          if(!this.uploadImageRequestFailed({ uploadData, err })) {
            if(err) {
              throw err;
            } else {
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'user image upload request failed', 'error-stub');
            }
          }
          return false;
        }
      },

      /**
       * Uploads user cover image
       * @returns uploaded entity url information or {@link UserUpdateSkipped} in case upload fails 
       * but user is not interested in result of this upload anymore
       */
      async uploadCover(fileContent: Buffer, fileName?: string): Promise<IImageEntitySrc | UserUpdateSkipped> {
        throwIfExecutingActionOnServer();
        
        const uploadData: UserImageUploadData = {
          content: fileContent, 
          name: fileName,
          category: ImageCategory.UserCover,
        };
        try {
          const result = await sendUploadImageRequest(
            uploadData,
            this.getLogger()
          );
          this.uploadImageRequestSucceeded({ uploadData, result });
          return result;
        } catch(err: any) {
          if(!this.uploadImageRequestFailed({ uploadData, err })) {
            if(err) {
              throw err;
            } else {
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'user image upload request failed', 'error-stub');
            }
          }
          return false;
        }
      },

      /**
       * Books specified {@link offerId} for authenticated user
       * @returns new booking entity id or {@link UserUpdateSkipped} in case booking fails 
       * but user is not interested in result of the book operation anymore
       */
      async bookOffer<TOffer extends OfferKind>(bookingData: IOfferBookingData<TOffer>): Promise<EntityId | UserUpdateSkipped> {
        throwIfExecutingActionOnServer();

        const logger = this.getLogger();
        this.setStartBookingState(bookingData);
        if(!this.s_newBookingStates || (this.s_newBookingStates[bookingData.kind]?.status !== 'pending')) {
          logger.warn('failed to setup new booking operation', undefined, { bookingData });  
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to setup new booking operation', 'error-stub');
        }

        let bookingId: EntityId | undefined;
        try {
          bookingId = await sendBookOfferRequest(
            bookingData.offerId!, 
            bookingData.kind, 'serviceLevel' in bookingData ? bookingData.serviceLevel : undefined, 
            logger
          );
          this.offerBookRequestSucceeded({
            kind: bookingData.kind, 
            bookInfo: {
              offerId: bookingData.offerId,
              bookingId: bookingId,
              bookedTimestamp: new Date().getTime() // approximate for sorting
            }
          });
          return bookingId;
        } catch(err: any) {
          if(!this.offerBookRequestFailed({ bookingData, err })) {
            if(err) {
              throw err;
            } else {
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'booking operation failed', 'error-stub');
            }
          }
          return false;
        }
      },

      /**
       * Loads offer info for specified {@link bookingId} (if user has access to it)
       */
      async getBookingOfferInfo(bookingId: EntityId): Promise<BookingOfferInfo> {
        throwIfExecutingActionOnServer();
        
        return await sendFetchBookingRequest(bookingId, this.getLogger());
      },

      /**
       * Toggles offer's favourite status for authenticated user
       */
      async toggleFavourite(offerKind: OfferKind, offerId: EntityId): Promise<void> {
        throwIfExecutingActionOnServer();

        try {
          const isFavourite = await sendToggleFavouriteRequest(
            offerKind,
            offerId,
            this.getLogger()
          );
          this.toggleFavouriteRequestSucceeded({ kind: offerKind, offerId, isFavourite });
        } catch(err: any) {
          if(!this.toggleFavouriteRequestFailed({ kind: offerKind, offerId, err })) {
            if(err) {
              throw err;
            } else {
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'toggle favourite request failed', 'error-stub');
            }
          }
        }
      },
    },
    patches: {
      setStartBookingState(args: IOfferBookingData<OfferKind>) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('cannot start new book operation, user is unauthenticated', undefined, { args });  
          throw new AppException(AppExceptionCodeEnum.UNAUTHENTICATED, 'cannot start new book operation', 'error-stub');
        }

        if(
          this.s_newBookingStates && 
          this.s_newBookingStates[args.kind]?.status === 'pending'
        ) {
          logger.warn('skipping new book operation as there is one already pending', undefined, { args, pending: this.s_newBookingStates[args.kind] });  
          return;
        }

        const newState = args.kind === 'flights' ?
          ({
            ...args,
            status: 'pending'
          } as NewBookingState<'flights'>) :
          ({
            ...args,
            status: 'pending'
          } as NewBookingState<'stays'>);
        logger.verbose('starting new book operation', { newState });
        this.$patch((s) => { 
          s.s_newBookingStates ??= {
            flights: null,
            stays: null
          };
          set(s.s_newBookingStates!, args.kind, newState);
        });
      },

      offerBookRequestSucceeded(args: { kind: OfferKind, bookInfo: UserBookingInfo }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('booking request successed, but user became unauthenticated', undefined, { args }); 
          return;
        }

        logger.verbose('updating model with new booking', { args });
        this.$patch((s) => { 
          if(!s.s_bookings!.some(x => x.bookingId === args.bookInfo.bookingId)) {
            s.s_bookings!.push(args.bookInfo);
          } else {
            logger.warn('updating model with new booking completed with issues - booking has been already added', undefined, { args });
          }

          if(s.s_newBookingStates && s.s_newBookingStates[args.kind]?.status === 'pending') {
            s.s_newBookingStates[args.kind]!.status = 'success';
          } else {
            logger.warn('updating model with new booking completed with issues as it is not in pending state', undefined, { args });
          }
        });        
      },

      offerBookRequestFailed(args: {
        bookingData: IOfferBookingData<OfferKind>,
        err: any
      }): boolean {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('booking request failed, but user became unauthenticated', args.err, { bookingData: args.bookingData }); 
          return true;
        }

        logger.warn('booking request failed', args.err, { bookingData: args.bookingData });
        const kind = args.bookingData.kind;
        this.$patch((s) => { 
          if(!s.s_newBookingStates) {
            s.s_newBookingStates = {
              flights: null,
              stays: null
            };
          }
          s.s_newBookingStates[kind]!.status = 'error';
        });        
        return false;
      },

      userTicketsFetchSucceeded(bookings: UserBookingInfo[]) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('user tickets fetch request succeeded, but user became unauthenticated'); 
          return;
        }

        logger.verbose('updating model with fetched user tickets', { bookings });
        this.$patch((s) => { 
          // in initial implementation - simply overwrite any existing bookings array
          s.s_bookings = bookings;
        });
      },

      userTicketsFetchFailed(err?: any) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('user tickets fetch request failed, but user became unauthenticated', err); 
          return;
        }

        logger.warn('user tickets fetch failed', err);
        this.$patch((s) => { 
          s.s_bookings = undefined;
        });
      },

      userFavouritesFetchSucceeded(favourites: { [P in OfferKind]: EntityId[] }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('user favourites fetch request succeeded, but user became unauthenticated'); 
          return;
        }

        logger.verbose('updating model with fetched user favourites', { favourites });
        this.$patch((s) => { 
          // in initial implementation - simply overwrite any existing favourites array
          s.s_favourites = favourites;
        });
      },

      userFavouritesFetchFailed(err?: any) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('user favourites fetch request failed, but user became unauthenticated', err); 
          return;
        }

        logger.warn('user favourites fetch failed', err);
        this.$patch((s) => { 
          s.s_favourites = undefined;
        });
      },

      triggerAuthStatusSync() {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        
        if(import.meta.server) {
          logger.warn('skipping auth status sync, considering users as unauthenticated on server');
          return; 
        }

        logger.verbose('triggering auth status sync');
        this.clientSetupVariables().authSyncTrigger.value++;
      },

      syncAuthStatus(args: { 
        newAuthStatus: NuxtAuthStatus,
        userId?: EntityId
      }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        
        logger.verbose('syncing auth status', args);
        if(import.meta.server) {
          logger.verbose('skipping auth status sync, considering users as unauthenticated on server', args);
          return; 
        }

        const { newAuthStatus, userId } = args;
        const isAuthChanged = (newAuthStatus === 'authenticated') !== (this.s_authStatus === 'authenticated');
        switch(newAuthStatus) {
          case 'authenticated':
            if(isAuthChanged && userId) {
              logger.verbose('user auth status changed - logged into the system - refreshing personal info', args);
              this.$patch((s) => { 
                s.s_authStatus = 'authenticated';
                s.s_userId = userId;
              });
              this.setLoggingProps({ userId });
              this.clientSetupVariables().userDataFetch.refresh();
              this.clientSetupVariables().userTicketsFetch.refresh();
              this.clientSetupVariables().userFavouritesFetch.refresh();
            }
            break;
          default:
            if(isAuthChanged) {
              logger.verbose('user auth status changed - logged out', { authStatus: newAuthStatus });
              this.setLoggingProps({ });
              this.$patch((s) => { 
                assign(s, getUnauthenticatedState());
                s.s_authStatus = newAuthStatus;
                s.s_userId = undefined;
              });
            } else {
              this.$patch((s) => { 
                s.s_authStatus = newAuthStatus;
              });
            }
            return;
        }
      },

      userDataFetchSucceeded(userAccount: Partial<IUserAccount>) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        logger.verbose('updating model with fetched user info', { userAccount });
        if(!this.isAuthenticated) {
          logger.warn('user data fetch request succeeded, but user became unauthenticated'); 
          return;
        }

        this.patchUserInfo(userAccount);
      },

      userDataFetchFailed(err?: any) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('user data fetch request failed, but user became unauthenticated', err); 
          return;
        }

        this.$patch((s) => { 
          assign(s, getUnauthenticatedState());
        });

        logger.error('user data fetch failed', err);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'user data fetch failed', 'error-page');
      },

      toggleFavouriteRequestSucceeded(args: {
        kind: OfferKind,
        offerId: EntityId,
        isFavourite: boolean
      }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('toggle favourite offer request successed, but user became unauthenticated', undefined, args); 
          return;
        }

        logger.verbose('updating model with toggled favourite offer info', args);
        const { offerId, kind } = args;
        this.$patch((s) => { 
          s.s_favourites ??= { flights: [], stays: [] };
          if(args.isFavourite) {
            if(!s.s_favourites[kind].includes(offerId)) {
              s.s_favourites[kind].push(offerId);
            }
          } else {
            if(s.s_favourites[kind].includes(offerId)) {
              s.s_favourites[kind] = s.s_favourites[kind].filter(id => id !== offerId);
            }
          }
        });
      },

      toggleFavouriteRequestFailed(args: {
        kind: OfferKind,
        offerId: EntityId,
        err: any
      }): boolean {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('user image upload request failed, but user became unauthenticated', args.err, { kind: args.kind, offerId: args.offerId }); 
          return true;
        }

        return false;
      },

      uploadImageRequestSucceeded(args: {
        uploadData: UserImageUploadData,
        result: IImageEntitySrc
      }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        logger.verbose('updating model with uploaded image info', args);
        if(!this.isAuthenticated) {
          logger.warn('user image upload request successed, but user became unauthenticated', undefined, args); 
          return;
        }

        const { uploadData, result } = args;
        const patchingFields = uploadData.category === ImageCategory.UserAvatar ? {
          avatar: result
        } : {
          cover: result
        };

        this.patchUserInfo(patchingFields);
      },

      uploadImageRequestFailed(args: {
        uploadData: UserImageUploadData,
        err: any
      }): boolean {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();

        if(!this.isAuthenticated) {
          logger.warn('user image upload request failed, but user became unauthenticated', args.err, { uploadData: args.uploadData }); 
          return true;
        }
        return false;
      },
    
      updateRequestSucceeded(args: { 
        updateData: UserUpdateData,
        resultCode: UpdateAccountResultCode
      }) {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        const { updateData, resultCode } = args;

        if(!this.isAuthenticated) {
          logger.warn('update request completed successfull, but user became unauthenticated', undefined, { updateData }); 
          return;
        }

        switch (resultCode) {
          case UpdateAccountResultCode.SUCCESS:
            logger.verbose('updating model with new user data', { updateData });
            this.patchUserInfo(updateData);
            break;
          default:
            logger.info('skipping model update as response indicates about server-side issues', { resultCode, updateData });
            break;
        }
      },

      updateRequestFailed(args: {
        updateData: UserUpdateData,
        err: any
      }): boolean {
        throwIfExecutingActionOnServer();
        const logger = this.getLogger();
        const { updateData, err } = args;

        if(!this.isAuthenticated) {
          logger.warn('update request failed, but user became unauthenticated', err, { updateData }); 
          return true;
        }

        return false;
      },

      patchUserInfo(updateFields: Partial<IUserAccount>) {
        throwIfExecutingActionOnServer();
        this.$patch((s) => { 
          s.s_userInfo ??= { 
            firstName: null,
            lastName: null,
            avatar: null,
            cover: null,
            emails: []
          } as IUserAccount;
          deepmerge(s.s_userInfo, omit(updateFields, ['emails']));
          s.s_userInfo.emails = updateFields.emails ?? s.s_userInfo.emails;
        });
      }
    }
  }
);
const StoreDef = storeDefBuilder();
const useUserAccountStoreInternal = defineStore(StoreId, StoreDef);
export declare type UserAccountStoreInternal = ReturnType<typeof useUserAccountStoreInternal>;
export declare type UserAccountStore = ReturnType<PublicStore<typeof storeDefBuilder>>;
export const useUserAccountStore = useUserAccountStoreInternal as PublicStore<typeof storeDefBuilder>;