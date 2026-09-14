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

## Shoes

### Current rotation
- **Mizuno Neo Zen 2** — the shoe actually being run in. Sep 12 14-miler was
  in these.

### 361 Mega 3 Pro — NOT the protocol shoe
Expected end of September. **Plate-free** super trainer: ~36 mm heel / 30 mm
forefoot, 6 mm drop, supercritical TPEE midsole, ~196-200 g (EU42). No carbon
plate at all, so the break-in protocol below does NOT apply to it — that
protocol's staged conditioning exists to adapt to plate stiffness.
Legal for Philadelphia: 36 mm is under the World Athletics 40 mm road limit
and there is no plate.

### Li-Ning Feidian 6 Elite — protocol shoe, NOT YET OWNED
Carbon-plated marathon racer. **The user does not have these yet.**
The protocol below is stored on standby. **Do not apply it, and do not start
counting miles, until the user says they have the shoes in hand.**
Pricing research (Sep 2026): ~$175 KICKSOWN, ~$200 Supwell; Amazon fastest
with free returns. Beware Elite vs Ultra vs Challenger — the ~$119 listings
are the Challenger, a different shoe.

## Shoe break-in protocol — Li-Ning Feidian 6 Elite (on standby)

User's own protocol. Applies to the **Feidian 6 Elite** (carbon-plated) only.
Once the user confirms they have them, track cumulative miles on the pair and
answer mileage questions against these bands.

| Cumulative | Phase | Goal | Session |
|---|---|---|---|
| **0-10 mi** | Break-in | Soften stiff factory glue, stretch the upper, find friction points before they become blisters | One casual midweek **4-6 mi aerobic** run with a few **100 m strides** at the end. Do NOT go straight into a long run out of the box. |
| **10-35 mi** | Goal-pace adaptation | Condition lower calves, achilles and feet to the aggressive spoon carbon plate at marathon speed | **One major workout** (e.g. 10 mi with 6 at goal pace) plus **one shorter simulation run** |
| **35-50 mi** | Final confidence test | Lock in race-day fuelling and sock setup under a long effort | **One medium-long run, 11-14 mi**, with **4-5 mi woven in at goal marathon pace** |
| **50+ mi** | On ice | Freeze the shoe's condition for race day | At roughly **45-50 total miles**, stop. Clean the outsole, pull the insoles to decompress, store. Next wear is the **race-week shakeout (1-2 mi max)**, then the start line. |

Notes:
- The top band's mileage range was cut off in the source image; 0-10 is
  inferred from the next band starting at 10.
- **Pace discrepancy, still unresolved:** the protocol cites *8:00/mi goal
  pace* and *3:30:00 marathon pace*. PM26 is built for **3:45 / 8:35 mi**.
  Ask before applying its pace figures; the mileage bands stand either way.
- PM26's Week 14 event (Oct 31) says **no new shoes, no new gels, no new
  anything** from that point. All 45-50 break-in miles must be done before it,
  which gets tighter the later the shoes arrive.
- The Oct 10 tune-up half is the 3:45 gate. Racing it in a shoe with only
  10-15 break-in miles is a gamble — recommendation on file is to race it in
  the Mizunos.

## Fuel and hydration — open gap

Sep 12 long run (14 mi, 2h11m, 75F dew point): took **1 Honey Stinger waffle
(~21 g carbs) ≈ 10 g/hr** against a 60-90 g/hr protocol, and **~6-10 oz fluid**
against an estimated 2-4 L sweat loss. HR trace still stayed flat, which says
the aerobic base is strong — but the fuelling rehearsal is not happening.

- **W9 (Sep 26, 16 mi)** starts the real protocol: 60-90 g carbs/hr from mile 4.
  A 2.5 h run needs 150-225 g — gels every 20-25 min plus carb drink mix.
- **Sep 18 (Fri) calendar reminder** is set to weigh in/out around the Sep 19
  long run. Sweat loss = (lb lost x 16 oz) + oz drunk; rate = that ÷ hours.
  When the user reports the two weights, convert to an oz/hr target.

