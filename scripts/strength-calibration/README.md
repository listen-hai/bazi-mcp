# Day-master strength calibration

`strengthAssessment` reports a score under a **named method**. This directory is
where that method's numbers come from — without it they would be magic numbers,
and this project has already deleted one rule that was invented to make a test
pass and rationalised afterwards.

## The method

Qualitative rules and every case are from **韦千里《千里命稿·评断篇》(1935,
public domain)**. The book judges strength in prose — «看强弱以日干为主，以多寡、
盛衰、失时、得令为标准» — and gives no numbers.

**Every weight in this project is fitted, not sourced.** No verifiable
consensus weight table exists: 问真八字 and 文墨天机 are closed source, and the
figures circulating online contradict each other (月令 50% vs 月:时:日:年 =
4:3:2:1 vs a 60-point double scale). Saying so is more honest than adopting one
and implying it is canonical.

## Reproducing the numbers

```bash
python3 scripts/strength-calibration/calibrate.py
```

Expected:

```
网格总数 10368 / 通过 172 param sets pass
```

172 of 10368 parameter sets satisfy every constraint — a region, not a
knife-edge, which is what distinguishes a fitted method from an overfitted one.
The script asserts the chosen parameters lie inside that region.

## Fitting set vs held-out set

- **Fitting set (11 charts)** — constrains the grid search.
- **Held-out set (9 charts)** — scored with the parameters *locked*, never fed
  back. 6 land on the book's verdict, 2 in an adjacent band, 1 fails
  (阮玲玉) for a reason traceable to the book's own words: «印绶冲散» — 冲 is
  not modelled in v1. A held-out set that had been tuned against would prove
  nothing; this one is the only evidence the weights generalise.

`constraints_ok()` references the fitting set only. Verify that before trusting
any of this.

## Changing a weight

Rerun BOTH sets and update the table in this file's `## Chosen parameters`
section below. **Never tune
a parameter to turn a single test green** — that is the failure mode this
directory exists to prevent.

## Chosen parameters

Every one of these is fitted here, not taken from 千里命稿 — the book gives no
numbers. Changing any of them means rerunning both sets above.

| param | value | what it scales |
|---|---|---|
| `stem` | 0.6 | a non-day stem's contribution |
| `zhong` / `yu` | 0.5 / 0.3 | middle / residual hidden qi, against 本气 = 1.0 |
| `year` / `month` / `day` / `hour` | 1.0 / 2.5 / 1.5 / 1.0 | branch position |
| `ju` | 2.5 | a complete 三合 or 三会 |
| `ban` | 1.5 | a 生旺半合 whose full combination is absent |
| `k` | 0.6 | how much less a 克泄耗 term counts than a 帮扶 one |
| `theta` | 1.0 | the 身强 / 身弱 threshold |

`margin: '临界'` fires when `| |score| − theta | ≤ 0.5`.
