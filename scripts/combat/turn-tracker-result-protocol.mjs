/**
 * D616 v0.2.210 — authenticated, routed acknowledgements for turn expenses.
 *
 * Foundry relays a socket sender ID separately from the packet. `userId`
 * MUST name that authenticated sender. The player awaiting an acknowledgement
 * is a different identity (`recipientUserId`). Never accept a claimed sender
 * from the packet as authority, and never acknowledge another player's spend.
 */
export function createTurnTrackerResult({requestId,senderUserId,recipientUserId,success}={}){
  if(!requestId||!senderUserId||!recipientUserId||typeof success!=='boolean')
    throw new Error('Malformed turn-tracker acknowledgement');
  return {
    type:'turnTrackerResult',requestId:String(requestId),
    userId:String(senderUserId),recipientUserId:String(recipientUserId),success,
  };
}

export function turnTrackerResultForRecipient(packet,authenticatedSender,viewerUserId){
  return packet?.type==='turnTrackerResult' &&
    authenticatedSender?.isGM===true &&
    !!authenticatedSender.id &&
    packet.userId===authenticatedSender.id &&
    typeof viewerUserId==='string' && viewerUserId.length>0 &&
    packet.recipientUserId===viewerUserId &&
    typeof packet.requestId==='string' && packet.requestId.length>0 &&
    typeof packet.success==='boolean';
}
