# Chicago Streetwise — QA Performance Report

_Generated: May 1, 2026 at 1:39 PM_

---

## 1. Executive Summary

5 runs × 10 addresses = **50 total API calls**

| Metric | Value |
|---|---|
| Total calls | 50 |
| Successful | 41 |
| Failed | 9 |
| Avg response time | 10277 ms |
| Min response time | 901 ms |
| Max response time | 64960 ms |
| p50 response time | 5008 ms |
| p90 response time | 24284 ms |
| p95 response time | 31790 ms |

---
## 2. Score Summary (avg over 5 runs)

| # | Location | Category | Avg Score /50 | Min | Max | Std Dev | Avg Time |
|---|---|---|---|---|---|---|---|
| 1 | **Ranalli's Lincoln Park** | Restaurant | 40.2 | 40.2 | 40.2 | ±0.00 | 6261 ms |
| 2 | **YooYee** | Restaurant | 36.5 | 36.5 | 36.5 | ±0.00 | 5123 ms |
| 3 | **Lottie's** | Bar | 38.4 | 38.4 | 38.4 | ±0.00 | 5777 ms |
| 4 | **Old Crow** | Bar | 41.6 | 41.6 | 41.6 | ±0.00 | 11396 ms |
| 5 | **Art Effect** | Retail | 42.7 | 42.7 | 42.7 | ±0.00 | 10095 ms |
| 6 | **Nordstrom Rack** | Retail | 36.9 | 36.9 | 36.9 | ±0.00 | 22916 ms |
| 7 | **Epsilon** | Office | 38.5 | 38.5 | 38.5 | ±0.00 | 25075 ms |
| 8 | **Convexitas** | Office | ERR | — | — | ±0.00 | — |
| 9 | **2970 N Lake Shore Dr** | Housing | 36.6 | 36.6 | 36.6 | ±0.00 | 9831 ms |
| 10 | **4953 N Seeley Ave** | Housing | 38.4 | 38.4 | 38.4 | ±0.00 | 6563 ms |

---
## 3. Per-Address Detail


### Ranalli's Lincoln Park — Restaurant

_1925 N Lincoln Ave, Chicago, IL 60614_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | 40.2 | 14238 ms | ✅ OK |
| 2 | 40.2 | 13308 ms | ✅ OK |
| 3 | 40.2 | 1307 ms | ✅ OK |
| 4 | 40.2 | 1164 ms | ✅ OK |
| 5 | 40.2 | 1286 ms | ✅ OK |

#### Category Scores (Run 1)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **3.6** | 1,746 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **4.1** | 1,549 active businesses within 1 mile (713 dining, entertainment & hospitality) |
| Foot Traffic | **4.5** | 25,737 311 service requests within 1 mile in the past year |
| Street Closures | **3.1** | 60 street closure permits within 0.5 miles (2 event-related) |
| Development | **3.7** | 347 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **3.7** | 72 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | 12655 | 13216 | 1175 | 1137 | 1266 | **5890** |
| Business Total (Socrata) | 2114 | 1081 | 456 | 336 | 472 | **892** |
| Business High-Impact (Socrata) | 2110 | 591 | 531 | 351 | 472 | **811** |
| Foot Traffic 1yr (Socrata) | 3481 | 1812 | 879 | 642 | 783 | **1519** |
| Street Closures (Socrata) | 1743 | 857 | 646 | 340 | 475 | **812** |
| Crime 6wk (Socrata) | 940 | 548 | 731 | 258 | 339 | **563** |
| Foot Traffic 6wk (Socrata) | 1434 | 557 | 495 | 328 | 579 | **679** |
| Building Permits (Socrata) | 1537 | 548 | 456 | 510 | 363 | **683** |
| CTA Score (Socrata) | 745 | 762 | 833 | 511 | 611 | **692** |
| Food Inspections (Socrata) | 652 | 492 | 649 | 336 | 334 | **493** |
| Property Sales (Cook County) | 1450 | 1286 | 1235 | 1033 | 1114 | **1224** |
| Parks (OpenStreetMap) | 520 | 355 | 371 | 208 | 249 | **341** |
| TOTAL server time | 12657 | 13217 | 1236 | 1138 | 1267 | **5903** |

---

### YooYee — Restaurant

_4925 N Broadway, Chicago, IL_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | 36.5 | 10278 ms | ✅ OK |
| 2 | 36.5 | 2698 ms | ✅ OK |
| 3 | 36.5 | 1148 ms | ✅ OK |
| 4 | 36.5 | 10377 ms | ✅ OK |
| 5 | 36.5 | 1112 ms | ✅ OK |

#### Category Scores (Run 1)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **3.3** | 1,446 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **4** | 1,241 active businesses within 1 mile (484 dining, entertainment & hospitality) |
| Foot Traffic | **4.1** | 20,996 311 service requests within 1 mile in the past year |
| Street Closures | **4.3** | 69 street closure permits within 0.5 miles (6 event-related) |
| Development | **3.6** | 300 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **3.4** | 99 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | 9309 | 691 | 1053 | 10322 | 1042 | **4483** |
| Business Total (Socrata) | 943 | 456 | 341 | 337 | 515 | **518** |
| Business High-Impact (Socrata) | 938 | 1076 | 390 | 353 | 518 | **655** |
| Foot Traffic 1yr (Socrata) | 2188 | 2556 | 575 | 668 | 785 | **1354** |
| Street Closures (Socrata) | 682 | 827 | 391 | 343 | 522 | **553** |
| Crime 6wk (Socrata) | 963 | 456 | 390 | 857 | 527 | **639** |
| Foot Traffic 6wk (Socrata) | 1037 | 456 | 502 | 360 | 676 | **606** |
| Building Permits (Socrata) | 508 | 712 | 502 | 350 | 515 | **517** |
| CTA Score (Socrata) | 630 | 666 | 595 | 514 | 737 | **628** |
| Food Inspections (Socrata) | 676 | 477 | 336 | 326 | 508 | **465** |
| Property Sales (Cook County) | 788 | 695 | 663 | 514 | 677 | **667** |
| Parks (OpenStreetMap) | 247 | 300 | 227 | 164 | 426 | **273** |
| TOTAL server time | 9310 | 2557 | 1054 | 10323 | 1043 | **4857** |

---

### Lottie's — Bar

_1925 W Cortland St, Chicago, IL 60622_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | 38.4 | 8273 ms | ✅ OK |
| 2 | 38.4 | 16928 ms | ✅ OK |
| 3 | 38.4 | 1200 ms | ✅ OK |
| 4 | 38.4 | 1020 ms | ✅ OK |
| 5 | 38.4 | 1463 ms | ✅ OK |

#### Category Scores (Run 1)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **2.6** | 941 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **4.2** | 1,883 active businesses within 1 mile (755 dining, entertainment & hospitality) |
| Foot Traffic | **4.6** | 26,539 311 service requests within 1 mile in the past year |
| Street Closures | **4.2** | 100 street closure permits within 0.5 miles (4 event-related) |
| Development | **3.8** | 393 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **3.2** | 130 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | 8024 | 16789 | 1120 | 990 | 1444 | **5673** |
| Business Total (Socrata) | 1226 | 494 | 570 | 367 | 1006 | **733** |
| Business High-Impact (Socrata) | 1411 | 607 | 466 | 434 | 941 | **772** |
| Foot Traffic 1yr (Socrata) | 3126 | 2373 | 1081 | 744 | 1111 | **1687** |
| Street Closures (Socrata) | 871 | 570 | 483 | 991 | 942 | **771** |
| Crime 6wk (Socrata) | 680 | 589 | 662 | 271 | 941 | **629** |
| Foot Traffic 6wk (Socrata) | 1744 | 629 | 553 | 463 | 941 | **866** |
| Building Permits (Socrata) | 637 | 605 | 477 | 316 | 941 | **595** |
| CTA Score (Socrata) | 620 | 800 | 628 | 496 | 1292 | **767** |
| Food Inspections (Socrata) | 508 | 521 | 447 | 275 | 941 | **538** |
| Property Sales (Cook County) | 556 | 829 | 781 | 513 | 1263 | **788** |
| Parks (OpenStreetMap) | 279 | 381 | 296 | 270 | 487 | **343** |
| TOTAL server time | 8025 | 16789 | 1120 | 991 | 1444 | **5674** |

---

### Old Crow — Bar

_3506 N Clark St, Chicago, IL 60657_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | 41.6 | 19782 ms | ✅ OK |
| 2 | 41.6 | 1799 ms | ✅ OK |
| 3 | 41.6 | 1816 ms | ✅ OK |
| 4 | 41.6 | 1792 ms | ✅ OK |
| 5 | 41.6 | 31790 ms | ✅ OK |

#### Category Scores (Run 1)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **4.7** | 3,066 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **4.3** | 2,119 active businesses within 1 mile (955 dining, entertainment & hospitality) |
| Foot Traffic | **4.6** | 27,336 311 service requests within 1 mile in the past year |
| Street Closures | **5** | 113 street closure permits within 0.5 miles (19 event-related) |
| Development | **4** | 560 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **2.9** | 172 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | 18549 | 1722 | 1718 | 1741 | 31766 | **11099** |
| Business Total (Socrata) | 1703 | 512 | 383 | 685 | 369 | **730** |
| Business High-Impact (Socrata) | 1723 | 544 | 339 | 702 | 775 | **817** |
| Foot Traffic 1yr (Socrata) | 1748 | 1413 | 618 | 622 | 857 | **1052** |
| Street Closures (Socrata) | 606 | 933 | 384 | 430 | 517 | **574** |
| Crime 6wk (Socrata) | 884 | 503 | 500 | 744 | 517 | **630** |
| Foot Traffic 6wk (Socrata) | 782 | 875 | 400 | 376 | 453 | **577** |
| Building Permits (Socrata) | 780 | 675 | 332 | 376 | 390 | **511** |
| CTA Score (Socrata) | 588 | 810 | 1020 | 669 | 775 | **772** |
| Food Inspections (Socrata) | 355 | 472 | 500 | 376 | 453 | **431** |
| Property Sales (Cook County) | 633 | 810 | 707 | 622 | 626 | **680** |
| Parks (OpenStreetMap) | 192 | 368 | 197 | 199 | 255 | **242** |
| TOTAL server time | 18550 | 1723 | 1718 | 1742 | 31767 | **11100** |

---

### Art Effect — Retail

_934 W Armitage Ave, Chicago, IL 60614_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | 42.7 | 22158 ms | ✅ OK |
| 2 | 42.7 | 20925 ms | ✅ OK |
| 3 | 42.7 | 3641 ms | ✅ OK |
| 4 | 42.7 | 1737 ms | ✅ OK |
| 5 | 42.7 | 2012 ms | ✅ OK |

#### Category Scores (Run 1)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **4.2** | 2,356 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **4.2** | 1,805 active businesses within 1 mile (762 dining, entertainment & hospitality) |
| Foot Traffic | **4.7** | 28,741 311 service requests within 1 mile in the past year |
| Street Closures | **4.4** | 81 street closure permits within 0.5 miles (6 event-related) |
| Development | **4** | 507 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **3.4** | 100 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | 21579 | 20863 | 3507 | 1572 | 1420 | **9788** |
| Business Total (Socrata) | 2655 | 1330 | 675 | 328 | 435 | **1085** |
| Business High-Impact (Socrata) | 2653 | 653 | 589 | 846 | 400 | **1028** |
| Foot Traffic 1yr (Socrata) | 2456 | 1033 | 2290 | 1151 | 716 | **1529** |
| Street Closures (Socrata) | 1007 | 1358 | 617 | 829 | 522 | **867** |
| Crime 6wk (Socrata) | 484 | 714 | 479 | 412 | 379 | **494** |
| Foot Traffic 6wk (Socrata) | 912 | 640 | 720 | 531 | 411 | **643** |
| Building Permits (Socrata) | 549 | 1059 | 545 | 341 | 379 | **575** |
| CTA Score (Socrata) | 678 | 935 | 777 | 919 | 654 | **793** |
| Food Inspections (Socrata) | 536 | 645 | 467 | 397 | 521 | **513** |
| Property Sales (Cook County) | 843 | 936 | 1041 | 540 | 676 | **807** |
| Parks (OpenStreetMap) | 341 | 458 | 496 | 230 | 222 | **349** |
| TOTAL server time | 21580 | 20864 | 3507 | 1573 | 1420 | **9789** |

---

### Nordstrom Rack — Retail

_24 N State St, Chicago, IL 60602_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | — | 65009 ms | ❌ The operation was aborted due to timeout |
| 2 | — | 65001 ms | ❌ The operation was aborted due to timeout |
| 3 | — | 65001 ms | ❌ The operation was aborted due to timeout |
| 4 | 36.9 | 39991 ms | ✅ OK |
| 5 | 36.9 | 5840 ms | ✅ OK |

#### Category Scores (Run 4)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **5** | 5,673 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **5** | 6,748 active businesses within 1 mile (2,564 dining, entertainment & hospitality) |
| Foot Traffic | **4** | 20,883 311 service requests within 1 mile in the past year |
| Street Closures | **5** | 275 street closure permits within 0.5 miles (55 event-related) |
| Development | **5** | 2,710 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **1.7** | 441 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | — | — | — | 39915 | 3147 | **21531** |
| Business Total (Socrata) | — | — | — | 806 | 848 | **827** |
| Business High-Impact (Socrata) | — | — | — | 769 | 869 | **819** |
| Foot Traffic 1yr (Socrata) | — | — | — | 1222 | 5762 | **3492** |
| Street Closures (Socrata) | — | — | — | 738 | 3804 | **2271** |
| Crime 6wk (Socrata) | — | — | — | 1458 | 681 | **1070** |
| Foot Traffic 6wk (Socrata) | — | — | — | 4131 | 1142 | **2637** |
| Building Permits (Socrata) | — | — | — | 738 | 579 | **659** |
| CTA Score (Socrata) | — | — | — | 807 | 979 | **893** |
| Food Inspections (Socrata) | — | — | — | 1110 | 587 | **849** |
| Property Sales (Cook County) | — | — | — | 1440 | 1363 | **1402** |
| Parks (OpenStreetMap) | — | — | — | 402 | 874 | **638** |
| TOTAL server time | — | — | — | 39916 | 5762 | **22839** |

---

### Epsilon — Office

_35 W Wacker Drive, Chicago, IL_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | — | 65001 ms | ❌ The operation was aborted due to timeout |
| 2 | 38.5 | 64960 ms | ✅ OK |
| 3 | 38.5 | 24284 ms | ✅ OK |
| 4 | 38.5 | 5737 ms | ✅ OK |
| 5 | 38.5 | 5319 ms | ✅ OK |

#### Category Scores (Run 2)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **5** | 9,818 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **5** | 7,429 active businesses within 1 mile (2,849 dining, entertainment & hospitality) |
| Foot Traffic | **4.2** | 22,413 311 service requests within 1 mile in the past year |
| Street Closures | **5** | 224 street closure permits within 0.5 miles (11 event-related) |
| Development | **5** | 2,391 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **1.3** | 547 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | — | 64883 | 24122 | 5536 | 5176 | **24929** |
| Business Total (Socrata) | — | 509 | 3958 | 555 | 555 | **1394** |
| Business High-Impact (Socrata) | — | 541 | 3966 | 624 | 650 | **1445** |
| Foot Traffic 1yr (Socrata) | — | 3685 | 2931 | 1963 | 1174 | **2438** |
| Street Closures (Socrata) | — | 2770 | 959 | 1462 | 987 | **1545** |
| Crime 6wk (Socrata) | — | 472 | 3054 | 572 | 461 | **1140** |
| Foot Traffic 6wk (Socrata) | — | 922 | 968 | 579 | 494 | **741** |
| Building Permits (Socrata) | — | 2150 | 731 | 1057 | 496 | **1109** |
| CTA Score (Socrata) | — | 681 | 803 | 683 | 819 | **747** |
| Food Inspections (Socrata) | — | 408 | 666 | 626 | 547 | **562** |
| Property Sales (Cook County) | — | 754 | 742 | 872 | 806 | **794** |
| Parks (OpenStreetMap) | — | 535 | 685 | 494 | 363 | **519** |
| TOTAL server time | — | 64883 | 24123 | 5536 | 5177 | **24930** |

---

### Convexitas — Office

_444 W Lake Street River Point, Chicago, IL_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | — | 1120 ms | ❌ Address not found. Please enter a valid Chicago address. |
| 2 | — | 86 ms | ❌ Address not found. Please enter a valid Chicago address. |
| 3 | — | 63 ms | ❌ Address not found. Please enter a valid Chicago address. |
| 4 | — | 79 ms | ❌ Address not found. Please enter a valid Chicago address. |
| 5 | — | 65 ms | ❌ Address not found. Please enter a valid Chicago address. |

---

### 2970 N Lake Shore Dr — Housing

_2970 N Lake Shore Drive, Chicago, IL_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | 36.6 | 26677 ms | ✅ OK |
| 2 | 36.6 | 2474 ms | ✅ OK |
| 3 | 36.6 | 4936 ms | ✅ OK |
| 4 | 36.6 | 13537 ms | ✅ OK |
| 5 | 36.6 | 1531 ms | ✅ OK |

#### Category Scores (Run 1)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **3.3** | 1,449 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **4** | 1,379 active businesses within 1 mile (664 dining, entertainment & hospitality) |
| Foot Traffic | **3.9** | 19,392 311 service requests within 1 mile in the past year |
| Street Closures | **3.6** | 52 street closure permits within 0.5 miles (4 event-related) |
| Development | **3.4** | 191 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **3.3** | 110 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | 26092 | 1554 | 1980 | 13475 | 1464 | **8913** |
| Business Total (Socrata) | 848 | 2414 | 252 | 433 | 367 | **863** |
| Business High-Impact (Socrata) | 848 | 2414 | 238 | 482 | 367 | **870** |
| Foot Traffic 1yr (Socrata) | 1579 | 1185 | 1166 | 789 | 744 | **1093** |
| Street Closures (Socrata) | 674 | 956 | 476 | 459 | 393 | **592** |
| Crime 6wk (Socrata) | 632 | 956 | 297 | 391 | 406 | **536** |
| Foot Traffic 6wk (Socrata) | 848 | 799 | 523 | 776 | 378 | **665** |
| Building Permits (Socrata) | 594 | 875 | 455 | 442 | 393 | **552** |
| CTA Score (Socrata) | 717 | 1061 | 465 | 573 | 556 | **674** |
| Food Inspections (Socrata) | 528 | 663 | 390 | 401 | 388 | **474** |
| Property Sales (Cook County) | 8784 | 1187 | 4910 | 456 | 684 | **3204** |
| Parks (OpenStreetMap) | 260 | 483 | 146 | 287 | 365 | **308** |
| TOTAL server time | 26095 | 2414 | 4911 | 13476 | 1465 | **9672** |

---

### 4953 N Seeley Ave — Housing

_4953 N Seeley Ave, Chicago, IL 60625_

#### Run-by-run Results

| Run | Score /50 | Wall Time | Status |
|---|---|---|---|
| 1 | 38.4 | 6318 ms | ✅ OK |
| 2 | 38.4 | 19125 ms | ✅ OK |
| 3 | 38.4 | 1463 ms | ✅ OK |
| 4 | 38.4 | 901 ms | ✅ OK |
| 5 | 38.4 | 5008 ms | ✅ OK |

#### Category Scores (Run 1)

| Category | Score /5 | Description |
|---|---|---|
| Rideshare | **2.8** | 1,047 pickups within 0.5 miles (10 AM–10 PM sample in March 2026) |
| Business | **4.1** | 1,412 active businesses within 1 mile (532 dining, entertainment & hospitality) |
| Foot Traffic | **4** | 20,911 311 service requests within 1 mile in the past year |
| Street Closures | **5** | 76 street closure permits within 0.5 miles (12 event-related) |
| Development | **3.7** | 322 new-construction/renovation permits within 0.5 mi (last 5 yrs) |
| Food Safety | **3.7** | 67 failed inspections within 0.5 miles in the past 3 years |

#### Sub-request Timing (ms, all 5 runs)

| Sub-request | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Avg |
|---|---|---|---|---|---|---|
| Rideshare (Socrata) | 5765 | 19004 | 649 | 809 | 959 | **5437** |
| Business Total (Socrata) | 585 | 476 | 401 | 324 | 480 | **453** |
| Business High-Impact (Socrata) | 1572 | 477 | 587 | 376 | 566 | **716** |
| Foot Traffic 1yr (Socrata) | 1918 | 662 | 849 | 630 | 4990 | **1810** |
| Street Closures (Socrata) | 634 | 1229 | 586 | 369 | 1015 | **767** |
| Crime 6wk (Socrata) | 397 | 476 | 1329 | 328 | 470 | **600** |
| Foot Traffic 6wk (Socrata) | 600 | 2079 | 402 | 388 | 523 | **798** |
| Building Permits (Socrata) | 415 | 476 | 547 | 554 | 514 | **501** |
| CTA Score (Socrata) | 526 | 624 | 680 | 499 | 797 | **625** |
| Food Inspections (Socrata) | 319 | 490 | 484 | 324 | 470 | **417** |
| Property Sales (Cook County) | 526 | 828 | 662 | 499 | 798 | **663** |
| Parks (OpenStreetMap) | 200 | 282 | 339 | 204 | 276 | **260** |
| TOTAL server time | 5767 | 19005 | 1330 | 810 | 4991 | **6381** |

---

## 4. Sub-request Timing — Cross-Address Summary (avg ms)

_Values are the average across 5 runs. "—" = not available or timed out._

| Sub-request | Ranalli's Lincoln | YooYee | Lottie's | Old Crow | Art Effect | Nordstrom Rack | Epsilon | Convexitas | 2970 N | 4953 N |
|---|---|---|---|---|---|---|---|---|---|---|
| Rideshare (Socrata) | 5890 | 4483 | 5673 | 11099 | 9788 | 21531 | 24929 | — | 8913 | 5437 |
| Business Total (Socrata) | 892 | 518 | 733 | 730 | 1085 | 827 | 1394 | — | 863 | 453 |
| Business High-Impact (Socrata) | 811 | 655 | 772 | 817 | 1028 | 819 | 1445 | — | 870 | 716 |
| Foot Traffic 1yr (Socrata) | 1519 | 1354 | 1687 | 1052 | 1529 | 3492 | 2438 | — | 1093 | 1810 |
| Street Closures (Socrata) | 812 | 553 | 771 | 574 | 867 | 2271 | 1545 | — | 592 | 767 |
| Crime 6wk (Socrata) | 563 | 639 | 629 | 630 | 494 | 1070 | 1140 | — | 536 | 600 |
| Foot Traffic 6wk (Socrata) | 679 | 606 | 866 | 577 | 643 | 2637 | 741 | — | 665 | 798 |
| Building Permits (Socrata) | 683 | 517 | 595 | 511 | 575 | 659 | 1109 | — | 552 | 501 |
| CTA Score (Socrata) | 692 | 628 | 767 | 772 | 793 | 893 | 747 | — | 674 | 625 |
| Food Inspections (Socrata) | 493 | 465 | 538 | 431 | 513 | 849 | 562 | — | 474 | 417 |
| Property Sales (Cook County) | 1224 | 667 | 788 | 680 | 807 | 1402 | 794 | — | 3204 | 663 |
| Parks (OpenStreetMap) | 341 | 273 | 343 | 242 | 349 | 638 | 519 | — | 308 | 260 |
| TOTAL server time | 5903 | 4857 | 5674 | 11100 | 9789 | 22839 | 24930 | — | 9672 | 6381 |

---
## 5. Failure Log

| Location | Run | Error |
|---|---|---|
| Nordstrom Rack | 1 | The operation was aborted due to timeout |
| Nordstrom Rack | 2 | The operation was aborted due to timeout |
| Nordstrom Rack | 3 | The operation was aborted due to timeout |
| Epsilon | 1 | The operation was aborted due to timeout |
| Convexitas | 1 | Address not found. Please enter a valid Chicago address. |
| Convexitas | 2 | Address not found. Please enter a valid Chicago address. |
| Convexitas | 3 | Address not found. Please enter a valid Chicago address. |
| Convexitas | 4 | Address not found. Please enter a valid Chicago address. |
| Convexitas | 5 | Address not found. Please enter a valid Chicago address. |

---
## 6. Slowest Individual Calls

| Rank | Location | Run | Wall Time | Score |
|---|---|---|---|---|
| 1 | Epsilon | 2 | 64960 ms | 38.5 |
| 2 | Nordstrom Rack | 4 | 39991 ms | 36.9 |
| 3 | Old Crow | 5 | 31790 ms | 41.6 |
| 4 | 2970 N Lake Shore Dr | 1 | 26677 ms | 36.6 |
| 5 | Epsilon | 3 | 24284 ms | 38.5 |
| 6 | Art Effect | 1 | 22158 ms | 42.7 |
| 7 | Art Effect | 2 | 20925 ms | 42.7 |
| 8 | Old Crow | 1 | 19782 ms | 41.6 |
| 9 | 4953 N Seeley Ave | 2 | 19125 ms | 38.4 |
| 10 | Lottie's | 2 | 16928 ms | 38.4 |