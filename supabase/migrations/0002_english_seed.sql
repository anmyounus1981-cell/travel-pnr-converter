-- Replace the old demonstration quote in the already-applied seed.
update conversions
set whatsapp_output = '*TRAVEL QUOTE*
Booking reference: ABC123

*Passengers*
MOHAMMAD RAHIM (adult)
FATIMA RAHIM (adult)

*Flights*
BG 341: DAC to DXB
EK 003: DXB to LHR

*Fare:* BDT 85,000
*Baggage:* 30kg checked + 7kg cabin
*Cancellation:* Non-refundable
*Reissue:* Reissue fee BDT 5,000'
where id = 'a1111111-1111-1111-1111-111111111111';
