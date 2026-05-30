import { Application } from "express";
import { Module } from "module";
import { prisma } from "..";

// Import Proto
import * as wm from "../wmmt/wm5.proto";

// Import Util
import * as common from "./util/common";


export default class StartupModule extends Module {
    register(app: Application): void {

        // Register system info upon booting
        app.post('/method/register_system_info', async (req, res) => {

            // Get the request body
            let body = wm.wm5.protobuf.RegisterSystemInfoRequest.decode(req.body);
            
            // Get OCM info
            let date = Math.floor(new Date().getTime() / 1000);
            let ocmEvent = await prisma.oCMEvent.findFirst({
                where: {
                    qualifyingPeriodStartAt: { lte: date },
                    competitionEndAt:        { gte: date },
                },
                orderBy: { competitionId: 'desc' },
            });

            let competitionSchedule = null;
            if (ocmEvent) {
                competitionSchedule = wm.wm5.protobuf.GhostCompetitionSchedule.create({
                    competitionId:           ocmEvent.competitionId,
                    qualifyingPeriodStartAt: ocmEvent.qualifyingPeriodStartAt,
                    qualifyingPeriodCloseAt: ocmEvent.qualifyingPeriodCloseAt,
                    competitionStartAt:      ocmEvent.competitionStartAt,
                    competitionCloseAt:      ocmEvent.competitionCloseAt,
                    competitionEndAt:        ocmEvent.competitionEndAt,
                    lengthOfPeriod:          ocmEvent.lengthOfPeriod,
                    lengthOfInterval:        ocmEvent.lengthOfInterval,
                    area:                    ocmEvent.area,
                    minigamePatternId:       ocmEvent.minigamePatternId,
                });
            }

            // Response data
            let msg = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                regionId: body.allnetRegion0,
                placeId: body.regionName0,

                // Car Campaign
                carCampaignStartAt: 0,
                carCampaignEndAt: 0,

                teamSuspensionAnnouncementStartAt: 2147483647, // idk what this is
                teamSuspensionStartAt: 2147483647, // idk what this is
                sendingReportPermitted: false,
                featureVersion: {
                    version: 9,
                    year: 2021,
                    month: 7,
                    pluses: 0,
                    releaseAt: 0 // idk what this is
                },

                // Competition (OCM)
                latestCompetitionId: ocmEvent?.competitionId || null,
                competitionSchedule: competitionSchedule,

                // Special Ghost (VS Maxi G Truck)
                specialGhostSchedule: null,

                // Face Recognition
                faceRecognitionPermitted: false,

                bnidServerAvailable: true,
                banacoinAvailable: true,
                banacoinAffiliatedPlace: true,
                scratchAvailable: true,
                displayOfScratchTerms: true,
                scratchNotes: 'Scratch Scratch Meow Meow',
                scratchTerms: 'Scratch',  
            }

            // Encode the response
            let message = wm.wm5.protobuf.RegisterSystemInfoResponse.encode(msg);

            // Send the response to the client
            common.sendResponse(message, res);
        })


        // Ping
        app.post('/method/ping', (req, res) => {

            let body = wm.wm5.protobuf.PingRequest.decode(req.body);

            // Response data
            let ping = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                pong: body.ping || 1,
                bnidServerAvailable: true,
                banacoinAvailable: true
            };

            // Encode the response
            let message = wm.wm5.protobuf.PingResponse.encode(ping);

            // Send the response to the client
            common.sendResponse(message, res);
        })

        
        // Register System Stats
		app.post('/method/register_system_stats', async (req, res) => {

            let body = wm.wm5.protobuf.RegisterSystemStatsRequest.decode(req.body);

            // TODO: Actual stuff here
            // This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
			}

			// Encode the response
			let message = wm.wm5.protobuf.RegisterSystemStatsResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})


        // Ask Access Code
        app.post('/method/ask_access_code', async (req, res) => {

            let body = wm.wm5.protobuf.AskAccessCodeRequest.decode(req.body);

            // TODO: Actual stuff here
            // This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                accessCode: '278313042069'
			}

			// Encode the response
			let message = wm.wm5.protobuf.AskAccessCodeResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
            
        })
    }
}
