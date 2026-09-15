import type { PnrFixture } from "../../types/pnr";

/** Entirely invented, non-bookable training excerpts. They test our supported
 * display shape, not the full set of Amadeus cryptic PNR variants. */
export const amadeusFixtures = [
  {
    id: "amadeus_single", gds: "amadeus",
    raw: `RP/DAC1A0000/DAC1A0000 AA/SU 15SEP26/1200Z   DUM001
1.DOE/JANE MRS
2 BG 341 Y 15JAN 5 DACDXB HK1 0830 1130 15JAN E BG/DUMMY
3 AP DAC 0000000000
4 TK TL15DEC/DAC1A0000
--- RLR ---`,
    expected: {
      passengerCount: 1, flightCount: 1, groundGapCount: 0,
      passengers: [{ name: "DOE JANE", source: { startLine: 2, endLine: 2, excerpt: "DOE/JANE" } }],
      flights: [{ segmentNumber: "2", airline: "BG", flightNumber: "341", origin: "DAC", destination: "DXB", status: "HK1", rbd: "Y", source: { startLine: 3, endLine: 3, excerpt: "BG 341 Y" } }],
      groundGaps: [],
    },
  },
  {
    id: "amadeus_multi", gds: "amadeus",
    raw: `RP/DAC1A0000/DAC1A0000 AA/SU 15SEP26/1200Z   DUM002
1.DOE/JANE MRS
2.DOE/JOHN MR
3.REEVE/ALEX MS
4 EK 583 J 14NOV 6 DACDXB HK3 1230 1555 14NOV E EK/DUMMY
5 EK 203 C 17NOV 2 DXBJFK HK3 0235 0815 17NOV E EK/DUMMY
6 EK 204 D 28NOV 6 JFKDXB HK3 1120 0755 29NOV E EK/DUMMY
7 EK 584 Y 30NOV 1 DXBDAC HK3 1645 2320 30NOV E EK/DUMMY
8 AP DAC 0000000000
--- RLR ---`,
    expected: {
      passengerCount: 3, flightCount: 4, groundGapCount: 0,
      passengers: [
        { name: "DOE JANE", source: { startLine: 2, endLine: 2, excerpt: "DOE/JANE" } },
        { name: "DOE JOHN", source: { startLine: 3, endLine: 3, excerpt: "DOE/JOHN" } },
        { name: "REEVE ALEX", source: { startLine: 4, endLine: 4, excerpt: "REEVE/ALEX" } },
      ],
      flights: [
        { segmentNumber: "4", airline: "EK", flightNumber: "583", origin: "DAC", destination: "DXB", status: "HK3", rbd: "J", source: { startLine: 5, endLine: 5, excerpt: "EK 583 J" } },
        { segmentNumber: "5", airline: "EK", flightNumber: "203", origin: "DXB", destination: "JFK", status: "HK3", rbd: "C", source: { startLine: 6, endLine: 6, excerpt: "EK 203 C" } },
        { segmentNumber: "6", airline: "EK", flightNumber: "204", origin: "JFK", destination: "DXB", status: "HK3", rbd: "D", source: { startLine: 7, endLine: 7, excerpt: "EK 204 D" } },
        { segmentNumber: "7", airline: "EK", flightNumber: "584", origin: "DXB", destination: "DAC", status: "HK3", rbd: "Y", source: { startLine: 8, endLine: 8, excerpt: "EK 584 Y" } },
      ], groundGaps: [],
    },
  },
  {
    id: "amadeus_wrapped_arnk", gds: "amadeus",
    raw: `RP/DAC1A0000/DAC1A0000 AA/SU 15SEP26/1200Z   DUM003
1.DOE/JANE MR  2.DOE/JOHN MR
3 QR 641 M 20JAN 3 DACDOH HK2 0930
1205 20JAN E QR/DUMMY
4 ARNK
5 TK 713 B 25JAN 1 ISTDXB HL2 0650 1235 25JAN E TK/DUMMY
6 AP DAC 0000000000
--- RLR ---`,
    expected: {
      passengerCount: 2, flightCount: 2, groundGapCount: 1,
      passengers: [
        { name: "DOE JANE", source: { startLine: 2, endLine: 2, excerpt: "DOE/JANE" } },
        { name: "DOE JOHN", source: { startLine: 2, endLine: 2, excerpt: "DOE/JOHN" } },
      ],
      flights: [
        { segmentNumber: "3", airline: "QR", flightNumber: "641", origin: "DAC", destination: "DOH", status: "HK2", rbd: "M", source: { startLine: 3, endLine: 4, excerpt: "QR 641 M" } },
        { segmentNumber: "5", airline: "TK", flightNumber: "713", origin: "IST", destination: "DXB", status: "HL2", rbd: "B", source: { startLine: 6, endLine: 6, excerpt: "TK 713 B" } },
      ], groundGaps: [{ segmentNumber: "4", source: { startLine: 5, endLine: 5, excerpt: "ARNK" } }],
    },
  },
] as const satisfies readonly PnrFixture[];
