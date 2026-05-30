import { Application } from "express";
import { Module } from "../module";
import { prisma } from "..";

// Import Proto
import * as wm from "../wmmt/wm5.proto";
import * as svc from "../wmmt/service.proto";

// Import Util
import * as common from "./util/common";


export default class GhostModule extends Module {
    register(app: Application): void {

        // Load ghost battle info - called before ghost battle starts
        app.post('/method/load_ghost_battle_info', async (req, res) => {

            let body = wm.wm5.protobuf.LoadGhostBattleInfoRequest.decode(req.body);

            let date = Math.floor(new Date().getTime() / 1000);

            // Try to find a default opponent ghost from crown holders
            let defaultOpponent = null;
            let crownEntry = await prisma.carCrown.findFirst({
                include: {
                    car: {
                        include: {
                            gtWing: true,
                            lastPlayedPlace: true
                        }
                    }
                }
            });

            if (crownEntry) {
                defaultOpponent = {
                    car: crownEntry.car,
                    area: crownEntry.area,
                    ramp: 0,
                    nonhuman: false,
                    characterEffect: crownEntry.car.rgCharacterEffect,
                };
            }

            // Check if an OCM event is currently active and build specialGhost
            let specialGhost = null;
            let ocmEvent = await prisma.oCMEvent.findFirst({
                where: {
                    qualifyingPeriodStartAt: { lte: date },
                    competitionEndAt:        { gte: date },
                },
                orderBy: { competitionId: 'desc' },
            });

            if (ocmEvent) {
                // Get the current top 1 OCM ghost trail
                let ocmTrail = await prisma.oCMTop1GhostTrail.findFirst({
                    where: { competitionId: ocmEvent.competitionId },
                    orderBy: { periodId: 'desc' },
                });

                if (ocmTrail) {
                    // Get the car for this trail
                    let ocmCar = ocmTrail.carId === 999999999
                        ? null
                        : await prisma.car.findFirst({
                            where:   { carId: ocmTrail.carId },
                            include: { gtWing: true, lastPlayedPlace: true },
                        });

                    // Build a placeholder car for the S660 default ghost
                    if (!ocmCar) {
                        ocmCar = {
                            carId: 999999999,
                            name: 'Ｒ３２',
                            regionId: 18,
                            manufacturer: 5,
                            model: 29,
                            visualModel: 32,
                            defaultColor: 0,
                            customColor: 0,
                            wheel: 20,
                            wheelColor: 0,
                            aero: 0, bonnet: 0, wing: 0, mirror: 0,
                            sticker: 0, stickerColor: 0,
                            sideSticker: 0, sideStickerColor: 0,
                            roofSticker: 0, roofStickerColor: 0,
                            specialSticker: 0, specialStickerColor: 0,
                            neon: 0, trunk: 0, plate: 0,
                            plateColor: 0, plateNumber: 0,
                            tunePower: ocmTrail.tunePower,
                            tuneHandling: ocmTrail.tuneHandling,
                            rivalMarker: 32, aura: 0,
                            title: 0,
                            level: 65,
                            lastPlayedAt: ocmTrail.playedAt,
                            country: 'JPN',
                        } as any;
                    }

                    specialGhost = {
                        car:      ocmCar,
                        area:     ocmTrail.area,
                        ramp:     ocmTrail.ramp,
                        nonhuman: ocmTrail.carId === 999999999,
                    };
                }
            }

            let msg = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                friendCars: [],
                challengers: [],
                stampTargetCars: [],
                previousVersionStampTargetCars: [],
                hasHistory: false,
                weakenedCars: [],
                defaultOpponent: defaultOpponent,
                stampSheetCount: 0,
                stampSheet: [],
                specialGhost: specialGhost,
            };

            let message = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode(msg as any);
            common.sendResponse(message, res);
        });

        // Lock crown - called when a player is about to challenge a crown holder
        app.post('/method/lock_crown', async (req, res) => {

            let body = svc.wm5.protobuf.LockCrownRequest.decode(req.body);

            // Reserve the crown during battle so it can't be challenged simultaneously
            await prisma.carCrown.updateMany({
                where: {
                    carId: body.carId,
                    area: body.area,
                },
                data: {
                    lockedAt: Math.floor(Date.now() / 1000),
                }
            });

            let msg = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
            };

            let message = svc.wm5.protobuf.LockCrownResponse.encode(msg);
            common.sendResponse(message, res);
        });

        // Save ghost battle result - updates win/loss counts and crown ownership
        app.post('/method/save_ghost_battle_result', async (req, res) => {

            // Note: In WMMT5, ghost battle results are saved via save_game_result.
            // This handler is a stub in case the game calls it separately.
            let msg = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
            };

            let message = wm.wm5.protobuf.SaveGameResultResponse.encode(msg);
            common.sendResponse(message, res);
        });

        // Ghost trail resource - returns the actual trail bytes for a specific ghost
        app.get('/resource/ghost_trail', async (req, res) => {

            let car_id   = Number(req.query.car_id);
            let trail_id = Number(req.query.trail_id);

            let date = Math.floor(new Date().getTime() / 1000);

            // Try OCMTop1GhostTrail first (for OCM competition ghosts)
            let ocmTrail = await prisma.oCMTop1GhostTrail.findFirst({
                where: { dbId: trail_id, carId: car_id },
            });

            if (ocmTrail) {
                let msg = {
                    carId:     ocmTrail.carId,
                    area:      ocmTrail.area,
                    ramp:      ocmTrail.ramp,
                    playedAt:  ocmTrail.playedAt,
                    trail:     ocmTrail.trail ? new Uint8Array(ocmTrail.trail) : new Uint8Array([1, 2, 3, 4]),
                };
                let message = wm.wm5.protobuf.GhostTrail.encode(msg);
                common.sendResponse(message, res);
                return;
            }

            // Try normal GhostTrail (for crown / normal ghost battles)
            let normalTrail = await prisma.ghostTrail.findFirst({
                where: { dbId: trail_id, carId: car_id },
                include: { car: { include: { lastPlayedPlace: true } } },
            });

            if (normalTrail) {
                let msg = {
                    carId:       normalTrail.carId,
                    area:        normalTrail.area,
                    ramp:        normalTrail.ramp,
                    playedAt:    normalTrail.playedAt,
                    playedPlace: normalTrail.car?.lastPlayedPlace ?? null,
                    trail:       normalTrail.trail ? new Uint8Array(normalTrail.trail) : new Uint8Array([1, 2, 3, 4]),
                };
                let message = wm.wm5.protobuf.GhostTrail.encode(msg);
                common.sendResponse(message, res);
                return;
            }

            // Trail not found - return empty trail so game can still proceed
            console.log(`Ghost trail not found: car_id=${car_id}, trail_id=${trail_id}`);
            let msg = {
                carId:    car_id,
                area:     0,
                ramp:     0,
                playedAt: date,
                trail:    new Uint8Array([1, 2, 3, 4]),
            };
            let message = wm.wm5.protobuf.GhostTrail.encode(msg);
            common.sendResponse(message, res);
        });

        // Ghost summary resource - returns list of ghost cars for area selection
        app.get('/resource/ghost_summary', async (req, res) => {

            // Get all crown holders to show as ghost opponents
            let crowns = await prisma.carCrown.findMany({
                include: {
                    car: {
                        include: {
                            gtWing: true,
                            lastPlayedPlace: true
                        }
                    }
                }
            });

            // Build ghost list from crown holders
            let ghosts = crowns.map(crown => ({
                car: crown.car,
                area: crown.area,
                ramp: 0,
                nonhuman: false,
                characterEffect: crown.car.rgCharacterEffect,
            }));

            let message = wm.wm5.protobuf.GhostSummary.encode({ ghosts });
            common.sendResponse(message, res);
        });
    }
}