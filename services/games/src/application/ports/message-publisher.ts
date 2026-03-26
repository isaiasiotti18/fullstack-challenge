import { BetPlacedMessage, RoundEndedMessage } from "../../infrastructure/messaging/events";

export interface MessagePublisher {
  publishBetPlaced(event: BetPlacedMessage): Promise<void>;
  publishRoundEnded(event: RoundEndedMessage): Promise<void>;
}
