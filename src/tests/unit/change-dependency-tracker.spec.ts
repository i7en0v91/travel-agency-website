/**
 * @vitest-environment happy-dom
 */

import { describe, test, type TestOptions } from 'vitest';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { IAppLogger } from '../../shared/applogger';
import { ChangeDependencyTracker, type EntityModel, type IChangeDependencyTracker } from './../../server/backend/common-services/change-dependency-tracker';
import { createLogger } from '../../shared/testing/common';
import { AcsysDraftsEntityPrefix, AvailableLocaleCodes, DbVersionInitial, HtmlPageTimestampTable } from '../../shared/constants';
import { TokenKind, type EntityId, AuthProvider, ImageCategory, type FlightClass, type StayDescriptionParagraphType, type StayServiceLevel, EmailTemplateEnum } from './../../shared/interfaces';
import { createPrismaClient } from './../../server/backend/prisma/client';
import { newUniqueId } from './../../shared/common';
import { generateNewTokenValue, getSomeSalt, calculatePasswordHash } from './../../server/backend/helpers/crypto';
import range from 'lodash-es/range';
import fromPairs from 'lodash-es/fromPairs';
import zip from 'lodash-es/zip';
import flatten from 'lodash-es/flatten';

const DomainModelDefinition = Prisma.dmmf;
export const AllEntityModels: EntityModel[] = DomainModelDefinition.datamodel.models.filter(m => m.name !== HtmlPageTimestampTable && !m.name.startsWith(AcsysDraftsEntityPrefix)).map(m => m.name as EntityModel);

const TestTimeout = 300000;
const TestRunOptions: TestOptions = {
  timeout: TestTimeout,
  retry: 0,
  concurrent: false,
  sequential: true
};

declare type TestEntityInfo = {
  id: EntityId,
  entity: EntityModel,
  isDeleted: boolean
};
declare type SeededTestData = TestEntityInfo[];

declare type TestingDependenciesAssert = {
  assertParams: {
    changedEntity: EntityModel,
    id: EntityId,
    includeDeleted: boolean
  },
  expectedList: TestEntityInfo[]
};

interface ITestCase {
  entity: EntityModel,
  seedTestData: (dbRepository: PrismaClient) => Promise<SeededTestData>,
  getTestingDependenciesAsserts: () => Promise<TestingDependenciesAssert[]>,
  cleanupTestData: (testData: SeededTestData, dbRepository: PrismaClient) => Promise<void>
}

declare type TestsByEntities = {[P in EntityModel]: (testWithDeleted: boolean) => Promise<ITestCase>};

describe('unit:change-dependency-tracker tracking changes in related entities when a change occurs in any entity', async () => {
  const logger = createLogger('(change-dependency-tracker)');
  logger.info('>>>>>>>>>>>>> NEW TEST RUN <<<<<<<<<<<<<<<<<<');

  async function defaultTestDataCleanup(testData: SeededTestData, dbRepository: PrismaClient): Promise<void> {
    for(let i = 0; i < testData.length; i++) {
      const query = Prisma.raw(`UPDATE ${testData[i].entity} SET isDeleted = 1 WHERE id = ?`);
      query.values.push(testData[i].id);
      await dbRepository.$executeRaw(query);
    }
  }

  async function getTestImageCategoryId(dbRepository: PrismaClient): Promise<EntityId> {
    let categoryId = (await dbRepository.imageCategory.findFirst({
      where: {
        kind: ImageCategory.SampleData.valueOf()
      },
      select: {
        id: true
      }
    }))?.id;
    if(!categoryId) {
      categoryId = newUniqueId();
      await dbRepository.imageCategory.create({
        data: {
          id: categoryId,
          height: 100,
          width: 100,
          kind: ImageCategory.SampleData.valueOf(),
          version: DbVersionInitial
        }
      });
    };
    
    return categoryId;
  }

  /**
   * User entity
   */
  async function createUserEntityTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const imageCategoryId = await getTestImageCategoryId(dbRepository);
    const userId = newUniqueId();
    const userEmail1Id = newUniqueId();
    const userEmail2Id = newUniqueId();

    const userAvatarImgId = newUniqueId();
    const userAvatarFileId = newUniqueId();

    const userCoverImgId = newUniqueId();
    const userCoverFileId = newUniqueId();

    const result: ITestCase = {
      entity: 'User',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        const userEmail1 = `tests:change-dependency-tracker:user:${userId}:1@test.test`;
        const userEmail2 = `tests:change-dependency-tracker:user:${userId}:2@test.test`;
        
        const password = 'q%3dDtbT';
        const passwordSalt = getSomeSalt();
        const passwordHash = calculatePasswordHash(`${passwordSalt}${password}`);

        await dbRepository.user.create({
          data: {
            id: userId,
            authProvider: AuthProvider.Email,
            providerIdentity: userEmail1,
            version: DbVersionInitial,
            firstName: 'FirstNameDepTrack',
            lastName: 'LastrNameDepTrack',
            passwordHash,
            passwordSalt,
            emails: {
              create: [{
                id: userEmail1Id,
                email: userEmail1,
                orderNum: 0,
                version: DbVersionInitial,
                isVerified: true
              }, 
              {
                id: userEmail2Id,
                email: userEmail2,
                orderNum: 1,
                version: DbVersionInitial,
                isVerified: true,
                isDeleted: true
              }]
            },
            avatar: {
              create: {
                id: userAvatarImgId,
                fileId: userAvatarFileId,
                slug: `tests-change-dependency-tracker-user-${userId}-avatar`,
                version: DbVersionInitial,
                category: {
                  connect: {
                    id: imageCategoryId
                  }
                }
              }
            },
            cover: {
              create: {
                id: userCoverImgId,
                fileId: userCoverFileId,
                slug: `tests-change-dependency-tracker-user-${userId}-cover`,
                version: DbVersionInitial,
                category: {
                  connect: {
                    id: imageCategoryId
                  }
                }
              }
            }
          }
        });
        await dbRepository.image.update({
          where: {
            id: userAvatarImgId
          },
          data: {
            owner: { 
              connect: {
                id: userId
              }
            }
          }
        });
        await dbRepository.image.update({
          where: {
            id: userCoverImgId
          },
          data: {
            owner: { 
              connect: {
                id: userId
              }
            }
          }
        });
        return [
          {
            id: userId,
            entity: 'User',
            isDeleted: false
          },
          {
            id: userEmail1Id,
            entity: 'UserEmail',
            isDeleted: false
          },
          {
            id: userEmail2Id,
            entity: 'UserEmail',
            isDeleted: true
          },
          {
            id: userAvatarImgId,
            entity: 'Image',
            isDeleted: false
          },
          {
            id: userCoverImgId,
            entity: 'Image',
            isDeleted: false
          },
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const userEmail1: TestEntityInfo = { entity: 'UserEmail', id: userEmail1Id, isDeleted: false };
        const userEmail2: TestEntityInfo = { entity: 'UserEmail', id: userEmail2Id, isDeleted: true };
        const userAvatar: TestEntityInfo = { entity: 'Image', id: userAvatarImgId, isDeleted: false };
        const userCover: TestEntityInfo = { entity: 'Image', id: userCoverImgId, isDeleted: false };
        const user: TestEntityInfo = { entity: 'User', id: userId, isDeleted: false };

        return [
          { 
            assertParams: { changedEntity: 'UserEmail', id: userEmail1Id, includeDeleted: testWithDeleted },
            expectedList: [ userEmail1, userAvatar, userCover, user, ...(testWithDeleted ? [userEmail2] : []) ]
          },
          { 
            assertParams: { changedEntity: 'UserEmail', id: userEmail2Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? [ userEmail1, userAvatar, userCover, user, userEmail2] : [ userEmail2 ]
          },
          { 
            assertParams: { changedEntity: 'Image', id: userAvatarImgId, includeDeleted: testWithDeleted },
            expectedList: [ userAvatar, userCover, user, userEmail1, ...(testWithDeleted ? [userEmail2] : []) ] 
          },
          { 
            assertParams: { changedEntity: 'File', id: userAvatarFileId, includeDeleted: testWithDeleted }, // entity does not exist in DB
            expectedList: [ ]  // images have no direct references to File DB tables as they can be stored in CMS
          },
          { 
            assertParams: { changedEntity: 'User', id: userId, includeDeleted: testWithDeleted },
            expectedList: [ user, userEmail1, userAvatar, userCover, ...(testWithDeleted ? [userEmail2] : []) ]
          }
        ];
      },
      cleanupTestData: defaultTestDataCleanup
    };
    return result;
  }


  /**
   * User Email entity
   */
  async function createUserEmailEntityTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const userId = newUniqueId();
    const userEmail1Id = newUniqueId();
    const userEmail2Id = newUniqueId();
    const userEmail3Id = newUniqueId();
    const userEmail11Id = newUniqueId();
    const userEmail12Id = newUniqueId();
    const userEmail31Id = newUniqueId();
    const userEmail32Id = newUniqueId();;
    const verificationToken1Id = newUniqueId();
    const verificationToken2Id = newUniqueId();
    const verificationToken32Id = newUniqueId();
    const verificationToken11Id = newUniqueId();

    const result: ITestCase = {
      entity: 'UserEmail',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        const userEmail1 = `tests:change-dependency-tracker:userEmail1:${userEmail1Id}@test.test`;
        const userEmail2 = `tests:change-dependency-tracker:userEmail2:${userEmail2Id}@test.test`;
        const userEmail3 = `tests:change-dependency-tracker:userEmail3:${userEmail3Id}@test.test`;
        const userEmail11 = `tests:change-dependency-tracker:userEmail11:${userEmail11Id}@test.test`;
        const userEmail12 = `tests:change-dependency-tracker:userEmail12:${userEmail12Id}@test.test`;
        const userEmail31 = `tests:change-dependency-tracker:userEmail31:${userEmail31Id}@test.test`;
        const userEmail32 = `tests:change-dependency-tracker:userEmail32:${userEmail32Id}@test.test`;
        
        const password = 'q%3dDtbT';
        const passwordSalt = getSomeSalt();
        const passwordHash = calculatePasswordHash(`${passwordSalt}${password}`);

        await dbRepository.user.create({
          data: {
            id: userId,
            authProvider: AuthProvider.Email,
            providerIdentity: userEmail1,
            version: DbVersionInitial,
            firstName: 'FirstNameDepTrack',
            lastName: 'LastrNameDepTrack',
            passwordHash,
            passwordSalt,
            emails: {
              create: [{
                id: userEmail1Id,
                email: userEmail1,
                orderNum: 0,
                version: DbVersionInitial,
                isVerified: true,
                verificationToken: {
                  create: {
                    id: verificationToken1Id,
                    kind: TokenKind.EmailVerify.valueOf(),
                    version: DbVersionInitial,
                    attemptsMade: 0,
                    hash: generateNewTokenValue().hash,
                    user: {
                      connect: {
                        id: userId
                      }
                    }
                  }
                }
              }, 
              {
                id: userEmail11Id,
                email: userEmail11,
                orderNum: 1,
                version: DbVersionInitial,
                isVerified: true,
                isDeleted: true,
                verificationToken: {
                  create: {
                    id: verificationToken11Id,
                    kind: TokenKind.EmailVerify.valueOf(),
                    version: DbVersionInitial,
                    attemptsMade: 0,
                    hash: generateNewTokenValue().hash,
                    user: {
                      connect: {
                        id: userId
                      }
                    }
                  }
                }
              }, 
              {
                id: userEmail12Id,
                email: userEmail12,
                orderNum: 2,
                version: DbVersionInitial,
                isVerified: true,
                isDeleted: false
              },
              {
                id: userEmail2Id,
                email: userEmail2,
                orderNum: 3,
                version: DbVersionInitial,
                isVerified: true,
                isDeleted: true,
                verificationToken: {
                  create: {
                    id: verificationToken2Id,
                    kind: TokenKind.EmailVerify.valueOf(),
                    version: DbVersionInitial,
                    attemptsMade: 0,
                    hash: generateNewTokenValue().hash,
                    isDeleted: true,
                    user: {
                      connect: {
                        id: userId
                      }
                    }
                  }
                }
              },
              {
                id: userEmail3Id,
                email: userEmail3,
                orderNum: 4,
                version: DbVersionInitial,
                isVerified: true,
                isDeleted: true
              }, 
              {
                id: userEmail31Id,
                email: userEmail31,
                orderNum: 5,
                version: DbVersionInitial,
                isVerified: true,
                isDeleted: true
              }, 
              {
                id: userEmail32Id,
                email: userEmail32,
                orderNum: 6,
                version: DbVersionInitial,
                isVerified: true,
                isDeleted: true,
                verificationToken: {
                  create: {
                    id: verificationToken32Id,
                    kind: TokenKind.EmailVerify.valueOf(),
                    version: DbVersionInitial,
                    attemptsMade: 0,
                    hash: generateNewTokenValue().hash,
                    isDeleted: true,
                    user: {
                      connect: {
                        id: userId
                      }
                    }
                  }
                }
              }]
            }
          }
        });
        await dbRepository.userEmail.update({
          where: {
            id: userEmail11Id
          },
          data: {
            changedEmail: {
              connect: {
                id: userEmail1Id
              }
            }
          }
        });
        await dbRepository.userEmail.update({
          where: {
            id: userEmail12Id
          },
          data: {
            changedEmail: {
              connect: {
                id: userEmail1Id
              }
            }
          }
        });
        await dbRepository.userEmail.update({
          where: {
            id: userEmail2Id
          },
          data: {
            changedEmail: {
              connect: {
                id: userEmail1Id
              }
            }
          }
        });
        await dbRepository.userEmail.update({
          where: {
            id: userEmail3Id
          },
          data: {
            changedEmail: {
              connect: {
                id: userEmail2Id
              }
            }
          }
        });
        await dbRepository.userEmail.update({
          where: {
            id: userEmail31Id
          },
          data: {
            changedEmail: {
              connect: {
                id: userEmail3Id
              }
            }
          }
        });
        await dbRepository.userEmail.update({
          where: {
            id: userEmail32Id
          },
          data: {
            changedEmail: {
              connect: {
                id: userEmail3Id
              }
            }
          }
        });
        
        return [
          {
            id: userId,
            entity: 'User',
            isDeleted: false
          },
          {
            id: userEmail1Id,
            entity: 'UserEmail',
            isDeleted: false
          },
          {
            id: userEmail11Id,
            entity: 'UserEmail',
            isDeleted: true
          },
          {
            id: userEmail12Id,
            entity: 'UserEmail',
            isDeleted: false
          },
          {
            id: verificationToken1Id,
            entity: 'VerificationToken',
            isDeleted: false
          },
          {
            id: verificationToken11Id,
            entity: 'VerificationToken',
            isDeleted: false
          },
          {
            id: userEmail2Id,
            entity: 'UserEmail',
            isDeleted: true
          },
          {
            id: verificationToken2Id,
            entity: 'VerificationToken',
            isDeleted: true
          },
          {
            id: userEmail3Id,
            entity: 'UserEmail',
            isDeleted: true
          },
          {
            id: userEmail31Id,
            entity: 'UserEmail',
            isDeleted: true
          },
          {
            id: userEmail32Id,
            entity: 'UserEmail',
            isDeleted: true
          },
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const user: TestEntityInfo = { entity: 'User', id: userId, isDeleted: false };
        const userEmail1: TestEntityInfo = { entity: 'UserEmail', id: userEmail1Id, isDeleted: false };
        const userEmail11: TestEntityInfo = { entity: 'UserEmail', id: userEmail11Id, isDeleted: true };
        const userEmail12: TestEntityInfo = { entity: 'UserEmail', id: userEmail12Id, isDeleted: false };
        const verificationToken1: TestEntityInfo = { entity: 'VerificationToken', id: verificationToken1Id, isDeleted: false };
        const verificationToken11: TestEntityInfo = { entity: 'VerificationToken', id: verificationToken11Id, isDeleted: false };
        const userEmail2: TestEntityInfo = { entity: 'UserEmail', id: userEmail2Id, isDeleted: true };
        const verificationToken2: TestEntityInfo = { entity: 'VerificationToken', id: verificationToken2Id, isDeleted: true };
        const userEmail3: TestEntityInfo = { entity: 'UserEmail', id: userEmail3Id, isDeleted: true };
        const userEmail31: TestEntityInfo = { entity: 'UserEmail', id: userEmail31Id, isDeleted: true };
        const userEmail32: TestEntityInfo = { entity: 'UserEmail', id: userEmail32Id, isDeleted: true };
        const verificationToken32: TestEntityInfo = { entity: 'VerificationToken', id: verificationToken32Id, isDeleted: true };

        const allIndentifiedEntities = [ user, userEmail1, userEmail11, userEmail12, verificationToken1, verificationToken11, userEmail2, verificationToken2, userEmail3, userEmail31, userEmail32, verificationToken32 ];

        return [
          { 
            assertParams: { changedEntity: 'UserEmail', id: userEmail1Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allIndentifiedEntities :
              [ user, userEmail1, userEmail12, verificationToken1, verificationToken11 ]
          },
          { 
            assertParams: { changedEntity: 'UserEmail', id: userEmail12Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allIndentifiedEntities : 
              [ user, userEmail1, userEmail12, verificationToken1, verificationToken11 ]
          },
          { 
            assertParams: { changedEntity: 'VerificationToken', id: verificationToken1Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allIndentifiedEntities :
              [ user, userEmail1, userEmail12, verificationToken1, verificationToken11 ]
          },
          { 
            assertParams: { changedEntity: 'UserEmail', id: userEmail2Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allIndentifiedEntities : [ userEmail2 ]
          },
          { 
            assertParams: { changedEntity: 'VerificationToken', id: verificationToken2Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allIndentifiedEntities : [ verificationToken2 ]
          },
          { 
            assertParams: { changedEntity: 'UserEmail', id: userEmail3Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allIndentifiedEntities : [ userEmail3 ]
          },
          { 
            assertParams: { changedEntity: 'UserEmail', id: userEmail31Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allIndentifiedEntities : [ userEmail31 ]
          },
          { 
            assertParams: { changedEntity: 'VerificationToken', id: verificationToken32Id, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allIndentifiedEntities : [ verificationToken32 ]
          }
        ];
      },
      cleanupTestData: defaultTestDataCleanup
    };
    return result;
  }


  /**
   * Image Category entity
   */
  async function createImageCategoryEntityTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const imageCategoryId = newUniqueId();
    const imageIds = range(0, 4).map(_ => newUniqueId());
    
    const result: ITestCase = {
      entity: 'ImageCategory',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        await dbRepository.imageCategory.create({
          data: {
            id: imageCategoryId,
            height: 100,
            width: 100,
            kind: `tests:change-dependency-tracker:imageCategory:${imageCategoryId}`.toUpperCase(),
            version: DbVersionInitial
          }
        });

        for(let i = 0; i < imageIds.length; i++) {
          await dbRepository.image.create({
            data: {
              id: imageIds[i],
              fileId: imageIds[i],
              slug: `tests-change-dependency-tracker-imageCategory-${imageIds[i]}`,
              version: DbVersionInitial,
              isDeleted: i < 2,
              category: {
                connect: {
                  id: imageCategoryId
                }
              }
            }
          });
        }

        return [
          {
            id: imageCategoryId,
            entity: 'ImageCategory',
            isDeleted: false
          },
          ...(imageIds.map((id, idx) => { 
            return {
              id,
              entity: 'Image' as const,
              isDeleted: idx < 2
            }; 
          }))
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const imageCategory: TestEntityInfo = { entity: 'ImageCategory', id: imageCategoryId, isDeleted: false };
        const images: TestEntityInfo[] = imageIds.map((id, idx) => {
          return {
            entity: 'Image',
            id,
            isDeleted: idx < 2
          };
        });
        
        return [
          { 
            assertParams: { changedEntity: 'ImageCategory', id: imageCategoryId, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? [ imageCategory, ...images ]  : [ imageCategory, ...images.slice(2, images.length) ]
          }
        ];
      },
      cleanupTestData: async (testData: SeededTestData, dbRepository: PrismaClient): Promise<void> => {
        for(let i = 0; i < testData.length; i++) {
          if(testData[i].entity === 'ImageCategory') {
            continue;
          } else {
            const query = Prisma.raw(`UPDATE ${testData[i].entity} SET isDeleted = 1 WHERE id = ?`);
            query.values.push(testData[i].id);
            await dbRepository.$executeRaw(query);
          }
        }
      }
    };
    return result;
  }


  /**
   * Booking entity (flight offer)
   */
  async function createFlightBookingTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const booking1Id = newUniqueId();
    const booking2Id = newUniqueId();
    const bookingDeletedId = newUniqueId();
    const bookingSecondUserId = newUniqueId();

    const AnotherBookingIdPrefix = 'ANOTHER_';
  
    const imageCategoryId = await getTestImageCategoryId(dbRepository);
    const user1Id = newUniqueId();
    const user1EmailId = newUniqueId();
    const userAvatarImgId = newUniqueId();
    const userAvatarFileId = newUniqueId();

    const user2Id = newUniqueId();
    const user2EmailId = newUniqueId();
    
    const userFlightOffer1Id = newUniqueId();
    const userFlightOffer2Id = newUniqueId();
    const userFlightOfferDeletedId = newUniqueId();
    const secondUserFlightOfferId = newUniqueId();
    const flightOfferId = newUniqueId();

    const departFlightId = newUniqueId();
    const airlineCompanyId = newUniqueId();    
    const airlineCompanyNameStrId = newUniqueId();
    const airlineCompanyLogoImgId = newUniqueId();    
    const airplane1Id = newUniqueId();
    const airplane1NameStrId = newUniqueId();
    const airplane1PhotoId = newUniqueId();
    const airplane1ImageId = newUniqueId();
    const airplane1ImageFileId = newUniqueId();
    const city1Id = newUniqueId();
    const city1NameStrId = newUniqueId();
    const country1Id = newUniqueId();
    const country1NameStrId = newUniqueId();
    const arrivalAirportId = newUniqueId();    
    const arrivalAirportNameStrId = newUniqueId();
    const arrivalCityId = newUniqueId();    
    const arrivalCityNameStrId = newUniqueId();
    const arrivalCountryId = newUniqueId();    
    const arrivalCountryNameStrId = newUniqueId();

    const departAirportId = newUniqueId();    
    const departAirportNameStrId = newUniqueId();
    const departCityId = newUniqueId();    
    const departCityNameStrId = newUniqueId();
    const departCountryId = newUniqueId();    
    const departCountryNameStrId = newUniqueId();

    const result: ITestCase = {
      entity: 'Booking',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        const userEmail1 = `tests:change-dependency-tracker:flightBooking:${user1Id}:1@test.test`;
        const userEmail2 = `tests:change-dependency-tracker:flightBooking:${user2Id}:2@test.test`;
        const password = 'q%3dDtbT';
        const passwordSalt = getSomeSalt();
        const passwordHash = calculatePasswordHash(`${passwordSalt}${password}`);

        const createUsers = async (idPrefix: string = ''): Promise<void> => {
          await dbRepository.user.create({
            data: {
              id: `${idPrefix}${user1Id}`,
              authProvider: AuthProvider.Email,
              providerIdentity: `${idPrefix}${userEmail1}`,
              version: DbVersionInitial,
              firstName: 'FirstNameDepTrack',
              lastName: 'LastrNameDepTrack',
              passwordHash,
              passwordSalt,
              emails: {
                create: [{
                  id: `${idPrefix}${user1EmailId}`,
                  email: `${idPrefix}${userEmail1}`,
                  orderNum: 0,
                  version: DbVersionInitial,
                  isVerified: true
                }]
              },
              avatar: {
                create: {
                  id: `${idPrefix}${userAvatarImgId}`,
                  fileId: `${idPrefix}${userAvatarFileId}`,
                  slug: `tests-change-dependency-tracker-flightBooking-${idPrefix}${user1Id}-avatar`,
                  version: DbVersionInitial,
                  category: {
                    connect: {
                      id: imageCategoryId
                    }
                  }
                }
              }
            }
          });
  
          await dbRepository.user.create({
            data: {
              id: `${idPrefix}${user2Id}`,
              authProvider: AuthProvider.Email,
              providerIdentity: `${idPrefix}${userEmail2}`,
              version: DbVersionInitial,
              firstName: 'FirstNameDepTrack',
              lastName: 'LastrNameDepTrack',
              passwordHash,
              passwordSalt,
              emails: {
                create: [{
                  id: `${idPrefix}${user2EmailId}`,
                  email: `${idPrefix}${userEmail2}`,
                  orderNum: 0,
                  version: DbVersionInitial,
                  isVerified: true
                }]
              }
            }
          });
        };
        await createUsers();

        // Booking 1
        const createBookingWithChildren = async (idPrefix: string = ''): Promise<void> => {
          await dbRepository.booking.create({
            data: {
              id: `${idPrefix}${booking1Id}`,
              version: DbVersionInitial,
              user: {
                connect: {
                  id: `${idPrefix}${user1Id}`
                }
              },
              isDeleted: false,
              flightOffer: {
                create: {
                  id: `${idPrefix}${userFlightOffer1Id}`,
                  version: DbVersionInitial,
                  isDeleted: false,
                  isFavourite: false,
                  user: {
                    connect: {
                      id: `${idPrefix}${user1Id}`
                    }
                  },
                  offer: {
                    create: {
                      id: `${idPrefix}${flightOfferId}`,
                      dataHash: '',
                      class: <FlightClass>'economy',
                      numPassengers: 1,
                      totalPrice: 100,
                      version: DbVersionInitial,
                      isDeleted: false,
                      departFlight: {
                        create: {
                          id: `${idPrefix}${departFlightId}`,
                          dataHash: '',
                          arrivalUtcPosix: Math.floor(new Date().getTime() / 1000),
                          departmentUtcPosix: Math.floor(new Date().getTime() / 1000),
                          version: DbVersionInitial,
                          departmentAirport: {
                            create: {
                              id: `${idPrefix}${departAirportId}`,
                              lat: '0.0',
                              lon: '0.0',
                              version: DbVersionInitial,
                              isDeleted: false,
                              nameStr: {
                                create: {
                                  id: `${idPrefix}${departAirportNameStrId}`,
                                  version: DbVersionInitial,
                                  isDeleted: false,
                                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-departAirport'])))
                                } as any
                              },
                              city: {
                                create: {
                                  id: `${idPrefix}${departCityId}`,
                                  lat: '0.0',
                                  lon: '0.0',
                                  population: 10000,
                                  slug: `tests-change-dependency-tracker-flightBooking-departCity-${idPrefix}${departCityId}`,
                                  textForSearch: 'tests-change-dependency-tracker-flightBooking-departCity',
                                  utcOffsetMin: 0,
                                  version: DbVersionInitial,
                                  nameStr: {
                                    create: {
                                      id: `${idPrefix}${departCityNameStrId}`,
                                      version: DbVersionInitial,
                                      isDeleted: false,
                                      ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-departCity'])))
                                    } as any
                                  },
                                  country: {
                                    create: {
                                      id: `${idPrefix}${departCountryId}`,
                                      version: DbVersionInitial,
                                      isDeleted: false,
                                      nameStr: {
                                        create: {
                                          id: `${idPrefix}${departCountryNameStrId}`,
                                          version: DbVersionInitial,
                                          isDeleted: false,
                                          ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-departCountry'])))
                                        } as any
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          arrivalAirport: {
                            create: {
                              id: `${idPrefix}${arrivalAirportId}`,
                              lat: '0.0',
                              lon: '0.0',
                              version: DbVersionInitial,
                              isDeleted: false,
                              nameStr: {
                                create: {
                                  id: `${idPrefix}${arrivalAirportNameStrId}`,
                                  version: DbVersionInitial,
                                  isDeleted: false,
                                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-arrivalAirport'])))
                                } as any
                              },
                              city: {
                                create: {
                                  id: `${idPrefix}${arrivalCityId}`,
                                  lat: '0.0',
                                  lon: '0.0',
                                  population: 10000,
                                  slug: `tests-change-dependency-tracker-flightBooking-arrivalCity-${idPrefix}${arrivalCityId}`,
                                  textForSearch: 'tests-change-dependency-tracker-flightBooking-arrivalCity',
                                  utcOffsetMin: 0,
                                  version: DbVersionInitial,
                                  nameStr: {
                                    create: {
                                      id: `${idPrefix}${arrivalCityNameStrId}`,
                                      version: DbVersionInitial,
                                      isDeleted: false,
                                      ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-arrivalCity'])))
                                    } as any
                                  },
                                  country: {
                                    create: {
                                      id: `${idPrefix}${arrivalCountryId}`,
                                      version: DbVersionInitial,
                                      isDeleted: false,
                                      nameStr: {
                                        create: {
                                          id: `${idPrefix}${arrivalCountryNameStrId}`,
                                          version: DbVersionInitial,
                                          isDeleted: false,
                                          ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-arrivalCountry'])))
                                        } as any
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          airplane: {
                            create: {
                              id: `${idPrefix}${airplane1Id}`,
                              version: DbVersionInitial,
                              isDeleted: false,
                              nameStr: {
                                create: {
                                  id: `${idPrefix}${airplane1NameStrId}`,
                                  version: DbVersionInitial,
                                  isDeleted: false,
                                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-airplane1'])))
                                } as any
                              },
                              images: {
                                create: [
                                  {
                                    id: `${idPrefix}${airplane1PhotoId}`,
                                    kind: 'main',
                                    orderNum: 0,
                                    version: DbVersionInitial,
                                    isDeleted: false,
                                    image: {
                                      create: {
                                        id: `${idPrefix}${airplane1ImageId}`,
                                        fileId: `${idPrefix}${airplane1ImageFileId}`,
                                        slug: `tests-change-dependency-tracker-airplane1-${idPrefix}${airplane1Id}-img`,
                                        version: DbVersionInitial,
                                        category: {
                                          connect: {
                                            id: imageCategoryId
                                          }
                                        }
                                      }
                                    } 
                                  }
                                ]
                              }
                            }
                          },
                          airlineCompany: {
                            create: {
                              id: `${idPrefix}${airlineCompanyId}`,
                              numReviews: 100,
                              reviewScore: '4.5',
                              version: DbVersionInitial,
                              isDeleted: false,
                              nameStr: {
                                create: {
                                  id: `${idPrefix}${airlineCompanyNameStrId}`,
                                  version: DbVersionInitial,
                                  isDeleted: false,
                                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-airlineCompany'])))
                                } as any
                              },
                              logoImage: {
                                create: {
                                  id: `${idPrefix}${airlineCompanyLogoImgId}`,
                                  fileId: `${idPrefix}${airlineCompanyLogoImgId}`,
                                  slug: `tests-change-dependency-tracker-flightBooking-companyLogoImg-${idPrefix}${airlineCompanyLogoImgId}`,
                                  version: DbVersionInitial,
                                  category: {
                                    connect: {
                                      id: imageCategoryId
                                    }
                                  }
                                }
                              },
                              city: {
                                create: {
                                  id: `${idPrefix}${city1Id}`,
                                  lat: '0.0',
                                  lon: '0.0',
                                  population: 10000,
                                  slug: `tests-change-dependency-tracker-flightBooking-city1-${idPrefix}${city1Id}`,
                                  textForSearch: 'tests-change-dependency-tracker-flightBooking-city1',
                                  utcOffsetMin: 0,
                                  version: DbVersionInitial,
                                  nameStr: {
                                    create: {
                                      id: `${idPrefix}${city1NameStrId}`,
                                      version: DbVersionInitial,
                                      isDeleted: false,
                                      ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-city1'])))
                                    } as any
                                  },
                                  country: {
                                    create: {
                                      id: `${idPrefix}${country1Id}`,
                                      version: DbVersionInitial,
                                      isDeleted: false,
                                      nameStr: {
                                        create: {
                                          id: `${idPrefix}${country1NameStrId}`,
                                          version: DbVersionInitial,
                                          isDeleted: false,
                                          ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-flightBooking-country1'])))
                                        } as any
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          });
          await dbRepository.image.update({
            where: {
              id: `${idPrefix}${userAvatarImgId}`
            },
            data: {
              owner: { 
                connect: {
                  id: `${idPrefix}${user1Id}`
                }
              }
            }
          });
        };
        await createBookingWithChildren();

        // Booking 2 for the same flight
        await dbRepository.booking.create({
          data: {
            id: booking2Id,
            version: DbVersionInitial,
            user: {
              connect: {
                id: user1Id
              }
            },
            isDeleted: false,
            flightOffer: {
              create: {
                id: userFlightOffer2Id,
                version: DbVersionInitial,
                isDeleted: false,
                isFavourite: false,
                user: {
                  connect: {
                    id: user1Id
                  }
                },
                offer: {
                  connect: {
                    id: flightOfferId
                  }
                }
              }
            }
          }
        });

        // Deleted booking
        await dbRepository.booking.create({
          data: {
            id: bookingDeletedId,
            version: DbVersionInitial,
            user: {
              connect: {
                id: user1Id
              }
            },
            isDeleted: true,
            flightOffer: {
              create: {
                id: userFlightOfferDeletedId,
                version: DbVersionInitial,
                isDeleted: true,
                isFavourite: false,
                user: {
                  connect: {
                    id: user1Id
                  }
                },
                offer: {
                  connect: {
                    id: flightOfferId
                  }
                }
              }
            }
          }
        });
        
        // Another user booking for the same flight
        await dbRepository.booking.create({
          data: {
            id: bookingSecondUserId,
            version: DbVersionInitial,
            user: {
              connect: {
                id: user2Id
              }
            },
            isDeleted: false,
            flightOffer: {
              create: {
                id: secondUserFlightOfferId,
                version: DbVersionInitial,
                isDeleted: false,
                isFavourite: false,
                user: {
                  connect: {
                    id: user2Id
                  }
                },
                offer: {
                  connect: {
                    id: flightOfferId
                  }
                }
              }
            }
          }
        });

        // Another booking with completely different children (another users, flights e.t.c)
        await createUsers(AnotherBookingIdPrefix);
        await createBookingWithChildren(AnotherBookingIdPrefix);

        const createdEntitiesInfo: TestEntityInfo[] = [
          { id: booking1Id, entity: 'Booking', isDeleted: false },
          { id: booking2Id, entity: 'Booking', isDeleted: false },
          { id: bookingSecondUserId, entity: 'Booking', isDeleted: false },
          { id: bookingDeletedId, entity: 'Booking', isDeleted: true },
          { id: user1Id, entity: 'User', isDeleted: false },
          { id: user1EmailId, entity: 'UserEmail', isDeleted: false },
          { id: userAvatarImgId, entity: 'Image', isDeleted: false },
          { id: userAvatarFileId, entity: 'File', isDeleted: false },
          { id: user2Id, entity: 'User', isDeleted: false },
          { id: user2EmailId, entity: 'UserEmail', isDeleted: false },
          { id: userFlightOffer1Id, entity: 'UserFlightOffer', isDeleted: false },
          { id: userFlightOffer2Id, entity: 'UserFlightOffer', isDeleted: false },
          { id: userFlightOfferDeletedId, entity: 'UserFlightOffer', isDeleted: true },
          { id: secondUserFlightOfferId, entity: 'UserFlightOffer', isDeleted: false },
          { id: flightOfferId, entity: 'FlightOffer', isDeleted: false },
          { id: departFlightId, entity: 'Flight', isDeleted: false },
          { id: airlineCompanyId, entity: 'AirlineCompany', isDeleted: false },
          { id: airlineCompanyNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: airlineCompanyLogoImgId, entity: 'Image', isDeleted: false },
          { id: airplane1Id, entity: 'Airplane', isDeleted: false },
          { id: airplane1NameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: airplane1PhotoId, entity: 'AirplaneImage', isDeleted: false },
          { id: airplane1ImageId, entity: 'Image', isDeleted: false },
          { id: airplane1ImageFileId, entity: 'File', isDeleted: false },
          { id: city1Id, entity: 'City', isDeleted: false },
          { id: city1NameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: country1Id, entity: 'Country', isDeleted: false },
          { id: country1NameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: arrivalAirportId, entity: 'Airport', isDeleted: false },
          { id: arrivalAirportNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: arrivalCityId, entity: 'City', isDeleted: false },
          { id: arrivalCityNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: arrivalCountryId, entity: 'Country', isDeleted: false },
          { id: arrivalCountryNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: departAirportId, entity: 'Airport', isDeleted: false },
          { id: departAirportNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: departCityId, entity: 'City', isDeleted: false },
          { id: departCityNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: departCountryId, entity: 'Country', isDeleted: false },
          { id: departCountryNameStrId, entity: 'LocalizeableValue', isDeleted: false }
        ];

        return [
          ...createdEntitiesInfo,
          ...(createdEntitiesInfo.map(e => { 
            return <TestEntityInfo>{
              id: `${AnotherBookingIdPrefix}${e.id}`,
              entity: e.entity,
              isDeleted: e.isDeleted
            };
          }))
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const booking1: TestEntityInfo = { entity: 'Booking', id: booking1Id, isDeleted: false };
        const booking2: TestEntityInfo = { entity: 'Booking', id: booking2Id, isDeleted: false };
        const bookingSecondUser: TestEntityInfo = { entity: 'Booking', id: bookingSecondUserId, isDeleted: false };
        const bookingDeleted: TestEntityInfo = { entity: 'Booking', id: bookingDeletedId, isDeleted: true };
        const user1: TestEntityInfo = { entity: 'User', id: user1Id, isDeleted: false };
        const user1Email: TestEntityInfo = { entity: 'UserEmail', id: user1EmailId, isDeleted: false };
        const user2: TestEntityInfo = { entity: 'User', id: user2Id, isDeleted: false };
        const user2Email: TestEntityInfo = { entity: 'UserEmail', id: user2EmailId, isDeleted: false };
        const userAvatarImg: TestEntityInfo = { entity: 'Image', id: userAvatarImgId, isDeleted: false };
        const userFlightOffer1: TestEntityInfo = { entity: 'UserFlightOffer', id: userFlightOffer1Id, isDeleted: false };
        const userFlightOffer2: TestEntityInfo = { entity: 'UserFlightOffer', id: userFlightOffer2Id, isDeleted: false };
        const userFlightOfferDeleted: TestEntityInfo = { entity: 'UserFlightOffer', id: userFlightOfferDeletedId, isDeleted: true };
        const secondUserFlightOffer: TestEntityInfo = { entity: 'UserFlightOffer', id: secondUserFlightOfferId, isDeleted: false };
        const flightOffer: TestEntityInfo = { entity: 'FlightOffer', id: flightOfferId, isDeleted: false };
        const departFlight: TestEntityInfo = { entity: 'Flight', id: departFlightId, isDeleted: false };
        const airlineCompany: TestEntityInfo = { entity: 'AirlineCompany', id: airlineCompanyId, isDeleted: false };
        const airlineCompanyNameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: airlineCompanyNameStrId, isDeleted: false };
        const airlineCompanyLogoImg: TestEntityInfo = { entity: 'Image', id: airlineCompanyLogoImgId, isDeleted: false };
        const airplane1: TestEntityInfo = { entity: 'Airplane', id: airplane1Id, isDeleted: false };
        const airplane1NameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: airplane1NameStrId, isDeleted: false };
        const airplane1Photo: TestEntityInfo = { entity: 'AirplaneImage', id: airplane1PhotoId, isDeleted: false };
        const airplane1Image: TestEntityInfo = { entity: 'Image', id: airplane1ImageId, isDeleted: false };
        const city1: TestEntityInfo = { entity: 'City', id: city1Id, isDeleted: false };
        //const city1NameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: city1NameStrId, isDeleted: false };
        const country1: TestEntityInfo = { entity: 'Country', id: country1Id, isDeleted: false };
        const country1NameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: country1NameStrId, isDeleted: false };
        const arrivalAirport: TestEntityInfo = { entity: 'Airport', id: arrivalAirportId, isDeleted: false };
        const arrivalAirportNameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: arrivalAirportNameStrId, isDeleted: false };
        const arrivalCity1: TestEntityInfo = { entity: 'City', id: arrivalCityId, isDeleted: false };
        //const arrivalCity1NameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: arrivalCityNameStrId, isDeleted: false };
        const arrivalCountry: TestEntityInfo = { entity: 'Country', id: arrivalCountryId, isDeleted: false };
        //const arrivalCountryNameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: arrivalCountryNameStrId, isDeleted: false };
        const departAirport: TestEntityInfo = { entity: 'Airport', id: departAirportId, isDeleted: false };
        const departAirportNameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: departAirportNameStrId, isDeleted: false };
        // const departCity1: TestEntityInfo = { entity: 'City', id: departCityId, isDeleted: false };
        // const departCity1NameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: departCityNameStrId, isDeleted: false };
        // const departCountry: TestEntityInfo = { entity: 'Country', id: departCountryId, isDeleted: false };
        // const departCountryNameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: departCountryNameStrId, isDeleted: false };
        
        return [
          { 
            assertParams: { changedEntity: 'Booking', id: booking1Id, includeDeleted: testWithDeleted },
            expectedList: [user1Email, user1, userAvatarImg, userFlightOffer1, userFlightOffer2, booking1, booking2, ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          /** User changes */
          { 
            assertParams: { changedEntity: 'UserEmail', id: user1EmailId, includeDeleted: testWithDeleted },
            expectedList: [user1Email, user1, userAvatarImg, userFlightOffer1, userFlightOffer2, booking1, booking2, ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          /** User Flight Offer changes */
          { 
            assertParams: { changedEntity: 'UserFlightOffer', id: userFlightOffer1Id, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, userAvatarImg, userFlightOffer1, userFlightOffer2, booking1, booking2,
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          /** Airplane changes */ //
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: airplane1NameStrId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, airplane1NameStr, airplane1, departFlight, flightOffer, airplane1Image, airplane1Photo,
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'AirplaneImage', id: airplane1PhotoId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, airplane1, departFlight, flightOffer, airplane1Photo, airplane1Image, airplane1NameStr,
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          /** Airline Company changes */
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: airlineCompanyNameStrId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, airlineCompanyNameStr, airlineCompany, departFlight, flightOffer, airlineCompanyLogoImg,  
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'Image', id: airlineCompanyLogoImgId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, airlineCompanyNameStr, airlineCompany, departFlight, flightOffer, airlineCompanyLogoImg,  
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'Country', id: country1Id, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, airlineCompanyNameStr, airlineCompany, departFlight, flightOffer, airlineCompanyLogoImg, city1, country1, country1NameStr,
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          /**
           * Airport changes
           */
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: departAirportNameStrId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, departAirport, departAirportNameStr, departFlight, flightOffer, 
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: arrivalCountryNameStrId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, arrivalAirport, arrivalAirportNameStr, departFlight, flightOffer, arrivalCity1, arrivalCountry, arrivalAirportNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          /** Flight changes */
          { 
            assertParams: { changedEntity: 'Flight', id: departFlightId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, departFlight, flightOffer,
              airplane1, airplane1NameStr, airplane1Image, airplane1Photo, airlineCompany, airlineCompanyLogoImg, airlineCompanyNameStr, arrivalAirport, arrivalAirportNameStr, departAirport, departAirportNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          },
          /** Offer changes */
          { 
            assertParams: { changedEntity: 'FlightOffer', id: flightOfferId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userFlightOffer1, userFlightOffer2, secondUserFlightOffer, booking1, booking2, flightOffer,
              ...(testWithDeleted ? [ bookingDeleted, userFlightOfferDeleted ] : [])]
          }
        ];
      },
      cleanupTestData: defaultTestDataCleanup
    };
    return result;
  }


  /**
   * Booking entity (stay offer)
   */
  async function createStayBookingTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const booking1Id = newUniqueId();
    const booking2Id = newUniqueId();
    const bookingDeletedId = newUniqueId();
    const bookingSecondUserId = newUniqueId();

    const AnotherBookingIdPrefix = 'ANOTHER_';
    const ReviewedUserBookingIdPrefix = 'REVIEWED_';

    const imageCategoryId = await getTestImageCategoryId(dbRepository);
    const user1Id = newUniqueId();
    const user1EmailId = newUniqueId();
    const userAvatarImgId = newUniqueId();
    const userAvatarFileId = newUniqueId();

    const user2Id = newUniqueId();
    const user2EmailId = newUniqueId();
    
    const userStayOffer1Id = newUniqueId();
    const userStayOffer2Id = newUniqueId();
    const userStayOfferDeletedId = newUniqueId();
    const secondUserStayOfferId = newUniqueId();
    const stayOfferId = newUniqueId();

    const hotelId = newUniqueId();
    const hotelNameStrId = newUniqueId();
    const cityId = newUniqueId();
    const cityNameStrId = newUniqueId();
    const countryId = newUniqueId();
    const countryNameStrId = newUniqueId();

    const hotelDescriptionId = newUniqueId();
    const hotelDescriptionTextStrId = newUniqueId();
    const hotelPhotoId = newUniqueId();
    const hotelPhotoImageId = newUniqueId();

    const hotelReviewId = newUniqueId();
    const hotelReviewTextStrId = newUniqueId();
    const hotelExtraUserReviewId = newUniqueId();
    const hotelExtraUserReviewTextStrId = newUniqueId();

    const result: ITestCase = {
      entity: 'Booking',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        const userEmail1 = `tests:change-dependency-tracker:stayBooking:${user1Id}:1@test.test`;
        const userEmail2 = `tests:change-dependency-tracker:stayBooking:${user2Id}:2@test.test`;
        const password = 'q%3dDtbT';
        const passwordSalt = getSomeSalt();
        const passwordHash = calculatePasswordHash(`${passwordSalt}${password}`);

        const createUsers = async (idPrefix: string = ''): Promise<void> => {
          await dbRepository.user.create({
            data: {
              id: `${idPrefix}${user1Id}`,
              authProvider: AuthProvider.Email,
              providerIdentity: `${idPrefix}${userEmail1}`,
              version: DbVersionInitial,
              firstName: 'FirstNameDepTrack',
              lastName: 'LastrNameDepTrack',
              passwordHash,
              passwordSalt,
              emails: {
                create: [{
                  id: `${idPrefix}${user1EmailId}`,
                  email: `${idPrefix}${userEmail1}`,
                  orderNum: 0,
                  version: DbVersionInitial,
                  isVerified: true
                }]
              },
              avatar: {
                create: {
                  id: `${idPrefix}${userAvatarImgId}`,
                  fileId: `${idPrefix}${userAvatarFileId}`,
                  slug: `tests-change-dependency-tracker-stayBooking-${idPrefix}${user1Id}-avatar`,
                  version: DbVersionInitial,
                  category: {
                    connect: {
                      id: imageCategoryId
                    }
                  }
                }
              }
            }
          });

          await dbRepository.user.create({
            data: {
              id: `${idPrefix}${user2Id}`,
              authProvider: AuthProvider.Email,
              providerIdentity: `${idPrefix}${userEmail2}`,
              version: DbVersionInitial,
              firstName: 'FirstNameDepTrack',
              lastName: 'LastrNameDepTrack',
              passwordHash,
              passwordSalt,
              emails: {
                create: [{
                  id: `${idPrefix}${user2EmailId}`,
                  email: `${idPrefix}${userEmail2}`,
                  orderNum: 0,
                  version: DbVersionInitial,
                  isVerified: true
                }]
              }
            }
          });
        };
        await createUsers();

        // Booking 1
        const createBookingWithChildren = async (idPrefix: string = ''): Promise<void> => {
          await dbRepository.booking.create({
            data: {
              id: `${idPrefix}${booking1Id}`,
              version: DbVersionInitial,
              user: {
                connect: {
                  id: `${idPrefix}${user1Id}`
                }
              },
              isDeleted: false,
              stayOffer: {
                create: {
                  id: `${idPrefix}${userStayOffer1Id}`,
                  version: DbVersionInitial,
                  isDeleted: false,
                  isFavourite: false,
                  user: {
                    connect: {
                      id: `${idPrefix}${user1Id}`
                    }
                  },
                  offer: {
                    create: {
                      id: `${idPrefix}${stayOfferId}`,
                      dataHash: '',
                      numGuests: 1,
                      numRooms: 1,
                      checkInPosix: Math.floor(new Date().getTime() / 1000),
                      checkOutPosix: Math.floor(new Date().getTime() / 1000),
                      totalPrice: 100,
                      version: DbVersionInitial,
                      isDeleted: false,
                      hotel: {
                        create: {
                          id: `${idPrefix}${hotelId}`,
                          lon: '0.0',
                          lat: '0.0',
                          version: DbVersionInitial,
                          isDeleted: false,
                          city: {
                            create: {
                              id: `${idPrefix}${cityId}`,
                              lat: '0.0',
                              lon: '0.0',
                              population: 10000,
                              slug: `tests-change-dependency-tracker-stayBooking-hotelCity-${idPrefix}${cityId}`,
                              textForSearch: 'tests-change-dependency-tracker-stayBooking-hotelCity',
                              utcOffsetMin: 0,
                              version: DbVersionInitial,
                              nameStr: {
                                create: {
                                  id: `${idPrefix}${cityNameStrId}`,
                                  version: DbVersionInitial,
                                  isDeleted: false,
                                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-stayBooking-hotelCity'])))
                                } as any
                              },
                              country: {
                                create: {
                                  id: `${idPrefix}${countryId}`,
                                  version: DbVersionInitial,
                                  isDeleted: false,
                                  nameStr: {
                                    create: {
                                      id: `${idPrefix}${countryNameStrId}`,
                                      version: DbVersionInitial,
                                      isDeleted: false,
                                      ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-stayBooking-hotelCountry'])))
                                    } as any
                                  }
                                }
                              }
                            }
                          },
                          nameStr: {
                            create: {
                              id: `${idPrefix}${hotelNameStrId}`,
                              version: DbVersionInitial,
                              isDeleted: false,
                              ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-stayBooking-hotel'])))
                            } as any
                          },
                          slug: `tests-change-dependency-tracker-stayBooking-hotel-${idPrefix}${hotelNameStrId}`,
                          description: {
                            create: [{
                              id: `${idPrefix}${hotelDescriptionId}`,
                              orderNum: 0,
                              paragraphKind: <StayDescriptionParagraphType>'Main',
                              version: DbVersionInitial,
                              isDeleted: false,
                              textStr: {
                                create: {
                                  id: `${idPrefix}${hotelDescriptionTextStrId}`,
                                  version: DbVersionInitial,
                                  isDeleted: false,
                                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-stayBooking-hotelDescription'])))
                                } as any
                              }
                            }]
                          },
                          images: {
                            create: [{
                              id: `${idPrefix}${hotelPhotoId}`,
                              orderNum: 0,
                              version: DbVersionInitial,
                              isDeleted: false,
                              serviceLevel: <StayServiceLevel>'Base',
                              image: {
                                create: {
                                  id: `${idPrefix}${hotelPhotoImageId}`,
                                  fileId: `${idPrefix}${hotelPhotoImageId}`,
                                  slug: `tests-change-dependency-tracker-stayBooking-${idPrefix}${hotelPhotoImageId}-img`,
                                  version: DbVersionInitial,
                                  category: {
                                    connect: {
                                      id: imageCategoryId
                                    }
                                  }
                                }
                              }
                            }]
                          },
                          reviews: {
                            create: [{
                              id: `${idPrefix}${hotelReviewId}`,
                              score: 5,
                              version: DbVersionInitial,
                              isDeleted: false,
                              user: {
                                connect: {
                                  id: `${idPrefix}${user1Id}`
                                }
                              },
                              textStr: {
                                create: {
                                  id: `${idPrefix}${hotelReviewTextStrId}`,
                                  version: DbVersionInitial,
                                  isDeleted: false,
                                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-stayBooking-hotelReview'])))
                                } as any
                              }
                            }]
                          }
                        }  
                      }
                    }
                  }
                }
              }
            }
          });
          await dbRepository.image.update({
            where: {
              id: `${idPrefix}${userAvatarImgId}`
            },
            data: {
              owner: { 
                connect: {
                  id: `${idPrefix}${user1Id}`
                }
              }
            }
          });
        };
        await createBookingWithChildren();

        // Booking 2 for the same stay
        await dbRepository.booking.create({
          data: {
            id: booking2Id,
            version: DbVersionInitial,
            user: {
              connect: {
                id: user1Id
              }
            },
            isDeleted: false,
            stayOffer: {
              create: {
                id: userStayOffer2Id,
                version: DbVersionInitial,
                isDeleted: false,
                isFavourite: false,
                user: {
                  connect: {
                    id: user1Id
                  }
                },
                offer: {
                  connect: {
                    id: stayOfferId
                  }
                }
              }
            }
          }
        });

        // Deleted booking
        await dbRepository.booking.create({
          data: {
            id: bookingDeletedId,
            version: DbVersionInitial,
            user: {
              connect: {
                id: user1Id
              }
            },
            isDeleted: true,
            stayOffer: {
              create: {
                id: userStayOfferDeletedId,
                version: DbVersionInitial,
                isDeleted: true,
                isFavourite: false,
                user: {
                  connect: {
                    id: user1Id
                  }
                },
                offer: {
                  connect: {
                    id: stayOfferId
                  }
                }
              }
            }
          }
        });
        
        // Another user booking for the same stay
        await dbRepository.booking.create({
          data: {
            id: bookingSecondUserId,
            version: DbVersionInitial,
            user: {
              connect: {
                id: user2Id
              }
            },
            isDeleted: false,
            stayOffer: {
              create: {
                id: secondUserStayOfferId,
                version: DbVersionInitial,
                isDeleted: false,
                isFavourite: false,
                user: {
                  connect: {
                    id: user2Id
                  }
                },
                offer: {
                  connect: {
                    id: stayOfferId
                  }
                }
              }
            }
          }
        });

        // User with another booking who added review to main booking's hotel
        await createUsers(ReviewedUserBookingIdPrefix);
        await createBookingWithChildren(ReviewedUserBookingIdPrefix);
        
        await dbRepository.hotelReview.create({
          data: {
            id: hotelExtraUserReviewId,
            score: 5,
            version: DbVersionInitial,
            isDeleted: false,
            hotel: {
              connect: {
                id: hotelId
              }
            },
            user: {
              connect: {
                id: `${ReviewedUserBookingIdPrefix}${user1Id}`
              }
            },
            textStr: {
              create: {
                id: hotelExtraUserReviewTextStrId,
                version: DbVersionInitial,
                isDeleted: false,
                ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-stayBooking-hotelExtraUserReview'])))
              } as any
            }
          }
        });

        // Another booking with completely different children (another users, stay e.t.c)
        await createUsers(AnotherBookingIdPrefix);
        await createBookingWithChildren(AnotherBookingIdPrefix);

        const createdEntitiesInfo: TestEntityInfo[] = [
          { id: booking1Id, entity: 'Booking', isDeleted: false },
          { id: booking2Id, entity: 'Booking', isDeleted: false },
          { id: bookingSecondUserId, entity: 'Booking', isDeleted: false },
          { id: bookingDeletedId, entity: 'Booking', isDeleted: true },
          { id: user1Id, entity: 'User', isDeleted: false },
          { id: user1EmailId, entity: 'UserEmail', isDeleted: false },
          { id: userAvatarImgId, entity: 'Image', isDeleted: false },
          { id: userAvatarFileId, entity: 'File', isDeleted: false },
          { id: user2Id, entity: 'User', isDeleted: false },
          { id: user2EmailId, entity: 'UserEmail', isDeleted: false },
          { id: userStayOffer1Id, entity: 'UserStayOffer', isDeleted: false },
          { id: userStayOffer2Id, entity: 'UserStayOffer', isDeleted: false },
          { id: userStayOfferDeletedId, entity: 'UserStayOffer', isDeleted: true },
          { id: stayOfferId, entity: 'StayOffer', isDeleted: false },
          { id: hotelId, entity: 'Hotel', isDeleted: false },
          { id: hotelNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: cityId, entity: 'City', isDeleted: false },
          { id: cityNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: countryId, entity: 'Country', isDeleted: false },
          { id: countryNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: hotelDescriptionId, entity: 'HotelDescription', isDeleted: false },
          { id: hotelDescriptionTextStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: hotelPhotoId, entity: 'HotelImage', isDeleted: false },
          { id: hotelPhotoImageId, entity: 'Image', isDeleted: false },
          { id: hotelReviewId, entity: 'HotelReview', isDeleted: false },
          { id: hotelReviewTextStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: hotelExtraUserReviewId, entity: 'HotelReview', isDeleted: false },
          { id: hotelExtraUserReviewTextStrId, entity: 'LocalizeableValue', isDeleted: false }
        ];

        return [
          ...createdEntitiesInfo,
          ...(createdEntitiesInfo.map(e => { 
            return <TestEntityInfo>{
              id: `${AnotherBookingIdPrefix}${e.id}`,
              entity: e.entity,
              isDeleted: e.isDeleted
            };
          })),
          ...(createdEntitiesInfo.map(e => { 
            return <TestEntityInfo>{
              id: `${ReviewedUserBookingIdPrefix}${e.id}`,
              entity: e.entity,
              isDeleted: e.isDeleted
            };
          }))
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const booking1: TestEntityInfo = { entity: 'Booking', id: booking1Id, isDeleted: false };
        const booking2: TestEntityInfo = { entity: 'Booking', id: booking2Id, isDeleted: false };
        const bookingSecondUser: TestEntityInfo = { entity: 'Booking', id: bookingSecondUserId, isDeleted: false };
        const bookingDeleted: TestEntityInfo = { entity: 'Booking', id: bookingDeletedId, isDeleted: true };
        const user1: TestEntityInfo = { entity: 'User', id: user1Id, isDeleted: false };
        const user1Email: TestEntityInfo = { entity: 'UserEmail', id: user1EmailId, isDeleted: false };
        const user2: TestEntityInfo = { entity: 'User', id: user2Id, isDeleted: false };
        const user2Email: TestEntityInfo = { entity: 'UserEmail', id: user2EmailId, isDeleted: false };
        const userAvatarImg: TestEntityInfo = { entity: 'Image', id: userAvatarImgId, isDeleted: false };
        const userStayOffer1: TestEntityInfo = { entity: 'UserStayOffer', id: userStayOffer1Id, isDeleted: false };
        const userStayOffer2: TestEntityInfo = { entity: 'UserStayOffer', id: userStayOffer2Id, isDeleted: false };
        const userStayOfferDeleted: TestEntityInfo = { entity: 'UserStayOffer', id: userStayOfferDeletedId, isDeleted: true };
        const secondUserStayOffer: TestEntityInfo = { entity: 'UserStayOffer', id: secondUserStayOfferId, isDeleted: false };
        const stayOffer: TestEntityInfo = { entity: 'StayOffer', id: stayOfferId, isDeleted: false };

        const city: TestEntityInfo = { entity: 'City', id: cityId, isDeleted: false };
        const cityNameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: cityNameStrId, isDeleted: false };
        const hotel: TestEntityInfo = { entity: 'Hotel', id: hotelId, isDeleted: false };
        const hotelNameStr: TestEntityInfo = { entity: 'LocalizeableValue', id: hotelNameStrId, isDeleted: false };
        const country: TestEntityInfo = { entity: 'Country', id: countryId, isDeleted: false };
        const countryName: TestEntityInfo = { entity: 'LocalizeableValue', id: countryNameStrId, isDeleted: false };
        const hotelDescription: TestEntityInfo = { entity: 'HotelDescription', id: hotelDescriptionId, isDeleted: false };
        const hotelDescriptionTextStr: TestEntityInfo = { entity: 'LocalizeableValue', id: hotelDescriptionTextStrId, isDeleted: false };
        const hotelPhoto: TestEntityInfo = { entity: 'HotelImage', id: hotelPhotoId, isDeleted: false };
        const hotelPhotoImage: TestEntityInfo = { entity: 'Image', id: hotelPhotoImageId, isDeleted: false };
        const hotelReview: TestEntityInfo = { entity: 'HotelReview', id: hotelReviewId, isDeleted: false };
        const hotelReviewTextStr: TestEntityInfo = { entity: 'LocalizeableValue', id: hotelReviewTextStrId, isDeleted: false };
        const hotelExtraUserReview: TestEntityInfo = { entity: 'HotelReview', id: hotelExtraUserReviewId, isDeleted: false };
        //const hotelExtraUserReviewTextStr: TestEntityInfo = { entity: 'LocalizeableValue', id: hotelExtraUserReviewTextStrId, isDeleted: false };
        
        return [
          { 
            assertParams: { changedEntity: 'Booking', id: booking1Id, includeDeleted: testWithDeleted },
            expectedList: [user1Email, user1, userAvatarImg, userStayOffer1, userStayOffer2, booking1, booking2, hotelReview, ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          /** User changes */
          { 
            assertParams: { changedEntity: 'UserEmail', id: user1EmailId, includeDeleted: testWithDeleted },
            expectedList: [user1Email, user1, userAvatarImg, userStayOffer1, userStayOffer2, booking1, booking2, hotelReview, ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          /** User Stay Offer changes */
          { 
            assertParams: { changedEntity: 'UserStayOffer', id: userStayOffer1Id, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, userAvatarImg, userStayOffer1, userStayOffer2, booking1, booking2, hotelReview,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          /** Offer changes */
          { 
            assertParams: { changedEntity: 'StayOffer', id: stayOfferId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          /** Hotel review changes */
          // Not testing review text change (LocalizeableValue) as it doesn't affect hotel's total score & review texts are loaded client-side - cache not affected
          { 
            assertParams: { changedEntity: 'HotelReview', id: hotelReviewId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelExtraUserReview, hotelReview, hotelReviewTextStr, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          /** Hotel image changes */
          { 
            assertParams: { changedEntity: 'Image', id: hotelPhotoImageId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'HotelImage', id: hotelPhotoId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          /** Hotel description changes */
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: hotelDescriptionTextStrId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'HotelDescription', id: hotelDescriptionId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          /** Hotel changes */
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: countryNameStrId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr, city, country, countryName,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'Country', id: countryId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr, city, country, countryName,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'City', id: cityId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr, city, cityNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: hotelNameStrId, includeDeleted: testWithDeleted },
            expectedList: [ 
              user1Email, user1, user2, user2Email, userAvatarImg, bookingSecondUser, /** returning user-related IDs is not desirable, but can be ignored at all as user page it not cached */
              userStayOffer1, userStayOffer2, secondUserStayOffer, booking1, booking2, stayOffer, hotelReview, hotelExtraUserReview, hotelDescription, hotelDescriptionTextStr, hotelPhotoImage, hotelPhoto, hotel, hotelNameStr,
              ...(testWithDeleted ? [ bookingDeleted, userStayOfferDeleted ] : [])]
          },
        ];
      },
      cleanupTestData: defaultTestDataCleanup
    };
    return result;
  }

  /** 
   * Popular city entity
   */
  async function createPopularCityTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const popularCityId = newUniqueId();
    const promoLineStrId = newUniqueId();
    const promoHeaderStrId = newUniqueId();
    const promoTextStrId = newUniqueId();
    const cityId = newUniqueId();
    const cityNameStrId = newUniqueId();
    const countryId = newUniqueId();
    const countryNameStrId = newUniqueId();
    const photoId = newUniqueId();
    const photoImageId = newUniqueId();

    const deletedPhotoId = newUniqueId();
    const deletedPhotoImageId = newUniqueId();
    
    const imageCategoryId = await getTestImageCategoryId(dbRepository);

    const result: ITestCase = {
      entity: 'PopularCity',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        await dbRepository.popularCity.create({
          data: {
            id: popularCityId,
            promoLineStr: {
              create: {
                id: promoLineStrId,
                version: DbVersionInitial,
                isDeleted: false,
                ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-promoLine'])))
              } as any
            },
            travelHeaderStr: {
              create: {
                id: promoHeaderStrId,
                version: DbVersionInitial,
                isDeleted: false,
                ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-promoHeader'])))
              } as any
            },
            travelTextStr: {
              create: {
                id: promoTextStrId,
                version: DbVersionInitial,
                isDeleted: false,
                ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-promoText'])))
              } as any
            },
            images: {
              create: [{
                id: photoId,
                orderNum: 0,
                version: DbVersionInitial,
                isDeleted: false,
                image: {
                  create: {
                    id: photoImageId,
                    fileId: photoImageId,
                    slug: `tests-change-dependency-tracker-popularCity-img-${photoImageId}`,
                    version: DbVersionInitial,
                    category: {
                      connect: {
                        id: imageCategoryId
                      }
                    }
                  }
                }
              },
              {
                id: deletedPhotoId,
                orderNum: 1,
                version: DbVersionInitial,
                isDeleted: true,
                image: {
                  create: {
                    id: deletedPhotoImageId,
                    fileId: deletedPhotoImageId,
                    slug: `tests-change-dependency-tracker-popularCity-deletedImg-${deletedPhotoImageId}`,
                    version: DbVersionInitial,
                    isDeleted: true,
                    category: {
                      connect: {
                        id: imageCategoryId
                      }
                    }
                  }
                }
              }]
            },
            version: DbVersionInitial,
            rating: 5,
            city: {
              create: {
                id: cityId,
                lat: '0.0',
                lon: '0.0',
                population: 10000,
                slug: `tests-change-dependency-tracker-popularCity-${cityId}`,
                textForSearch: 'tests-change-dependency-tracker-popularCity-city',
                utcOffsetMin: 0,
                version: DbVersionInitial,
                nameStr: {
                  create: {
                    id: cityNameStrId,
                    version: DbVersionInitial,
                    isDeleted: false,
                    ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-popularCity-cityName'])))
                  } as any
                },
                country: {
                  create: {
                    id: countryId,
                    version: DbVersionInitial,
                    isDeleted: false,
                    nameStr: {
                      create: {
                        id: countryNameStrId,
                        version: DbVersionInitial,
                        isDeleted: false,
                        ...(fromPairs(AvailableLocaleCodes.map(l => [l, 'tests-change-dependency-tracker-popularCity-countryName'])))
                      } as any
                    }
                  }
                }
              }
            }
          }
        });
        return [
          { id: popularCityId, entity: 'PopularCity', isDeleted: false },
          { id: promoLineStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: promoHeaderStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: promoTextStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: cityId, entity: 'City', isDeleted: false },
          { id: cityNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: countryId, entity: 'Country', isDeleted: false },
          { id: countryNameStrId, entity: 'LocalizeableValue', isDeleted: false },
          { id: photoId, entity: 'PopularCityImage', isDeleted: false },
          { id: photoImageId, entity: 'Image', isDeleted: false },
          { id: deletedPhotoId, entity: 'PopularCityImage', isDeleted: true },
          { id: deletedPhotoImageId, entity: 'Image', isDeleted: true }
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const popularCity: TestEntityInfo = { id: popularCityId, entity: 'PopularCity', isDeleted: false };
        const promoLineStr: TestEntityInfo =  { id: promoLineStrId, entity: 'LocalizeableValue', isDeleted: false };
        const promoHeaderStr: TestEntityInfo = { id: promoHeaderStrId, entity: 'LocalizeableValue', isDeleted: false };
        const promoTextStr: TestEntityInfo =  { id: promoTextStrId, entity: 'LocalizeableValue', isDeleted: false };
        const city: TestEntityInfo =  { id: cityId, entity: 'City', isDeleted: false };
        //const cityNameStr: TestEntityInfo =  { id: cityNameStrId, entity: 'LocalizeableValue', isDeleted: false };
        const country: TestEntityInfo =   { id: countryId, entity: 'Country', isDeleted: false };
        const countryNameStr: TestEntityInfo =   { id: countryNameStrId, entity: 'LocalizeableValue', isDeleted: false };
        const popularPhoto: TestEntityInfo =   { id: photoId, entity: 'PopularCityImage', isDeleted: false };
        const popularPhotoImage: TestEntityInfo =   { id: photoImageId, entity: 'Image', isDeleted: false };
        const deletedPopularPhoto: TestEntityInfo =  { id: deletedPhotoId, entity: 'PopularCityImage', isDeleted: true };
        const deletedPopularPhotoImage: TestEntityInfo = { id: deletedPhotoImageId, entity: 'Image', isDeleted: true };
        
        return [
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: countryNameStrId, includeDeleted: testWithDeleted },
            expectedList: [ popularCity, popularPhoto, popularPhotoImage, promoLineStr, promoHeaderStr, promoTextStr, city, country, countryNameStr, ...(testWithDeleted ? [ deletedPopularPhoto, deletedPopularPhotoImage ] : [])]
          },
          { 
            assertParams: { changedEntity: 'Image', id: photoImageId, includeDeleted: testWithDeleted },
            expectedList: [ popularCity, popularPhoto, popularPhotoImage, promoLineStr, promoHeaderStr, promoTextStr, ...(testWithDeleted ? [ deletedPopularPhoto, deletedPopularPhotoImage ] : [])]
          },
          { 
            assertParams: { changedEntity: 'PopularCityImage', id: photoId, includeDeleted: testWithDeleted },
            expectedList: [ popularCity, popularPhoto, popularPhotoImage, promoLineStr, promoHeaderStr, promoTextStr, ...(testWithDeleted ? [ deletedPopularPhoto, deletedPopularPhotoImage ] : [])]
          },
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: promoHeaderStrId, includeDeleted: testWithDeleted },
            expectedList: [ popularCity, popularPhoto, popularPhotoImage, promoLineStr, promoHeaderStr, promoTextStr, ...(testWithDeleted ? [ deletedPopularPhoto, deletedPopularPhotoImage ] : [])]
          },
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: promoLineStrId, includeDeleted: testWithDeleted },
            expectedList: [ popularCity, popularPhoto, popularPhotoImage, promoLineStr, promoHeaderStr, promoTextStr, ...(testWithDeleted ? [ deletedPopularPhoto, deletedPopularPhotoImage ] : [])]
          },
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: promoTextStrId, includeDeleted: testWithDeleted },
            expectedList: [ popularCity, popularPhoto, popularPhotoImage, promoLineStr, promoHeaderStr, promoTextStr, ...(testWithDeleted ? [ deletedPopularPhoto, deletedPopularPhotoImage ] : [])]
          },
          { 
            assertParams: { changedEntity: 'PopularCity', id: popularCityId, includeDeleted: testWithDeleted },
            expectedList: [ popularCity, popularPhoto, popularPhotoImage, promoLineStr, promoHeaderStr, promoTextStr, ...(testWithDeleted ? [ deletedPopularPhoto, deletedPopularPhotoImage ] : [])]
          }
        ];
      },
      cleanupTestData: async (testData: SeededTestData, dbRepository: PrismaClient): Promise<void> => {
        for(let i = 0; i < testData.length; i++) {
          if(testData[i].entity !== 'PopularCity') {
            const query = Prisma.raw(`UPDATE ${testData[i].entity} SET isDeleted = 1 WHERE id = ?`);
            query.values.push(testData[i].id);
            await dbRepository.$executeRaw(query);
          }
        }
      }
    };
    return result;
  }

  /**
  * Company Review entity
  */
  async function createCompanyReviewEntityTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const companyReview1Id = newUniqueId();
    const companyReview1BodyId = newUniqueId();
    const companyReview1HeaderId = newUniqueId();
    const person1NameStrId = newUniqueId();
    const companyReview1ImageId = newUniqueId();
    const imageCategoryId = newUniqueId();

    const DeletedReviewIdPrefix = 'DELETED_';

    const result: ITestCase = {
      entity: 'CompanyReview',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        await dbRepository.imageCategory.create({
          data: {
            id: imageCategoryId,
            height: 100,
            width: 100,
            kind: `tests:change-dependency-tracker:companyReview:${imageCategoryId}`.toUpperCase(),
            version: DbVersionInitial
          }
        });

        const createCompanyReviewEntityWithChildren = async(isDeleted: boolean, idPrefix: string = ''): Promise<void> => {
          await dbRepository.companyReview.create({
            data: {
              id: `${idPrefix}${companyReview1Id}`,
              version: DbVersionInitial,
              isDeleted,
              image: {
                create: {
                  id: `${idPrefix}${companyReview1ImageId}`,
                  fileId: `${idPrefix}${companyReview1ImageId}`,
                  slug: `tests-change-dependency-tracker-companyReview-img1-${idPrefix}${companyReview1ImageId}`,
                  version: DbVersionInitial,
                  isDeleted,
                  category: {
                    connect: {
                      id: imageCategoryId
                    }
                  }
                }
              },
              bodyStr: {
                create: {
                  id: `${idPrefix}${companyReview1BodyId}`,
                  version: DbVersionInitial,
                  isDeleted,
                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, `tests-change-dependency-tracker-companyReview-body1-${idPrefix}${companyReview1BodyId}`])))
                } as any
              },
              headerStr: {
                create: {
                  id: `${idPrefix}${companyReview1HeaderId}`,
                  version: DbVersionInitial,
                  isDeleted,
                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, `tests-change-dependency-tracker-companyReview-header1-${idPrefix}${companyReview1HeaderId}`])))
                } as any
              },
              personNameStr: {
                create: {
                  id: `${idPrefix}${person1NameStrId}`,
                  version: DbVersionInitial,
                  isDeleted,
                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, `tests-change-dependency-tracker-companyReview-person1-${idPrefix}${person1NameStrId}`])))
                } as any
              }
            }
          });  
        };
        
        await createCompanyReviewEntityWithChildren(false);
        await createCompanyReviewEntityWithChildren(true, DeletedReviewIdPrefix);

        const createdEntities: TestEntityInfo[] = [
          {
            id: companyReview1Id,
            entity: 'CompanyReview',
            isDeleted: false
          },
          {
            id: companyReview1BodyId,
            entity: 'LocalizeableValue',
            isDeleted: false
          },
          {
            id: companyReview1HeaderId,
            entity: 'LocalizeableValue',
            isDeleted: false
          },
          {
            id: person1NameStrId,
            entity: 'LocalizeableValue',
            isDeleted: false
          },
          {
            id: companyReview1ImageId,
            entity: 'Image',
            isDeleted: false
          }
        ];
        return [
          { id: imageCategoryId, entity: 'ImageCategory', isDeleted: false },
          ...createdEntities,
          ...(createdEntities.map(e => {
            return {
              id: `${DeletedReviewIdPrefix}${e.id}`,
              entity: e.entity,
              isDeleted: true
            };
          }))
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const companyReview: TestEntityInfo = { id: companyReview1Id, entity: 'CompanyReview', isDeleted: false };
        const companyReviewBody: TestEntityInfo = { id: companyReview1BodyId, entity: 'LocalizeableValue', isDeleted: false };
        const companyReviewHeader: TestEntityInfo = { id: companyReview1HeaderId, entity: 'LocalizeableValue', isDeleted: false };
        const personNameStr: TestEntityInfo = { id: person1NameStrId, entity: 'LocalizeableValue', isDeleted: false };
        const companyReviewImage: TestEntityInfo = { id: companyReview1ImageId, entity: 'Image', isDeleted: false };
        const imageCategory: TestEntityInfo = { id: imageCategoryId, entity: 'ImageCategory', isDeleted: false };

        const allIdentifiedEntities = [ companyReview, companyReviewBody, companyReviewHeader, personNameStr, companyReviewImage ];
        const allDeletedIdentifiedEntities = allIdentifiedEntities.map(e => {
          return {
            id: `${DeletedReviewIdPrefix}${e.id}`,
            entity: e.entity,
            isDeleted: true
          };
        });

        return [
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: companyReview1BodyId, includeDeleted: testWithDeleted },
            expectedList: allIdentifiedEntities
          },
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: `${DeletedReviewIdPrefix}${companyReview1BodyId}`, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allDeletedIdentifiedEntities : [ allDeletedIdentifiedEntities.find(e => e.id === `${DeletedReviewIdPrefix}${companyReview1BodyId}`)! ]
          },
          { 
            assertParams: { changedEntity: 'Image', id: companyReview1ImageId, includeDeleted: testWithDeleted },
            expectedList: allIdentifiedEntities
          },
          { 
            assertParams: { changedEntity: 'CompanyReview', id: companyReview1Id, includeDeleted: testWithDeleted },
            expectedList: allIdentifiedEntities
          },
          { 
            assertParams: { changedEntity: 'CompanyReview', id: `${DeletedReviewIdPrefix}${companyReview1Id}`, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allDeletedIdentifiedEntities : [ allDeletedIdentifiedEntities.find(e => e.id === `${DeletedReviewIdPrefix}${companyReview1Id}`)! ]
          },
          { 
            assertParams: { changedEntity: 'ImageCategory', id: imageCategoryId, includeDeleted: testWithDeleted },
            expectedList: [ imageCategory, ...allIdentifiedEntities, ...(testWithDeleted ? allDeletedIdentifiedEntities : []) ] 
          },
        ];
      },
      cleanupTestData: async (testData: SeededTestData, dbRepository: PrismaClient): Promise<void> => {
        for(let i = 0; i < testData.length; i++) {
          if(testData[i].entity === 'ImageCategory') {
            continue;
          } else {
            const query = Prisma.raw(`UPDATE ${testData[i].entity} SET isDeleted = 1 WHERE id = ?`);
            query.values.push(testData[i].id);
            await dbRepository.$executeRaw(query);
          }
        }
      }
    };
    return result;
  };

  /**
  * Mail Template entity
  */
  async function createMailTemplateEntityTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const mailTemplate1Id = newUniqueId();
    const mailTemplate1MarkupStrId = newUniqueId();
    const DeletedTemplateIdPrefix = 'DELETED_';

    const result: ITestCase = {
      entity: 'MailTemplate',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        const createCompanyReviewEntityWithChildren = async(isDeleted: boolean, idPrefix: string = ''): Promise<void> => {
          await dbRepository.mailTemplate.create({
            data: {
              id: `${idPrefix}${mailTemplate1Id}`,
              kind: EmailTemplateEnum.EmailVerify.valueOf(),
              version: DbVersionInitial,
              isDeleted,
              templateStr: {
                create: {
                  id: `${idPrefix}${mailTemplate1MarkupStrId}`,
                  version: DbVersionInitial,
                  isDeleted,
                  ...(fromPairs(AvailableLocaleCodes.map(l => [l, `tests-change-dependency-tracker-companyReview-body1-${idPrefix}${mailTemplate1MarkupStrId}`])))
                } as any
              }
            }
          });  
        };
        
        await createCompanyReviewEntityWithChildren(false);
        await createCompanyReviewEntityWithChildren(true, DeletedTemplateIdPrefix);

        const createdEntities: TestEntityInfo[] = [
          {
            id: mailTemplate1Id,
            entity: 'MailTemplate',
            isDeleted: false
          },
          {
            id: mailTemplate1MarkupStrId,
            entity: 'LocalizeableValue',
            isDeleted: false
          }
        ];
        return [
          ...createdEntities,
          ...(createdEntities.map(e => {
            return {
              id: `${DeletedTemplateIdPrefix}${e.id}`,
              entity: e.entity,
              isDeleted: true
            };
          }))
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const mailTemplate: TestEntityInfo = { id: mailTemplate1Id, entity: 'MailTemplate', isDeleted: false };
        const mailTemplateMarkupStr: TestEntityInfo = { id: mailTemplate1MarkupStrId, entity: 'LocalizeableValue', isDeleted: false };
        
        const allIdentifiedEntities = [ mailTemplate, mailTemplateMarkupStr ];
        const allDeletedIdentifiedEntities = allIdentifiedEntities.map(e => {
          return {
            id: `${DeletedTemplateIdPrefix}${e.id}`,
            entity: e.entity,
            isDeleted: true
          };
        });

        return [
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: mailTemplate1MarkupStrId, includeDeleted: testWithDeleted },
            expectedList: allIdentifiedEntities
          },
          { 
            assertParams: { changedEntity: 'LocalizeableValue', id: `${DeletedTemplateIdPrefix}${mailTemplate1MarkupStrId}`, includeDeleted: testWithDeleted },
            expectedList: testWithDeleted ? allDeletedIdentifiedEntities : [ allDeletedIdentifiedEntities.find(e => e.id === `${DeletedTemplateIdPrefix}${mailTemplate1MarkupStrId}`)! ]
          },
          { 
            assertParams: { changedEntity: 'MailTemplate', id: mailTemplate1Id, includeDeleted: testWithDeleted },
            expectedList: [ mailTemplate, mailTemplateMarkupStr ]
          },
          { 
            assertParams: { changedEntity: 'MailTemplate', id: `${DeletedTemplateIdPrefix}${mailTemplate1Id}`, includeDeleted: testWithDeleted },
            expectedList: [ allDeletedIdentifiedEntities.find(e => e.id === `${DeletedTemplateIdPrefix}${mailTemplate1Id}`)!, ...(testWithDeleted ? [allDeletedIdentifiedEntities.find(e => e.id === `${DeletedTemplateIdPrefix}${mailTemplate1MarkupStrId}`)!] : []) ]
          }
        ];
      },
      cleanupTestData: defaultTestDataCleanup
    };
    return result;
  };

  /**
   * AuthFormImage entity
   */
  async function createAuthFormImageEntityTestCase(testWithDeleted: boolean): Promise<ITestCase> {
    const authFormImageId = newUniqueId();
    const imageId = newUniqueId();
    
    const result: ITestCase = {
      entity: 'ImageCategory',
      async seedTestData(dbRepository: PrismaClient): Promise<SeededTestData> {
        const imageCategoryId = await getTestImageCategoryId(dbRepository);
        await dbRepository.authFormImage.create({
          data: {
            id: authFormImageId,
            orderNum: 100,
            image: {
              create: {
                id: imageId,
                fileId: imageId,
                slug: `tests-change-dependency-tracker-authFormImage-${imageId}-img`,
                version: DbVersionInitial,
                category: {
                  connect: {
                    id: imageCategoryId
                  }
                }
              }
            },
            version: DbVersionInitial,
            isDeleted: false
          }
        });

        return [
          {
            id: authFormImageId,
            entity: 'AuthFormImage',
            isDeleted: false
          },
          {
            id: imageId,
            entity: 'Image',
            isDeleted: false
          }
        ];
      },
      getTestingDependenciesAsserts: async (): Promise<TestingDependenciesAssert[]> => {
        const authFormImage: TestEntityInfo = { entity: 'AuthFormImage', id: authFormImageId, isDeleted: false };
        const image: TestEntityInfo = { entity: 'Image', id: imageId, isDeleted: false };
        
        return [
          { 
            assertParams: { changedEntity: 'Image', id: imageId, includeDeleted: testWithDeleted },
            expectedList: [ image, authFormImage ]
          },
          { 
            assertParams: { changedEntity: 'AuthFormImage', id: authFormImageId, includeDeleted: testWithDeleted },
            expectedList: [ image, authFormImage ]
          }
        ];
      },
      cleanupTestData: defaultTestDataCleanup
    };
    return result;
  }

  /** 
   * Runner
   */
  function createTestStub(entity: EntityModel): Promise<ITestCase> {
    const result: ITestCase = {
      entity,
      seedTestData: () => Promise.resolve([]),
      getTestingDependenciesAsserts: () => Promise.resolve([]),
      cleanupTestData: () => Promise.resolve()
    };
    return Promise.resolve(result);
  }


  const TestsDesc: TestsByEntities = {
    'User': createUserEntityTestCase,
    'UserEmail': createUserEmailEntityTestCase,
    'Image': () => createTestStub('Image'), // covered by User's avatar & cover tests
    'ImageCategory': createImageCategoryEntityTestCase,
    'AuthFormImage': createAuthFormImageEntityTestCase,
    'File': () => createTestStub('File'), // file entity has no DB relations as it's data may be stored in CMS
    'FlightOffer': createFlightBookingTestCase,
    'Flight': () => createTestStub('Flight'), // covered by FlightOffer entity tests
    'StayOffer': createStayBookingTestCase,
    'UserFlightOffer': () => createTestStub('UserFlightOffer'), // covered by FlightOffer entity tests
    'UserStayOffer': () => createTestStub('UserStayOffer'), // covered by StayOffer entity tests
    'Hotel': () => createTestStub('Hotel'), // covered by StayOffer entity tests
    'HotelDescription': () => createTestStub('HotelDescription'), // covered by StayOffer entity tests
    'HotelReview': () => createTestStub('HotelReview'), // covered by StayOffer entity tests
    'HotelImage': () => createTestStub('HotelImage'), // covered by StayOffer entity tests
    'Booking': () => createTestStub('Booking'), // covered by FlightOffer & StayOffer entity tests
    'PopularCity': createPopularCityTestCase,
    'PopularCityImage': () => createTestStub('PopularCityImage'), // covered by PopularCity entity tests
    'Country': () => createTestStub('Country'), // covered by FlightOffer & StayOffer entity tests
    'City': () => createTestStub('City'), // covered by FlightOffer & StayOffer entity tests
    'Airport': () => createTestStub('Airport'), // covered by FlightOffer entity tests
    'CompanyReview': createCompanyReviewEntityTestCase,
    'AirlineCompany': () => createTestStub('AirlineCompany'), // covered by FlightOffer entity tests
    'Airplane': () => createTestStub('Airplane'), // covered by FlightOffer entity tests
    'AirplaneImage': () => createTestStub('AirplaneImage'), // covered by FlightOffer entity tests
    'MailTemplate': createMailTemplateEntityTestCase,
    'VerificationToken': () => createTestStub('VerificationToken'), // covered by UserEmail entity tests
    'LocalizeableValue': () => createTestStub('LocalizeableValue') // covered by other entity type's tests
  };

  async function verifyDependencyAssert(assert: TestingDependenciesAssert, changeDependencyTracker: IChangeDependencyTracker, testEntity: EntityModel, logger: IAppLogger): Promise<void> {
    const actualList = await changeDependencyTracker.getChangedEntityChain([{ entity: assert.assertParams.changedEntity, id: assert.assertParams.id }], assert.assertParams.includeDeleted);
    if(assert.expectedList.length !== actualList.length) {
      const msg = `dependency assert FAILED, test name=${testEntity}, assert change trigger=${assert.assertParams.changedEntity}:${assert.assertParams.id}, expected changes count=${assert.expectedList.length}, actual changes count=${actualList.length}, expectedList=[${assert.expectedList.map(l => `[${l.entity},${l.id}]`).join(', ')}], actualList=[${actualList.map(l => `[${l.changedEntity},${l.id}]`).join(', ')}]`;
      logger.error(msg);
      throw new Error(msg);
    }

    for(let i = 0; i < assert.expectedList.length; i++) {
      const expectedChange = assert.expectedList[i];
      const verified = actualList.some(e => e.changedEntity === expectedChange.entity && e.id === expectedChange.id);
      if(!verified) {
        const msg = `dependency assert FAILED, test entity=${testEntity}, assert change trigger=${assert.assertParams.changedEntity}:${assert.assertParams.id}, expected change entity=${expectedChange.entity}:${expectedChange.id} not present in actual changes list`;
        logger.error(msg);
        throw new Error(msg);
      }
    }
  }

  logger.verbose('>>> initializing services <<<');
  const dbRepository = await createPrismaClient(logger);
  const changeDependencyTracker = new ChangeDependencyTracker(dbRepository, logger);
  logger.verbose('>>> services initialized <<<');

  for(let i = 0; i < AllEntityModels.length; i++) {
    const entityModel = AllEntityModels[i];
    test(`change-dependency-tracker - model ${entityModel}`, TestRunOptions, async () => {
      const testCase = await TestsDesc[entityModel](false);
      logger.info(`==== STARTING test case ${testCase.entity} ====`);

      logger.verbose('>>> preparing test data <<<');
      const testData = await testCase.seedTestData(dbRepository);
      logger.verbose(`>>> test data prepared:  ${testData.map(t => JSON.stringify(t)).join('; ')}<<<`);

      logger.verbose('>>> verifying expectations <<<');
      const asserts = await testCase.getTestingDependenciesAsserts();
      for(let j = 0; j < asserts.length; j++) {
        await verifyDependencyAssert(asserts[j], changeDependencyTracker, entityModel, logger);
      }
      logger.verbose('>>> expectations verified, cleaning up <<<');
      await testCase.cleanupTestData(testData, dbRepository);

      logger.info(`==== STOPPED test case ${testCase.entity} ====`);
    });  
  }

  test(`change-dependency-tracker - all at once with deleted`, TestRunOptions, async () => {
    logger.info('==== STARTING test case all at once with deleted ====');
    const TestName = 'AllAtOnce';
    logger.verbose('>>> preparing test data <<<');
    const TestWithDeleted = true;
    const tests: { testCase: ITestCase, testData: SeededTestData }[] = [];
    for(let i = 0; i < AllEntityModels.length; i++) {
      const entityModel = AllEntityModels[i];
      const testCase = await (TestsDesc[entityModel](TestWithDeleted));
      const data = await testCase.seedTestData(dbRepository);
      tests.push({ testCase, testData: data });
    }
    logger.verbose(`>>> test data prepared:  ${tests.map(t => JSON.stringify(t.testData)).join('; ')}<<<`);

    logger.verbose('>>> verifying expectations <<<');
    
    const testAsserts: TestingDependenciesAssert[][] = [];
    for(let  i = 0; i < tests.length; i++) {
      testAsserts.push(await tests[i].testCase.getTestingDependenciesAsserts());
    }
    const testAssertsGrouped = zip(...testAsserts);

    for(let i = 0; i < testAssertsGrouped.length; i++) {
      const testAssertsGroup = testAssertsGrouped[i];
      const assertParams = testAssertsGroup.filter(x => !!x).map(x => x!.assertParams);
      if(!assertParams.length) {
        continue;
      }
      const expectedList = flatten(testAssertsGroup.filter(x => !!x).map(x => x!.expectedList));
      logger.verbose(`verifying group: ${assertParams.map(p => `[${p.changedEntity},${p.id}]`)}`);
      const triggeredEntities = assertParams.map(e => { return { entity: e.changedEntity, id: e.id }; });
      const actualList = await changeDependencyTracker.getChangedEntityChain(triggeredEntities, TestWithDeleted);
      if(expectedList.length !== actualList.length) {
        const msg = `dependency assert FAILED, test name=${TestName}, assert triggered entities=${triggeredEntities.map(p => `[${p.entity}:${p.id}]`)}, expected changes count=${expectedList.length}, actual changes count=${actualList.length}, expectedList=[${expectedList.map(l => `[${l.entity},${l.id}]`).join(', ')}], actualList=[${actualList.map(l => `[${l.changedEntity},${l.id}]`).join(', ')}]`;
        logger.error(msg);
        throw new Error(msg);
      }

      for(let i = 0; i < expectedList.length; i++) {
        const expectedChange = expectedList[i];
        const verified = actualList.some(e => e.changedEntity === expectedChange.entity && e.id === expectedChange.id);
        if(!verified) {
          const msg = `dependency assert FAILED, test name=${TestName}, assert triggered entities=${triggeredEntities.map(p => `[${p.entity}:${p.id}]`)}, expected change entity=${expectedChange.entity}:${expectedChange.id} not present in actual changes list`;
          logger.error(msg);
          throw new Error(msg);
        }
      }

      logger.verbose(`group ${JSON.stringify(assertParams)} verified`);
    }
    logger.verbose('>>> expectations verified, cleaning up <<<');
    for(let i = 0; i < tests.length; i++) {
      await tests[i].testCase.cleanupTestData(tests[i].testData, dbRepository);
    }

    logger.info('==== STOPPED test case all at once with deleted ====');
  });  
});