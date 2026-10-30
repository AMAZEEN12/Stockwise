# Run-by-run results, 2026-10-28
Source: the k6 JSON summaries from the Load test workflow. Excluded: one run that stopped at login (nothing measured) and one cold-start attempt that answered in 0.3 s because the service was awake.

## POST /sales, every sale on one product
| Run | Tuning | Requests | Req/s | Users | Median | p95 | p99 | Failed |
|----|----|----|----|----|----|----|----|----|
| 1 | before | 55 | 2.5 | 7 | 994 | 1,697 | 2,686 | 0 |
| 2 | before | 52 | 2.4 | 7 | 909 | 1,555 | 2,100 | 0 |
| 3 | before | 56 | 2.5 | 6 | 952 | 1,508 | 2,288 | 0 |
| 4 | after | 61 | 2.8 | 7 | 843 | 1,481 | 2,761 | 0 |
| 5 | after | 56 | 2.5 | 7 | 978 | 1,535 | 1,860 | 0 |
| 6 | after | 56 | 2.5 | 7 | 911 | 1,537 | 1,891 | 0 |
| 7 | after | 59 | 2.7 | 7 | 962 | 1,591 | 2,200 | 0 |
| 8 | after | 58 | 2.6 | 7 | 893 | 1,459 | 2,574 | 0 |
| 9 | after | 56 | 2.5 | 7 | 971 | 1,567 | 1,952 | 0 |

## POST /sales, spread across 20 products
| Run | Test | Requests | Req/s | Users | Median | p95 | p99 | Failed |
|----|----|----|----|----|----|----|----|----|
| 8 | ramp | 55 | 2.5 | 4 | 572 | 667 | 768 | 0 |
| 9 | ramp | 56 | 2.5 | 4 | 589 | 660 | 695 | 0 |
| 9 | steady, 3 tills (steady phase only) | about 136 | about 1.1 | 3 | 605 | 656 | 675 | 0 |

The steady test also had a 20 s warm-up; the whole test was 172 requests over about 157 s. In the steady phase the fastest sale took 554 ms and the slowest 717 ms.

## Dashboard (product and sales lists)
| Run | Tuning | Requests | Req/s | Users | Median | p95 | p99 | Failed |
|----|----|----|----|----|----|----|----|----|
| 1 | before | 545 | 11.8 | 16 | 451 | 803 | 1,224 | 0 |
| 2 | before | 529 | 11.5 | 16 | 278 | 1,621 | 5,920 | 5 |
| 3 | before | 991 | 15.5 | 19 | 447 | 800 | 962 | 0 |
| 4 | after | 3,599 | 29.0 | 38 | 312 | 820 | 1,121 | 0 |
| 5 | after | 5,570 | 34.4 | 50 | 299 | 832 | 4,489 | 27 |
| 6 | after | 6,339 | 40.6 | 50 | 253 | 800 | 1,097 | 0 |
| 7 | after | 6,188 | 40.2 | 50 | 254 | 800 | 1,158 | 6 |
| 8 | after | 5,586 | 37.2 | 49 | 298 | 804 | 1,200 | 0 |
| 9 | after | 5,842 | 37.5 | 50 | 310 | 807 | 1,126 | 0 |

## Product catalogue
| Run | Tuning | Requests | Req/s | Users | Median | p95 | p99 | Failed |
|----|----|----|----|----|----|----|----|----|
| 1 | before | 925 | 18.5 | 20 | 303 | 507 | 708 | 0 |
| 2 | before | 76 | 4.8 | 6 | 366 | 575 | 1,188 | 0 |
| 3 | before | 711 | 16.2 | 18 | 315 | 505 | 649 | 0 |
| 4 | after | 1,849 | 26.4 | 30 | 254 | 509 | 729 | 0 |
| 5 | after | 3,808 | 38.9 | 47 | 225 | 544 | 730 | 0 |
| 6 | after | 3,837 | 40.8 | 45 | 213 | 505 | 702 | 0 |
| 7 | after | 3,642 | 38.7 | 45 | 224 | 523 | 755 | 0 |
| 8 | after | 3,461 | 36.8 | 45 | 276 | 519 | 736 | 0 |
| 9 | after | 3,102 | 34.5 | 43 | 279 | 522 | 737 | 0 |

Last-unit (10 devices, 3 rounds): passed in every run.
Each ramp test stops itself when p95 first crosses its target, so the p95 at stop is always just over the target.
Failed dashboard requests in runs 2, 5 and 7: cause not identified.