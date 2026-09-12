# Notes for Claude

## Repository

Public data repo for the Florida Relocation site's weekly community events
(`events.json`, `blocks.json`). Nothing below relates to that data — it is
personal reference kept here because this is the only store that survives
between sessions.

## Time and date — check before answering

Session date stamps are **UTC**. The user is in **Orlando (America/New_York)**,
which is UTC-4 in EDT. The UTC date rolls over at 8:00 PM local, so between
8 PM and midnight the stamp reads one day ahead.

**Before answering anything about the day, date, or schedule, run:**

```
TZ=America/New_York date '+%Y-%m-%d %H:%M %A %Z'
```

Then query the calendar for that local date. This is a standing instruction
from the user after a wrong-by-one-day answer.

## Marathon training

Training lives in **Google Calendar**, not in this repo. Plan is `PM26`
(Garmin workout prefix), target **Philadelphia Marathon, Sun Nov 22 2026**,
goal **3:45 (8:35/mi)**.

Week structure: Mon easy / Tue speed + Strength A / Thu easy build + Strength B
+ pool / Sat long run. Wed, Fri, Sun rest.

HR bands: easy 147-162 · long run 162-172 · marathon pace 168-175 ·
threshold 180-190 · VO2 190-200.

Key rules already written into the calendar events:
- **HR governs, pace floats** on easy runs.
- **Quality sessions**: run the pace at dew point <= 65F; run the HR band at
  72F+ (a normal Orlando morning is ~84F dew point).
- **Thursday cap** has a drift allowance: 162 first half, up to 168 second half
  if pace is unchanged, walk 60s above that.
- Long-run and Tuesday check-ins ask for **dew point + HR chart**, not just
  average HR. Dew point swings are worth 8-12% of pace.

Open item: **Strength A and Strength B are referenced in ~20 events but
defined nowhere.** They get skipped by default as a result.

## Shoe break-in protocol — 361 Mega 3 Pro

User's own protocol, to be applied when answering mileage questions about
these shoes. Track cumulative miles on the pair.

| Cumulative | Phase | Goal | Session |
|---|---|---|---|
| **0-10 mi** | Break-in | Soften stiff factory glue, stretch the upper, find friction points before they become blisters | One casual midweek **4-6 mi aerobic** run with a few **100 m strides** at the end. Do NOT go straight into a long run out of the box. |
| **10-35 mi** | Goal-pace adaptation | Condition lower calves, achilles and feet to the aggressive spoon carbon plate at marathon speed | **One major workout** (e.g. 10 mi with 6 at goal pace) plus **one shorter simulation run** |
| **35-50 mi** | Final confidence test | Lock in race-day fuelling and sock setup under a long effort | **One medium-long run, 11-14 mi**, with **4-5 mi woven in at goal marathon pace** |
| **50+ mi** | On ice | Freeze the shoe's condition for race day | At roughly **45-50 total miles**, stop. Clean the outsole, pull the insoles to decompress, store. Next wear is the **race-week shakeout (1-2 mi max)**, then the start line. |

Notes:
- The top band's mileage range was cut off in the source image; 0-10 is
  inferred from the next band starting at 10.
- **Pace discrepancy to resolve:** the protocol as written cites *8:00/mi goal
  pace* and *3:30:00 marathon pace*. PM26 is built for **3:45 / 8:35 mi**.
  Either the protocol came from a different plan or the goal has moved. Ask
  before applying its pace figures; the mileage bands stand either way.
- PM26's Week 14 event (Oct 31) says **no new shoes, no new gels, no new
  anything** from that point. All 45-50 break-in miles must be done before it.
