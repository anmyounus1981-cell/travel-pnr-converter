import type { PnrFixture } from "../../types/pnr";

/** Redacted excerpts from the observed layouts. All expectations are entered
 * by hand; the parser must not manufacture these from the input text. */
export const fixtures = [
  {
    id: "galileo_cx_wrapped", gds: "galileo",
    raw: `TEST01/KJ DACOU 81WJKJ AG 00000000 27JUN
1.1DOE/ASHEKA
MRS  2.1DOE/FAISAL MR
3.1DOE/SANAYA ALEENA MS  4.1DOE/AYAAN ZARRAF MR
1. CX 662 Q 14NOV DACHKG HK4 0210
0810 O* E SA 1
2. CX 506 Q 14NOVHKGKIX HK4 1025
1510 O* E SA 1
3. ARNK
4. CX 549 Q 28NOV HNDHKG HK4 1620
2000 O* E SA 2
5. CX 667 Q 28NOV HKGDAC HK4 2255
#0100 O* E SA/SU 2
* FILED FARE DATA EXISTS * >*FF`,
    expected: {
      passengerCount: 4, flightCount: 4, groundGapCount: 1,
      passengers: [
        { name: "DOE ASHEKA", source: { startLine: 2, endLine: 3, excerpt: "DOE/ASHEKA" } },
        { name: "DOE FAISAL", source: { startLine: 3, endLine: 3, excerpt: "DOE/FAISAL" } },
        { name: "DOE SANAYA ALEENA", source: { startLine: 4, endLine: 4, excerpt: "DOE/SANAYA ALEENA" } },
        { name: "DOE AYAAN ZARRAF", source: { startLine: 4, endLine: 4, excerpt: "DOE/AYAAN ZARRAF" } },
      ],
      flights: [
        { segmentNumber: "1", airline: "CX", flightNumber: "662", origin: "DAC", destination: "HKG", status: "HK4", rbd: "Q", source: { startLine: 5, endLine: 6, excerpt: "CX 662 Q" } },
        { segmentNumber: "2", airline: "CX", flightNumber: "506", origin: "HKG", destination: "KIX", status: "HK4", rbd: "Q", source: { startLine: 7, endLine: 8, excerpt: "CX 506 Q" } },
        { segmentNumber: "4", airline: "CX", flightNumber: "549", origin: "HND", destination: "HKG", status: "HK4", rbd: "Q", source: { startLine: 10, endLine: 11, excerpt: "CX 549 Q" } },
        { segmentNumber: "5", airline: "CX", flightNumber: "667", origin: "HKG", destination: "DAC", status: "HK4", rbd: "Q", source: { startLine: 12, endLine: 13, excerpt: "CX 667 Q" } },
      ],
      groundGaps: [{ segmentNumber: "3", source: { startLine: 9, endLine: 9, excerpt: "ARNK" } }],
    },
  },
  {
    id: "galileo_ek_wrapped", gds: "galileo",
    raw: `1.1DOE/NABAN MR
1. EK
583 X 14AUG DACDXB HS1 1230 1555 O E WE 1
2. EK 203 E 17AUG DXBJFK HS1 0235 0815 O E SA 1
3. EK 204 E 14SEP JFKDXB HS1 1120 #0755 O E TH/FR 2
4. EK 584 X 17SEP DXBDAC HS1 1645 2320 O E SU 2
* FILED FARE DATA EXISTS * >*FF`,
    expected: {
      passengerCount: 1, flightCount: 4, groundGapCount: 0,
      passengers: [{ name: "DOE NABAN", source: { startLine: 1, endLine: 1, excerpt: "DOE/NABAN" } }],
      flights: [
        { segmentNumber: "1", airline: "EK", flightNumber: "583", origin: "DAC", destination: "DXB", status: "HS1", rbd: "X", source: { startLine: 2, endLine: 3, excerpt: "583 X" } },
        { segmentNumber: "2", airline: "EK", flightNumber: "203", origin: "DXB", destination: "JFK", status: "HS1", rbd: "E", source: { startLine: 4, endLine: 4, excerpt: "EK 203 E" } },
        { segmentNumber: "3", airline: "EK", flightNumber: "204", origin: "JFK", destination: "DXB", status: "HS1", rbd: "E", source: { startLine: 5, endLine: 5, excerpt: "EK 204 E" } },
        { segmentNumber: "4", airline: "EK", flightNumber: "584", origin: "DXB", destination: "DAC", status: "HS1", rbd: "X", source: { startLine: 6, endLine: 6, excerpt: "EK 584 X" } },
      ], groundGaps: [],
    },
  },
  {
    id: "galileo_bs_spaced", gds: "galileo",
    raw: `TEST02/SA DACOU 7M6WSA AG 00000000 22JUL
1.1DOE/JANE ANN MRS  2.1DOE/JOHN ADAM MR
1 . BS 105 K 25JUL DACCGP HK2 0940 1035 O* E FR
2 . BS 322 K 27JUL CGPOAC HK2 0940 1035 O* E SU
VENDOR LOCATOR DATA EXISTS >*VL
VENDOR REMARKS
VRMK-VI/ABS *ADTK1GB5// TTL FOR AUTO CANX FIXED FOR 22JUL25 AT 1102 GMT`,
    expected: {
      passengerCount: 2, flightCount: 2, groundGapCount: 0,
      passengers: [
        { name: "DOE JANE ANN", source: { startLine: 2, endLine: 2, excerpt: "DOE/JANE ANN" } },
        { name: "DOE JOHN ADAM", source: { startLine: 2, endLine: 2, excerpt: "DOE/JOHN ADAM" } },
      ],
      flights: [
        { segmentNumber: "1", airline: "BS", flightNumber: "105", origin: "DAC", destination: "CGP", status: "HK2", rbd: "K", source: { startLine: 3, endLine: 3, excerpt: "BS 105 K" } },
        { segmentNumber: "2", airline: "BS", flightNumber: "322", origin: "CGP", destination: "OAC", status: "HK2", rbd: "K", source: { startLine: 4, endLine: 4, excerpt: "BS 322 K" } },
      ], groundGaps: [],
    },
  },
  {
    id: "sabre_cz_weekday", gds: "sabre",
    raw: `1.1DOE/MARUF MR
3 CZ5016E 11SEP 5 DACCAN*HK1 1315 1905 HRS /DCCZ*XXXXXX /E
4 CZ 329E 12SEP 6 CANYVR*HK1 0050 2145 11SEP 5 HRS
/DCCZ*XXXXXX /E
TKT/TIME LIMIT
1.T-09JUL-XXXX*ASQ
GENERAL FACTS
1.SSR ADPI 1B HK1 CZ0329 REQ SEC FLT PAGR DATA`,
    expected: {
      passengerCount: 1, flightCount: 2, groundGapCount: 0,
      passengers: [{ name: "DOE MARUF", source: { startLine: 1, endLine: 1, excerpt: "DOE/MARUF" } }],
      flights: [
        { segmentNumber: "3", airline: "CZ", flightNumber: "5016", origin: "DAC", destination: "CAN", status: "HK1", rbd: "E", source: { startLine: 2, endLine: 2, excerpt: "CZ5016E" } },
        { segmentNumber: "4", airline: "CZ", flightNumber: "329", origin: "CAN", destination: "YVR", status: "HK1", rbd: "E", source: { startLine: 3, endLine: 4, excerpt: "CZ 329E" } },
      ], groundGaps: [],
    },
  },
  {
    id: "sabre_tk_arnk", gds: "sabre",
    raw: `TEST99
1.1DOE/N R M BORHAN MR
1 TK 713E 13SEP 7 DACIST*HK1 0650 1235 /DCTK*XXXXXX /E
2 TK 29E 15SEP 2 ISTEWR*HK1 1850 2230 /DCTK*XXXXXX /E
3 ARNK
4 TK 192L 10NOV 2 DFWIST*HK1 2010 1710 11NOV 3
/DCTK*XXXXXX /E
5 TK 712L 11NOV 3 ISTDAC*HK1 1930 0550 12NOV 4
/DCTK*XXXXXX /E
TKT/TIME LIMIT 1.T-12AUG-XXXX*ASI`,
    expected: {
      passengerCount: 1, flightCount: 4, groundGapCount: 1,
      passengers: [{ name: "DOE N R M BORHAN", source: { startLine: 2, endLine: 2, excerpt: "DOE/N R M BORHAN" } }],
      flights: [
        { segmentNumber: "1", airline: "TK", flightNumber: "713", origin: "DAC", destination: "IST", status: "HK1", rbd: "E", source: { startLine: 3, endLine: 3, excerpt: "TK 713E" } },
        { segmentNumber: "2", airline: "TK", flightNumber: "29", origin: "IST", destination: "EWR", status: "HK1", rbd: "E", source: { startLine: 4, endLine: 4, excerpt: "TK 29E" } },
        { segmentNumber: "4", airline: "TK", flightNumber: "192", origin: "DFW", destination: "IST", status: "HK1", rbd: "L", source: { startLine: 6, endLine: 7, excerpt: "TK 192L" } },
        { segmentNumber: "5", airline: "TK", flightNumber: "712", origin: "IST", destination: "DAC", status: "HK1", rbd: "L", source: { startLine: 8, endLine: 9, excerpt: "TK 712L" } },
      ], groundGaps: [{ segmentNumber: "3", source: { startLine: 5, endLine: 5, excerpt: "ARNK" } }],
    },
  },
] as const satisfies readonly PnrFixture[];
