// Import Proto
import { prisma } from "../..";
import { Config } from "../../config";
import * as wm from "../../wmmt/wm5.proto";

// Import Util
import * as common from "../util/common";
import * as ghost_stamp from "./ghost_stamp";
import * as ghost_get_area_from_path from "./ghost_util/ghost_get_area_from_path";


// Save ghost history battle
export async function saveGhostHistory(body: wm.wm5.protobuf.SaveGameResultRequest)
{
    console.log('Saving Ghost Battle History');
    
    let updateNewTrail: boolean = true;
    let saveExGhostHistory: any = {};

    // Get the car result for the car
    let car = body?.car;

    if(car)
    {
        saveExGhostHistory = {
            carId: common.sanitizeInput(car.carId),
            tunePower: common.sanitizeInput(car.tunePower),
            tuneHandling: common.sanitizeInput(car.tuneHandling),
            playedAt: common.sanitizeInputNotZero(body.playedAt),
            playedShopName: Config.getConfig().shopName
        }
    }

    // Get the rg result for the car
    let rgResult = body?.rgResult;

    if(rgResult)
    {
        if(rgResult.opponentCarId)
        {
            // wm5 proto has single opponent via opponentCarId
            saveExGhostHistory.opponent1CarId = rgResult.opponentCarId;
            saveExGhostHistory.opponent1TunePower = 0;
            saveExGhostHistory.opponent1TuneHandling = 0;
            saveExGhostHistory.opponent1Result = rgResult.result;
        }

        // Get played Area
        if(common.sanitizeInput(rgResult.area))
        {
            let getArea = await ghost_get_area_from_path.getArea(rgResult.area);

            saveExGhostHistory.area = getArea.area
        }
    }

    await prisma.ghostBattleRecord.create({
        data: saveExGhostHistory
    });

    // Sending stamp to opponents
    await ghost_stamp.sendStamp(body);

    // Return the value to 'BASE_PATH/src/util/games/ghost.ts'
    return { updateNewTrail }
}


export async function saveOCMGhostHistory(body: wm.wm5.protobuf.SaveGameResultRequest)
{
    let updateNewTrail: boolean = true;
    let saveExGhostHistory: any = {};

    // Get the car result for the car
    let car = body?.car;

    if(car)
    {
        saveExGhostHistory = {
            carId: common.sanitizeInput(car.carId),
            tunePower: common.sanitizeInput(car.tunePower),
            tuneHandling: common.sanitizeInput(car.tuneHandling),
            playedAt: common.sanitizeInputNotZero(body.playedAt),
            playedShopName: Config.getConfig().shopName
        }
    }

    // Get the rg result for the car
    let rgResult = body?.rgResult;

    if(rgResult)
    {
        if(rgResult.opponentCarId)
        {
            // Get the advantage distance between first opponent and user
            saveExGhostHistory.result = rgResult.result;
        }

        // Get area
        if(common.sanitizeInput(rgResult.area))
        {
            let getArea = await ghost_get_area_from_path.getArea(rgResult.area);

            saveExGhostHistory.area = getArea.area
        }
    }

    // Get current date
    let date = Math.floor(new Date().getTime() / 1000);

    // Get currently active OCM event
    let ocmEventDate = await prisma.oCMEvent.findFirst({ 
        where: {
            // qualifyingPeriodStartAt is less than current date
            qualifyingPeriodStartAt: { lte: date },

            // competitionEndAt is greater than current date
            competitionEndAt: { gte: date },
        },
        orderBy:{
            competitionId: 'desc'
        }
    });

    // ----------Get available OCM Record (Qualifying or Main Draw)----------
    // Current date is OCM main draw
    let countGBR;
    if(ocmEventDate!.competitionStartAt < date && ocmEventDate!.competitionCloseAt > date)
    {
        // Set OCM Main draw value to true 
        saveExGhostHistory.ocmMainDraw = true

        // Get the user's available OCM Battle Record data
        countGBR = await prisma.oCMTally.findFirst({ 
            where:{
                carId: saveExGhostHistory.carId,
                competitionId: ocmEventDate!.competitionId,
            }
        });
    }
    // Current date is OCM qualifying day
    else
    { 
        // Set OCM Main draw value to false 
        saveExGhostHistory.ocmMainDraw = false

        // Get the user's available OCM Battle Record data
        countGBR = await prisma.oCMGhostBattleRecord.findFirst({ 
            where:{
                carId: saveExGhostHistory.carId,
                ocmMainDraw: saveExGhostHistory.ocmMainDraw,
                competitionId: ocmEventDate!.competitionId,
                periodId: 0
            }
        });
    }
    // ----------------------------------------------------------------

    // User have OCM Battle Record data available
    if(countGBR)
    { 
        // Check if the newest advantage distance is bigger than the older advantage distance
        if(countGBR.result < saveExGhostHistory.result)
        {
            console.log('OCM Ghost Tally found');

            // Current date is OCM Main Draw
            if(ocmEventDate!.competitionStartAt < date && ocmEventDate!.competitionCloseAt > date)
            {
                // Get OCM Period ID
                let OCM_periodId = await prisma.oCMPeriod.findFirst({ 
                    where:{
                        competitionId: ocmEventDate!.competitionId,
                        startAt: 
                        {
                            lte: date, // competitionStartAt is less than current date
                        },
                        closeAt:
                        {
                            gte: date, // competitionCloseAt is greater than current date
                        }
                    },
                    select:{
                        periodId: true
                    }
                });

                // Period ID not found
                if(!(OCM_periodId))
                {
                    OCM_periodId = await prisma.oCMPeriod.findFirst({ 
                        where:{
                            competitionId: ocmEventDate!.competitionId,
                            startAt: 
                            {
                                lte: date - ocmEventDate!.lengthOfInterval, // competitionStartAt is less than current date
                            },
                            closeAt:
                            {
                                gte: date - ocmEventDate!.lengthOfInterval, // competitionCloseAt is greater than current date
                            }
                        },
                        select:{
                            periodId: true
                        }
                    });
                }

                let checkGhost = await prisma.oCMGhostBattleRecord.findFirst({ 
                    where:{
                        carId: saveExGhostHistory.carId,
                        competitionId: ocmEventDate!.competitionId,
                    }
                });

                if(checkGhost)
                {
                    console.log('Updating OCM Ghost Battle Record entry');
                    
                    // Get the user's available OCM Battle Record data
                    let getGBR = await prisma.oCMGhostBattleRecord.findFirst({ 
                        where:{
                            carId: saveExGhostHistory.carId,
                            competitionId: ocmEventDate!.competitionId,
                        }
                    });

                    // Update ghost battle record
                    await prisma.oCMGhostBattleRecord.update({
                        where:{
                            dbId: getGBR!.dbId
                        },
                        data: {
                            ...saveExGhostHistory,
                            competitionId: ocmEventDate!.competitionId,
                            periodId: OCM_periodId!.periodId
                        }
                    });  
                }
                else
                {
                    console.log('Creating new OCM Ghost Battle Record entry');

                    // Create new ghost battle record
                    await prisma.oCMGhostBattleRecord.create({
                        data: {
                            ...saveExGhostHistory,
                            competitionId: ocmEventDate!.competitionId,
                            periodId: OCM_periodId!.periodId
                        }
                    }); 
                }

                console.log('Updating OCM Tally Record');

                // Update the OCM Tally Record
                await prisma.oCMTally.update({
                    where:{
                        dbId: countGBR.dbId
                    },
                    data: {
                        periodId: OCM_periodId!.periodId,
                        result: body.rgResult!.result,
                        }
                });
            }
            // Current date is OCM Qualifying
            else
            {
                // Update ghost battle record
                await prisma.oCMGhostBattleRecord.update({
                    where:{
                        dbId: countGBR.dbId
                    },
                    data: {
                        ...saveExGhostHistory,
                        competitionId: ocmEventDate!.competitionId,
                        periodId: 0
                    }
                });
            }
        }
        // Newest advantage distance is smaller than the older advantage distance
        else
        { 
            console.log('Result record is lower than previous record');

            // Don't update the User's OCM ghost trail
            updateNewTrail = false; 
        }
    }
    // User don't have OCM Battle Record data available
    else
    { 
        console.log('OCM Ghost Battle Record not found');
        console.log('Creating new OCM Ghost Battle Record entry');

        // Current date is OCM Main Draw
        if(ocmEventDate!.competitionStartAt < date && ocmEventDate!.competitionCloseAt > date)
        {
            // Get OCM Period ID
            let OCM_periodId = await prisma.oCMPeriod.findFirst({ 
                where:{
                    competitionId: ocmEventDate!.competitionId,
                    startAt: 
                    {
                        lte: date - ocmEventDate!.lengthOfInterval, // competitionStartAt is less than current date
                    },
                    closeAt:
                    {
                        gte: date - ocmEventDate!.lengthOfInterval, // competitionCloseAt is greater than current date
                    }
                },
                select:{
                    periodId: true
                }
            });

            if (OCM_periodId)
            {
                // Update ghost battle record
                await prisma.oCMGhostBattleRecord.create({
                    data: {
                        ...saveExGhostHistory,
                        competitionId: ocmEventDate!.competitionId,
                        periodId: OCM_periodId!.periodId
                    }
                });

                let ocmTallyfind = await prisma.oCMTally.findFirst({
                    where:{
                        carId: saveExGhostHistory.carId,
                        competitionId: ocmEventDate!.competitionId,
                    },
                });

                if(ocmTallyfind)
                {
                    console.log('Updating OCM Tally Record');

                    // Update the OCM Tally Record
                    await prisma.oCMTally.update({
                        where:{
                            dbId: ocmTallyfind.dbId
                        },
                        data: {
                            periodId: OCM_periodId!.periodId,
                            result: body.rgResult!.result,
                            }
                    });
                }
                else
                {
                    // Create the OCM Tally Record
                    await prisma.oCMTally.create({
                        data: {
                            carId: body.car?.carId!,
                            competitionId: ocmEventDate!.competitionId,
                            periodId: OCM_periodId!.periodId,
                            result: body.rgResult!.result,
                            }
                    });
                }
            }
        }
        // Current date is OCM Qualifying
        else
        {
            // Update ghost battle record
            await prisma.oCMGhostBattleRecord.create({
                data: {
                    ...saveExGhostHistory,
                    competitionId: ocmEventDate!.competitionId,
                    periodId: 0
                }
            });
        }
    }

    // Return the value to 'BASE_PATH/src/util/games/ghost.ts'
    return { updateNewTrail }
}