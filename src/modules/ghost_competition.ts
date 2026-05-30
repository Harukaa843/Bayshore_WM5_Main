import { Application } from "express";
import { Module } from "../module";
import { prisma } from "..";
import { Config } from "../config";

// Import Proto
import * as wm from "../wmmt/wm5.proto";

// Import Util
import * as common from "./util/common";

// Import OCM helper functions
import * as ghost_ocm from "./ghost/ghost_ocm";
import * as ghost_ocm_area from "./ghost/ghost_util/ghost_ocm_area";


export default class GhostCompetitionModule extends Module {
    register(app: Application): void {

        // Load ghost competition info - called when player selects OCM battle mode
        app.post('/method/load_ghost_competition_info', async (req, res) => {

            let body = wm.wm5.protobuf.LoadGhostCompetitionInfoRequest.decode(req.body);

            let date = Math.floor(new Date().getTime() / 1000);

            let ocmEventDate = await prisma.oCMEvent.findFirst({
                where: {
                    qualifyingPeriodStartAt: { lte: date },
                    competitionEndAt:        { gte: date },
                },
                orderBy: { competitionId: 'desc' },
            });

            let msg: any;

            if (ocmEventDate) {

                // --- Calculate periods if not yet done ---
                let ocmPeriodCount = await prisma.oCMPeriod.count({
                    where: { competitionId: ocmEventDate.competitionId }
                });

                if (ocmPeriodCount === 0) {
                    console.log('Calculating how many period(s) are available');

                    let periodStart = ocmEventDate.competitionStartAt;
                    let periodEnd   = 0;
                    let period      = 1;

                    while (periodStart < ocmEventDate.competitionCloseAt) {
                        periodEnd = periodStart + ocmEventDate.lengthOfPeriod;
                        if (periodEnd > ocmEventDate.competitionCloseAt) {
                            periodEnd = ocmEventDate.competitionCloseAt;
                        }
                        await prisma.oCMPeriod.create({
                            data: {
                                competitionDbId: ocmEventDate.dbId,
                                competitionId:   ocmEventDate.competitionId,
                                periodId:        period,
                                startAt:         periodStart,
                                closeAt:         periodEnd,
                            }
                        });
                        period++;
                        periodStart = periodEnd + ocmEventDate.lengthOfInterval;
                    }

                    // Fix gap between qualifying close and main draw start
                    let gap = ocmEventDate.competitionStartAt - ocmEventDate.qualifyingPeriodCloseAt;
                    if (gap < 3600) {
                        await prisma.oCMEvent.update({
                            where: { dbId: ocmEventDate.dbId },
                            data:  { qualifyingPeriodCloseAt: ocmEventDate.competitionStartAt - 3600 }
                        });
                    }

                    console.log('Calculating Period Completed!');
                }

                // --- Main draw ---
                if (ocmEventDate.competitionStartAt < date && ocmEventDate.competitionCloseAt > date) {
                    console.log('Current OCM Day: Competition Day / Main Draw');

                    let OCMCurrentPeriod = await prisma.oCMPeriod.findFirst({
                        where: {
                            competitionDbId: ocmEventDate.dbId,
                            competitionId:   ocmEventDate.competitionId,
                            startAt: { lte: date },
                            closeAt: { gte: date },
                        }
                    });

                    if (OCMCurrentPeriod) {
                        let OCMTallyCount = await prisma.oCMTally.count({
                            where: {
                                competitionId: OCMCurrentPeriod.competitionId,
                                periodId:      OCMCurrentPeriod.periodId,
                            }
                        });

                        if (OCMTallyCount === 0) {
                            await ghost_ocm.ocmTallying(body, OCMCurrentPeriod.periodId, false);
                            console.log('Tally Completed!');
                        }

                        let result = await ghost_ocm.ocmCompetitionDay(body, OCMCurrentPeriod.competitionId, OCMCurrentPeriod.periodId);
                        msg = result.msg;
                    } else {
                        msg = {
                            error:     wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                            closed:    true,
                            qualified: false,
                        };
                    }
                }
                // --- Qualifying ---
                else if (ocmEventDate.qualifyingPeriodStartAt < date && ocmEventDate.qualifyingPeriodCloseAt > date) {
                    console.log('Current OCM Day: Qualifying Day');

                    let result = await ghost_ocm.ocmQualifyingDay(body, ocmEventDate.competitionId);
                    msg = result.msg;
                }
                // --- Competition ended, reward phase ---
                else if (ocmEventDate.competitionCloseAt < date && ocmEventDate.competitionEndAt > date) {
                    console.log('Current OCM Day: OCM has Ended');

                    let OCMCurrentPeriod = await prisma.oCMPeriod.findFirst({
                        where: {
                            competitionDbId: ocmEventDate.dbId,
                            competitionId:   ocmEventDate.competitionId,
                        },
                        orderBy: { periodId: 'desc' }
                    });

                    if (OCMCurrentPeriod) {
                        let OCMTallyCount = await prisma.oCMTally.count({
                            where: {
                                competitionId: OCMCurrentPeriod.competitionId,
                                periodId:      999999999,
                            }
                        });

                        if (OCMTallyCount === 0) {
                            console.log('Final Tallying...');
                            await ghost_ocm.ocmTallying(body, OCMCurrentPeriod.periodId, true);
                            console.log('Last Tally Completed!');
                        }

                        // Give nameplate rewards if not yet given
                        let checkOneParticipant = await prisma.oCMPlayRecord.findFirst({
                            orderBy: { dbId: 'desc' }
                        });

                        if (checkOneParticipant) {
                            let itemId = [0,204,210,216,222,35,228,41,234,47,5,11,17,23,29,53,93,99,105,141,147,153][ocmEventDate.competitionId] ?? 0;

                            if (itemId !== 0) {
                                let checkNameplate = await prisma.carItem.count({
                                    where: {
                                        carId:    checkOneParticipant.carId,
                                        category: 17,
                                        itemId:   itemId,
                                    }
                                });

                                if (checkNameplate === 0) {
                                    await ghost_ocm.ocmGiveNamePlateReward(ocmEventDate.competitionId);
                                }
                            }
                        }
                    }

                    msg = {
                        error:  wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                        closed: true,
                    };
                }
                else {
                    msg = {
                        error:  wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                        closed: true,
                    };
                }
            }
            // No active OCM event
            else {
                msg = {
                    error:  wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                    closed: true,
                };
            }

            let message = wm.wm5.protobuf.LoadGhostCompetitionInfoResponse.encode(msg);
            common.sendResponse(message, res);
        });


        // Load ghost competition ranking
        app.post('/method/load_ghost_competition_ranking', async (req, res) => {

            let body = wm.wm5.protobuf.LoadGhostCompetitionRankingRequest.decode(req.body);

            let ocmEventDate = await prisma.oCMEvent.findFirst({
                where: { competitionId: body.competitionId },
            });

            let competitionSchedule = null;
            if (ocmEventDate) {
                competitionSchedule = wm.wm5.protobuf.GhostCompetitionSchedule.create({
                    competitionId:           ocmEventDate.competitionId,
                    qualifyingPeriodStartAt: ocmEventDate.qualifyingPeriodStartAt,
                    qualifyingPeriodCloseAt: ocmEventDate.qualifyingPeriodCloseAt,
                    competitionStartAt:      ocmEventDate.competitionStartAt,
                    competitionCloseAt:      ocmEventDate.competitionCloseAt,
                    competitionEndAt:        ocmEventDate.competitionEndAt,
                    lengthOfPeriod:          ocmEventDate.lengthOfPeriod,
                    lengthOfInterval:        ocmEventDate.lengthOfInterval,
                    area:                    ocmEventDate.area,
                    minigamePatternId:       ocmEventDate.minigamePatternId,
                });
            }

            let numOfParticipants = await prisma.oCMTally.count({
                where: { competitionId: body.competitionId },
            });

            let msg = {
                error:             wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                periodId:          0,
                numOfParticipants: numOfParticipants,
                competitionSchedule,
            };

            let message = wm.wm5.protobuf.LoadGhostCompetitionRankingResponse.encode(msg);
            common.sendResponse(message, res);
        });


        // Ghost competition target resource - returns the Top 1 OCM ghost to race against
        app.get('/resource/ghost_competition_target', async (req, res) => {

            let competition_id = Number(req.query.competition_id);
            let period_id      = Number(req.query.period_id);
            let date           = Math.floor(new Date().getTime() / 1000);

            // Get area/ramp/path defaults for this competition
            let OCMArea  = await ghost_ocm_area.OCMArea(competition_id);
            let areaVal  = OCMArea.areaVal;
            let rampVal  = OCMArea.rampVal;
            let pathVal  = OCMArea.pathVal;

            // Default place for non-human ghost
            let playedPlace = wm.wm5.protobuf.Place.create({
                placeId:  Config.getConfig().placeId,
                regionId: Config.getConfig().regionId,
                shopName: Config.getConfig().shopName,
                country:  Config.getConfig().country,
            });

            // Find OCM event
            let ocmEventDate = await prisma.oCMEvent.findFirst({
                where: {
                    qualifyingPeriodStartAt: { lte: date },
                    competitionEndAt:        { gte: date },
                },
                orderBy: { competitionId: 'desc' },
            });

            if (!ocmEventDate) {
                ocmEventDate = await prisma.oCMEvent.findFirst({
                    orderBy: { dbId: 'desc' },
                });
            }

            let ghostTrailId  = 0;
            
            let cars: any     = null;
            let competitionSchedule: any = null;

            // --- Main draw ---
            if (ocmEventDate && ocmEventDate.competitionStartAt < date && ocmEventDate.competitionCloseAt > date) {
                console.log('OCM Competition Day / Main Draw');

                let ocmTallyRecord = await prisma.oCMTop1Ghost.findFirst({
                    where: {
                        competitionId: competition_id,
                        periodId:      period_id,
                    },
                    orderBy: { result: 'desc' },
                });

                let checkGhostTrail = await prisma.oCMTop1GhostTrail.findFirst({
                    where: {
                        carId:         ocmTallyRecord!.carId,
                        competitionId: ocmEventDate.competitionId,
                        periodId:      period_id,
                        area:          areaVal,
                        ramp:          rampVal,
                        path:          pathVal,
                    },
                    orderBy: { playedAt: 'desc' },
                });

                if (checkGhostTrail) {
                    cars = await prisma.car.findFirst({
                        where:   { carId: checkGhostTrail.carId },
                        include: { gtWing: true, lastPlayedPlace: true },
                    });

                    if (cars && ocmTallyRecord) {
                        cars.tunePower     = ocmTallyRecord.tunePower ?? cars.tunePower;
                        cars.tuneHandling  = ocmTallyRecord.tuneHandling ?? cars.tuneHandling;
                        cars.lastPlayedAt  = checkGhostTrail.playedAt;
                    }

                    ghostTrailId = checkGhostTrail.dbId;
                }
            }
            // --- Qualifying day - use default S660 ghost ---
            else if (ocmEventDate && ocmEventDate.qualifyingPeriodStartAt < date && ocmEventDate.qualifyingPeriodCloseAt > date) {
                console.log('OCM Qualifying Day');

                // Try to find seeded trail, relaxing area/ramp/path filter as fallback
                let checkGhostTrail = await prisma.oCMTop1GhostTrail.findFirst({
                    where: {
                        carId:         999999999,
                        competitionId: ocmEventDate.competitionId,
                        periodId:      0,
                    },
                    orderBy: { playedAt: 'desc' },
                });

                // Auto-create seed trail if none exists so the game can proceed
                if (!checkGhostTrail) {
                    console.log('OCM: No qualifying seed trail found, auto-creating default S660 trail');
                    checkGhostTrail = await prisma.oCMTop1GhostTrail.create({
                        data: {
                            carId:         999999999,
                            area:          areaVal,
                            ramp:          rampVal,
                            path:          pathVal,
                            trail:         Buffer.from([1, 2, 3, 4]),
                            competitionId: ocmEventDate.competitionId,
                            periodId:      0,
                            playedAt:      date,
                            tunePower:     17,
                            tuneHandling:  17,
                        }
                    });
                }

                // Generate default S660 car data
                cars = wm.wm5.protobuf.Car.create({
                    carId:         999999999, // Don't change this
                    name:          'Ｒ３２',
                    regionId:      18,
                    manufacturer: 5,
                    model: 29,
                    visualModel: 32,
                    defaultColor:  0,
                    customColor:   0,
                    wheel:         20,
                    wheelColor:    0,
                    aero:          0,
                    bonnet:        0,
                    wing:          0,
                    mirror:        0,
                    sticker:       0,
                    stickerColor:  0,
                    sideSticker:   0,
                    sideStickerColor: 0,
                    roofSticker:   0,
                    roofStickerColor: 0,
                    specialSticker: 0,
                    specialStickerColor: 0,
                    neon:          0,
                    trunk:         0,
                    plate:         0,
                    plateColor:    0,
                    plateNumber:   0,
                    tunePower:     checkGhostTrail.tunePower,
                    tuneHandling:  checkGhostTrail.tuneHandling,
                    rivalMarker:   32,
                    aura:          0,
                    title:         0,
                    level:         65,
                    lastPlayedAt:  checkGhostTrail.playedAt,
                    country:       'JPN',
                    lastPlayedPlace: playedPlace,
                } as any);

                ghostTrailId = checkGhostTrail.dbId;
                
            }
            // --- Post-competition (ended, reward phase) ---
            else if (ocmEventDate && ocmEventDate.competitionCloseAt < date && ocmEventDate.competitionEndAt > date) {
                // Stub - competition has ended, show nothing
            }
            // --- Fallback: show last competition's top ghost ---
            else {
                console.log('OCM has ended - showing final top ghost');

                let ocmTallyRecord = await prisma.oCMTop1Ghost.findFirst({
                    where:   { competitionId: competition_id, periodId: 999999999 },
                    orderBy: { result: 'desc' },
                });

                let checkGhostTrail = await prisma.oCMTop1GhostTrail.findFirst({
                    where:   { competitionId: competition_id, periodId: 999999999 },
                    orderBy: { playedAt: 'desc' },
                });

                if (checkGhostTrail) {
                    cars = await prisma.car.findFirst({
                        where:   { carId: checkGhostTrail.carId },
                        include: { gtWing: true, lastPlayedPlace: true },
                    });

                    if (cars && ocmTallyRecord) {
                        cars.tunePower    = ocmTallyRecord.tunePower    ?? cars.tunePower;
                        cars.tuneHandling = ocmTallyRecord.tuneHandling ?? cars.tuneHandling;
                        cars.lastPlayedAt = checkGhostTrail.playedAt;
                    }

                    ghostTrailId = checkGhostTrail.dbId;

                    // Attach shop name from battle record
                    let checkShopName = await prisma.oCMGhostBattleRecord.findFirst({
                        where:  { carId: checkGhostTrail.carId, competitionId: competition_id },
                        select: { shopName: true },
                    });
                    if (checkShopName && cars?.lastPlayedPlace) {
                        cars.lastPlayedPlace.shopName = checkShopName.shopName;
                    }

                    // Build competition schedule
                    let eventForSchedule = await prisma.oCMEvent.findFirst({
                        where: { competitionId: competition_id },
                    });
                    if (eventForSchedule) {
                        competitionSchedule = wm.wm5.protobuf.GhostCompetitionSchedule.create({
                            competitionId:           eventForSchedule.competitionId,
                            qualifyingPeriodStartAt: eventForSchedule.qualifyingPeriodStartAt,
                            qualifyingPeriodCloseAt: eventForSchedule.qualifyingPeriodCloseAt,
                            competitionStartAt:      eventForSchedule.competitionStartAt,
                            competitionCloseAt:      eventForSchedule.competitionCloseAt,
                            competitionEndAt:        eventForSchedule.competitionEndAt,
                            lengthOfPeriod:          eventForSchedule.lengthOfPeriod,
                            lengthOfInterval:        eventForSchedule.lengthOfInterval,
                            area:                    eventForSchedule.area,
                            minigamePatternId:       eventForSchedule.minigamePatternId,
                        });
                    }
                }
            }

            // Build ghost car
            let ghostCars = wm.wm5.protobuf.GhostCar.create({
                car:      cars!,
                area:     areaVal,
                ramp:     rampVal,
                nonhuman: false,
            });

            let msg = {
                competitionId:       competition_id,
                specialGhostId:      competition_id,
                ghostCar:            ghostCars,
                trailId:             ghostTrailId,
                updatedAt:           date,
                competitionSchedule: competitionSchedule || null,
            };

            let message = wm.wm5.protobuf.GhostCompetitionTarget.encode(msg);
            common.sendResponse(message, res);
        });
    }
}