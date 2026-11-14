# Workbook calculation traceability

Source: Workbook V1.0. SHA-256: `eb287d7f01acdb1ea02855280ae6657c2906f6ee964b811587566a03e97ecf3c`.

Formulas extracted directly from OOXML; cached values are not used. The independent test interpreter executes these source formulas, separately from the application engine. Reviewer sign-off remains required before public release.

| Sheet | Cell | Workbook formula | Application output |
|---|---|---|---|
| 3-Year TCO | B5 | `Inputs!$B$8*12*(1+Inputs!$B$6)^0` | `projectWorkbook(result)["3-Year TCO"]["B5"]` |
| 3-Year TCO | C5 | `Inputs!$B$8*12*(1+Inputs!$B$6)^1` | `projectWorkbook(result)["3-Year TCO"]["C5"]` |
| 3-Year TCO | D5 | `Inputs!$B$8*12*(1+Inputs!$B$6)^2` | `projectWorkbook(result)["3-Year TCO"]["D5"]` |
| 3-Year TCO | G5 | `SUM(B11:B13)` | `projectWorkbook(result)["3-Year TCO"]["G5"]` |
| 3-Year TCO | H5 | `SUM(C11:C13)` | `projectWorkbook(result)["3-Year TCO"]["H5"]` |
| 3-Year TCO | I5 | `SUM(D11:D13)` | `projectWorkbook(result)["3-Year TCO"]["I5"]` |
| 3-Year TCO | B6 | `B5*Inputs!$B$9` | `projectWorkbook(result)["3-Year TCO"]["B6"]` |
| 3-Year TCO | C6 | `C5*Inputs!$B$9` | `projectWorkbook(result)["3-Year TCO"]["C6"]` |
| 3-Year TCO | D6 | `D5*Inputs!$B$9` | `projectWorkbook(result)["3-Year TCO"]["D6"]` |
| 3-Year TCO | G6 | `B14` | `projectWorkbook(result)["3-Year TCO"]["G6"]` |
| 3-Year TCO | H6 | `C14` | `projectWorkbook(result)["3-Year TCO"]["H6"]` |
| 3-Year TCO | I6 | `D14` | `projectWorkbook(result)["3-Year TCO"]["I6"]` |
| 3-Year TCO | B7 | `(B5-B6)*Inputs!$B$10` | `projectWorkbook(result)["3-Year TCO"]["B7"]` |
| 3-Year TCO | C7 | `(C5-C6)*Inputs!$B$10` | `projectWorkbook(result)["3-Year TCO"]["C7"]` |
| 3-Year TCO | D7 | `(D5-D6)*Inputs!$B$10` | `projectWorkbook(result)["3-Year TCO"]["D7"]` |
| 3-Year TCO | G7 | `B15` | `projectWorkbook(result)["3-Year TCO"]["G7"]` |
| 3-Year TCO | H7 | `C15` | `projectWorkbook(result)["3-Year TCO"]["H7"]` |
| 3-Year TCO | I7 | `D15` | `projectWorkbook(result)["3-Year TCO"]["I7"]` |
| 3-Year TCO | B8 | `SUM(B6:B7)` | `projectWorkbook(result)["3-Year TCO"]["B8"]` |
| 3-Year TCO | C8 | `SUM(C6:C7)` | `projectWorkbook(result)["3-Year TCO"]["C8"]` |
| 3-Year TCO | D8 | `SUM(D6:D7)` | `projectWorkbook(result)["3-Year TCO"]["D8"]` |
| 3-Year TCO | G8 | `B16` | `projectWorkbook(result)["3-Year TCO"]["G8"]` |
| 3-Year TCO | H8 | `C16` | `projectWorkbook(result)["3-Year TCO"]["H8"]` |
| 3-Year TCO | I8 | `D16` | `projectWorkbook(result)["3-Year TCO"]["I8"]` |
| 3-Year TCO | B9 | `B5-B8` | `projectWorkbook(result)["3-Year TCO"]["B9"]` |
| 3-Year TCO | C9 | `C5-C8` | `projectWorkbook(result)["3-Year TCO"]["C9"]` |
| 3-Year TCO | D9 | `D5-D8` | `projectWorkbook(result)["3-Year TCO"]["D9"]` |
| 3-Year TCO | G9 | `B17` | `projectWorkbook(result)["3-Year TCO"]["G9"]` |
| 3-Year TCO | H9 | `C17` | `projectWorkbook(result)["3-Year TCO"]["H9"]` |
| 3-Year TCO | I9 | `D17` | `projectWorkbook(result)["3-Year TCO"]["I9"]` |
| 3-Year TCO | G10 | `B18` | `projectWorkbook(result)["3-Year TCO"]["G10"]` |
| 3-Year TCO | H10 | `C18` | `projectWorkbook(result)["3-Year TCO"]["H10"]` |
| 3-Year TCO | I10 | `D18` | `projectWorkbook(result)["3-Year TCO"]["I10"]` |
| 3-Year TCO | B11 | `B5*Inputs!$B$11*Inputs!$B$13/1000000*(1+Inputs!$B$36)^0` | `projectWorkbook(result)["3-Year TCO"]["B11"]` |
| 3-Year TCO | C11 | `C5*Inputs!$B$11*Inputs!$B$13/1000000*(1+Inputs!$B$36)^1` | `projectWorkbook(result)["3-Year TCO"]["C11"]` |
| 3-Year TCO | D11 | `D5*Inputs!$B$11*Inputs!$B$13/1000000*(1+Inputs!$B$36)^2` | `projectWorkbook(result)["3-Year TCO"]["D11"]` |
| 3-Year TCO | G11 | `B19` | `projectWorkbook(result)["3-Year TCO"]["G11"]` |
| 3-Year TCO | H11 | `C19` | `projectWorkbook(result)["3-Year TCO"]["H11"]` |
| 3-Year TCO | I11 | `D19` | `projectWorkbook(result)["3-Year TCO"]["I11"]` |
| 3-Year TCO | B12 | `B5*Inputs!$B$12*Inputs!$B$14/1000000*(1+Inputs!$B$36)^0` | `projectWorkbook(result)["3-Year TCO"]["B12"]` |
| 3-Year TCO | C12 | `C5*Inputs!$B$12*Inputs!$B$14/1000000*(1+Inputs!$B$36)^1` | `projectWorkbook(result)["3-Year TCO"]["C12"]` |
| 3-Year TCO | D12 | `D5*Inputs!$B$12*Inputs!$B$14/1000000*(1+Inputs!$B$36)^2` | `projectWorkbook(result)["3-Year TCO"]["D12"]` |
| 3-Year TCO | G12 | `B21` | `projectWorkbook(result)["3-Year TCO"]["G12"]` |
| 3-Year TCO | H12 | `C21` | `projectWorkbook(result)["3-Year TCO"]["H12"]` |
| 3-Year TCO | I12 | `D21` | `projectWorkbook(result)["3-Year TCO"]["I12"]` |
| 3-Year TCO | B13 | `B5*Inputs!$B$15` | `projectWorkbook(result)["3-Year TCO"]["B13"]` |
| 3-Year TCO | C13 | `C5*Inputs!$B$15` | `projectWorkbook(result)["3-Year TCO"]["C13"]` |
| 3-Year TCO | D13 | `D5*Inputs!$B$15` | `projectWorkbook(result)["3-Year TCO"]["D13"]` |
| 3-Year TCO | B14 | `Inputs!$B$16*12*(1+Inputs!$B$7)^0*IF(Inputs!$B$17="Yes",(1+Inputs!$B$6)^0,1)` | `projectWorkbook(result)["3-Year TCO"]["B14"]` |
| 3-Year TCO | C14 | `Inputs!$B$16*12*(1+Inputs!$B$7)^1*IF(Inputs!$B$17="Yes",(1+Inputs!$B$6)^1,1)` | `projectWorkbook(result)["3-Year TCO"]["C14"]` |
| 3-Year TCO | D14 | `Inputs!$B$16*12*(1+Inputs!$B$7)^2*IF(Inputs!$B$17="Yes",(1+Inputs!$B$6)^2,1)` | `projectWorkbook(result)["3-Year TCO"]["D14"]` |
| 3-Year TCO | B15 | `Inputs!$B$18*12*(1+Inputs!$B$7)^0*IF(Inputs!$B$19="Yes",(1+Inputs!$B$6)^0,1)` | `projectWorkbook(result)["3-Year TCO"]["B15"]` |
| 3-Year TCO | C15 | `Inputs!$B$18*12*(1+Inputs!$B$7)^1*IF(Inputs!$B$19="Yes",(1+Inputs!$B$6)^1,1)` | `projectWorkbook(result)["3-Year TCO"]["C15"]` |
| 3-Year TCO | D15 | `Inputs!$B$18*12*(1+Inputs!$B$7)^2*IF(Inputs!$B$19="Yes",(1+Inputs!$B$6)^2,1)` | `projectWorkbook(result)["3-Year TCO"]["D15"]` |
| 3-Year TCO | B16 | `Inputs!$B$20*12*(1+Inputs!$B$7)^0*IF(Inputs!$B$21="Yes",(1+Inputs!$B$6)^0,1)` | `projectWorkbook(result)["3-Year TCO"]["B16"]` |
| 3-Year TCO | C16 | `Inputs!$B$20*12*(1+Inputs!$B$7)^1*IF(Inputs!$B$21="Yes",(1+Inputs!$B$6)^1,1)` | `projectWorkbook(result)["3-Year TCO"]["C16"]` |
| 3-Year TCO | D16 | `Inputs!$B$20*12*(1+Inputs!$B$7)^2*IF(Inputs!$B$21="Yes",(1+Inputs!$B$6)^2,1)` | `projectWorkbook(result)["3-Year TCO"]["D16"]` |
| 3-Year TCO | B17 | `B5*Inputs!$B$22/60*Inputs!$B$23*(1+Inputs!$B$7)^0` | `projectWorkbook(result)["3-Year TCO"]["B17"]` |
| 3-Year TCO | C17 | `C5*Inputs!$B$22/60*Inputs!$B$23*(1+Inputs!$B$7)^1` | `projectWorkbook(result)["3-Year TCO"]["C17"]` |
| 3-Year TCO | D17 | `D5*Inputs!$B$22/60*Inputs!$B$23*(1+Inputs!$B$7)^2` | `projectWorkbook(result)["3-Year TCO"]["D17"]` |
| 3-Year TCO | B18 | `(B5-B6)*Inputs!$B$24*(1+Inputs!$B$7)^0` | `projectWorkbook(result)["3-Year TCO"]["B18"]` |
| 3-Year TCO | C18 | `(C5-C6)*Inputs!$B$24*(1+Inputs!$B$7)^1` | `projectWorkbook(result)["3-Year TCO"]["C18"]` |
| 3-Year TCO | D18 | `(D5-D6)*Inputs!$B$24*(1+Inputs!$B$7)^2` | `projectWorkbook(result)["3-Year TCO"]["D18"]` |
| 3-Year TCO | B19 | `Inputs!$B$25*12*(1+Inputs!$B$7)^0*IF(Inputs!$B$26="Yes",(1+Inputs!$B$6)^0,1)` | `projectWorkbook(result)["3-Year TCO"]["B19"]` |
| 3-Year TCO | C19 | `Inputs!$B$25*12*(1+Inputs!$B$7)^1*IF(Inputs!$B$26="Yes",(1+Inputs!$B$6)^1,1)` | `projectWorkbook(result)["3-Year TCO"]["C19"]` |
| 3-Year TCO | D19 | `Inputs!$B$25*12*(1+Inputs!$B$7)^2*IF(Inputs!$B$26="Yes",(1+Inputs!$B$6)^2,1)` | `projectWorkbook(result)["3-Year TCO"]["D19"]` |
| 3-Year TCO | B20 | `SUM(B11:B19)` | `projectWorkbook(result)["3-Year TCO"]["B20"]` |
| 3-Year TCO | C20 | `SUM(C11:C19)` | `projectWorkbook(result)["3-Year TCO"]["C20"]` |
| 3-Year TCO | D20 | `SUM(D11:D19)` | `projectWorkbook(result)["3-Year TCO"]["D20"]` |
| 3-Year TCO | B21 | `B20*Inputs!$B$31` | `projectWorkbook(result)["3-Year TCO"]["B21"]` |
| 3-Year TCO | C21 | `C20*Inputs!$B$31` | `projectWorkbook(result)["3-Year TCO"]["C21"]` |
| 3-Year TCO | D21 | `D20*Inputs!$B$31` | `projectWorkbook(result)["3-Year TCO"]["D21"]` |
| 3-Year TCO | B22 | `SUM(B20:B21)` | `projectWorkbook(result)["3-Year TCO"]["B22"]` |
| 3-Year TCO | C22 | `SUM(C20:C21)` | `projectWorkbook(result)["3-Year TCO"]["C22"]` |
| 3-Year TCO | D22 | `SUM(D20:D21)` | `projectWorkbook(result)["3-Year TCO"]["D22"]` |
| 3-Year TCO | B24 | `Inputs!$B$27` | `projectWorkbook(result)["3-Year TCO"]["B24"]` |
| 3-Year TCO | C24 | `0` | `projectWorkbook(result)["3-Year TCO"]["C24"]` |
| 3-Year TCO | D24 | `0` | `projectWorkbook(result)["3-Year TCO"]["D24"]` |
| 3-Year TCO | B25 | `Inputs!$B$28` | `projectWorkbook(result)["3-Year TCO"]["B25"]` |
| 3-Year TCO | C25 | `0` | `projectWorkbook(result)["3-Year TCO"]["C25"]` |
| 3-Year TCO | D25 | `0` | `projectWorkbook(result)["3-Year TCO"]["D25"]` |
| 3-Year TCO | B26 | `Inputs!$B$29` | `projectWorkbook(result)["3-Year TCO"]["B26"]` |
| 3-Year TCO | C26 | `0` | `projectWorkbook(result)["3-Year TCO"]["C26"]` |
| 3-Year TCO | D26 | `0` | `projectWorkbook(result)["3-Year TCO"]["D26"]` |
| 3-Year TCO | B27 | `Inputs!$B$30` | `projectWorkbook(result)["3-Year TCO"]["B27"]` |
| 3-Year TCO | C27 | `0` | `projectWorkbook(result)["3-Year TCO"]["C27"]` |
| 3-Year TCO | D27 | `0` | `projectWorkbook(result)["3-Year TCO"]["D27"]` |
| 3-Year TCO | B28 | `SUM(B24:B27)` | `projectWorkbook(result)["3-Year TCO"]["B28"]` |
| 3-Year TCO | C28 | `SUM(C24:C27)` | `projectWorkbook(result)["3-Year TCO"]["C28"]` |
| 3-Year TCO | D28 | `SUM(D24:D27)` | `projectWorkbook(result)["3-Year TCO"]["D28"]` |
| 3-Year TCO | B29 | `SUM(B22,B28)` | `projectWorkbook(result)["3-Year TCO"]["B29"]` |
| 3-Year TCO | C29 | `SUM(C22,C28)` | `projectWorkbook(result)["3-Year TCO"]["C29"]` |
| 3-Year TCO | D29 | `SUM(D22,D28)` | `projectWorkbook(result)["3-Year TCO"]["D29"]` |
| 3-Year TCO | B30 | `B29` | `projectWorkbook(result)["3-Year TCO"]["B30"]` |
| 3-Year TCO | C30 | `B30+C29` | `projectWorkbook(result)["3-Year TCO"]["C30"]` |
| 3-Year TCO | D30 | `C30+D29` | `projectWorkbook(result)["3-Year TCO"]["D30"]` |
| 3-Year TCO | B32 | `IFERROR(B29/B5,0)` | `projectWorkbook(result)["3-Year TCO"]["B32"]` |
| 3-Year TCO | C32 | `IFERROR(C29/C5,0)` | `projectWorkbook(result)["3-Year TCO"]["C32"]` |
| 3-Year TCO | D32 | `IFERROR(D29/D5,0)` | `projectWorkbook(result)["3-Year TCO"]["D32"]` |
| 3-Year TCO | B33 | `IFERROR(B29/B8,0)` | `projectWorkbook(result)["3-Year TCO"]["B33"]` |
| 3-Year TCO | C33 | `IFERROR(C29/C8,0)` | `projectWorkbook(result)["3-Year TCO"]["C33"]` |
| 3-Year TCO | D33 | `IFERROR(D29/D8,0)` | `projectWorkbook(result)["3-Year TCO"]["D33"]` |
| 3-Year TCO | B34 | `IFERROR(B22/B8,0)` | `projectWorkbook(result)["3-Year TCO"]["B34"]` |
| 3-Year TCO | C34 | `IFERROR(C22/C8,0)` | `projectWorkbook(result)["3-Year TCO"]["C34"]` |
| 3-Year TCO | D34 | `IFERROR(D22/D8,0)` | `projectWorkbook(result)["3-Year TCO"]["D34"]` |
| 3-Year TCO | B35 | `IF(Inputs!$B$33>0,B5*(Inputs!$B$33/60*Inputs!$B$34*(1+Inputs!$B$7)^0+Inputs!$B$35*(1+Inputs!$B$7)^0),0)` | `projectWorkbook(result)["3-Year TCO"]["B35"]` |
| 3-Year TCO | C35 | `IF(Inputs!$B$33>0,C5*(Inputs!$B$33/60*Inputs!$B$34*(1+Inputs!$B$7)^1+Inputs!$B$35*(1+Inputs!$B$7)^1),0)` | `projectWorkbook(result)["3-Year TCO"]["C35"]` |
| 3-Year TCO | D35 | `IF(Inputs!$B$33>0,D5*(Inputs!$B$33/60*Inputs!$B$34*(1+Inputs!$B$7)^2+Inputs!$B$35*(1+Inputs!$B$7)^2),0)` | `projectWorkbook(result)["3-Year TCO"]["D35"]` |
| 3-Year TCO | B36 | `IF(Inputs!$B$33>0,B35-B29,"")` | `projectWorkbook(result)["3-Year TCO"]["B36"]` |
| 3-Year TCO | C36 | `IF(Inputs!$B$33>0,C35-C29,"")` | `projectWorkbook(result)["3-Year TCO"]["C36"]` |
| 3-Year TCO | D36 | `IF(Inputs!$B$33>0,D35-D29,"")` | `projectWorkbook(result)["3-Year TCO"]["D36"]` |
| 3-Year TCO | B37 | `B22/(1+Inputs!$B$32)^1` | `projectWorkbook(result)["3-Year TCO"]["B37"]` |
| 3-Year TCO | C37 | `C22/(1+Inputs!$B$32)^2` | `projectWorkbook(result)["3-Year TCO"]["C37"]` |
| 3-Year TCO | D37 | `D22/(1+Inputs!$B$32)^3` | `projectWorkbook(result)["3-Year TCO"]["D37"]` |
| 3-Year TCO | B38 | `SUM($B$28,$B$37:B37)` | `projectWorkbook(result)["3-Year TCO"]["B38"]` |
| 3-Year TCO | C38 | `SUM($B$28,$B$37:C37)` | `projectWorkbook(result)["3-Year TCO"]["C38"]` |
| 3-Year TCO | D38 | `SUM($B$28,$B$37:D37)` | `projectWorkbook(result)["3-Year TCO"]["D38"]` |
| 3-Year TCO | B39 | `IF(Inputs!$B$33>0,B35/(1+Inputs!$B$32)^1,0)` | `projectWorkbook(result)["3-Year TCO"]["B39"]` |
| 3-Year TCO | C39 | `IF(Inputs!$B$33>0,C35/(1+Inputs!$B$32)^2,0)` | `projectWorkbook(result)["3-Year TCO"]["C39"]` |
| 3-Year TCO | D39 | `IF(Inputs!$B$33>0,D35/(1+Inputs!$B$32)^3,0)` | `projectWorkbook(result)["3-Year TCO"]["D39"]` |
| 3-Year TCO | B40 | `IF(Inputs!$B$33>0,B39-B37-$B$28,"")` | `projectWorkbook(result)["3-Year TCO"]["B40"]` |
| 3-Year TCO | C40 | `IF(Inputs!$B$33>0,C39-C37,"")` | `projectWorkbook(result)["3-Year TCO"]["C40"]` |
| 3-Year TCO | D40 | `IF(Inputs!$B$33>0,D39-D37,"")` | `projectWorkbook(result)["3-Year TCO"]["D40"]` |
| Dashboard | B4 | `SUM('3-Year TCO'!B29:D29)` | `projectWorkbook(result)["Dashboard"]["B4"]` |
| Dashboard | B5 | `SUM('3-Year TCO'!B8:D8)` | `projectWorkbook(result)["Dashboard"]["B5"]` |
| Dashboard | B6 | `IFERROR(B4/B5,0)` | `projectWorkbook(result)["Dashboard"]["B6"]` |
| Dashboard | B7 | `'3-Year TCO'!B22` | `projectWorkbook(result)["Dashboard"]["B7"]` |
| Dashboard | B8 | `'3-Year TCO'!B28` | `projectWorkbook(result)["Dashboard"]["B8"]` |
| Dashboard | B9 | `'3-Year TCO'!D38` | `projectWorkbook(result)["Dashboard"]["B9"]` |
| Dashboard | B10 | `IF(Inputs!B33>0,SUM('3-Year TCO'!B35:D35),"n/a")` | `projectWorkbook(result)["Dashboard"]["B10"]` |
| Dashboard | B11 | `IF(Inputs!B33>0,SUM('3-Year TCO'!B35:D35)-B4,"n/a")` | `projectWorkbook(result)["Dashboard"]["B11"]` |
| Dashboard | B12 | `Inputs!B5` | `projectWorkbook(result)["Dashboard"]["B12"]` |
| Dashboard | B13 | `IF(Inputs!B33>0,SUM('3-Year TCO'!B39:D39)-B9,"n/a")` | `projectWorkbook(result)["Dashboard"]["B13"]` |
| Dashboard | B16 | `'3-Year TCO'!B29` | `projectWorkbook(result)["Dashboard"]["B16"]` |
| Dashboard | C16 | `'3-Year TCO'!C29` | `projectWorkbook(result)["Dashboard"]["C16"]` |
| Dashboard | D16 | `'3-Year TCO'!D29` | `projectWorkbook(result)["Dashboard"]["D16"]` |
| Dashboard | B17 | `'3-Year TCO'!B22` | `projectWorkbook(result)["Dashboard"]["B17"]` |
| Dashboard | C17 | `'3-Year TCO'!C22` | `projectWorkbook(result)["Dashboard"]["C17"]` |
| Dashboard | D17 | `'3-Year TCO'!D22` | `projectWorkbook(result)["Dashboard"]["D17"]` |
| Dashboard | B18 | `'3-Year TCO'!B33` | `projectWorkbook(result)["Dashboard"]["B18"]` |
| Dashboard | C18 | `'3-Year TCO'!C33` | `projectWorkbook(result)["Dashboard"]["C18"]` |
| Dashboard | D18 | `'3-Year TCO'!D33` | `projectWorkbook(result)["Dashboard"]["D18"]` |
| Dashboard | B19 | `'3-Year TCO'!B34` | `projectWorkbook(result)["Dashboard"]["B19"]` |
| Dashboard | C19 | `'3-Year TCO'!C34` | `projectWorkbook(result)["Dashboard"]["C19"]` |
| Dashboard | D19 | `'3-Year TCO'!D34` | `projectWorkbook(result)["Dashboard"]["D19"]` |
| Dashboard | B20 | `IF(Inputs!$B$33>0,'3-Year TCO'!B35,"n/a")` | `projectWorkbook(result)["Dashboard"]["B20"]` |
| Dashboard | C20 | `IF(Inputs!$B$33>0,'3-Year TCO'!C35,"n/a")` | `projectWorkbook(result)["Dashboard"]["C20"]` |
| Dashboard | D20 | `IF(Inputs!$B$33>0,'3-Year TCO'!D35,"n/a")` | `projectWorkbook(result)["Dashboard"]["D20"]` |
| Dashboard | B21 | `IF(Inputs!$B$33>0,'3-Year TCO'!B36,"n/a")` | `projectWorkbook(result)["Dashboard"]["B21"]` |
| Dashboard | C21 | `IF(Inputs!$B$33>0,'3-Year TCO'!C36,"n/a")` | `projectWorkbook(result)["Dashboard"]["C21"]` |
| Dashboard | D21 | `IF(Inputs!$B$33>0,'3-Year TCO'!D36,"n/a")` | `projectWorkbook(result)["Dashboard"]["D21"]` |
| Dashboard | B22 | `'3-Year TCO'!B8` | `projectWorkbook(result)["Dashboard"]["B22"]` |
| Dashboard | C22 | `'3-Year TCO'!C8` | `projectWorkbook(result)["Dashboard"]["C22"]` |
| Dashboard | D22 | `'3-Year TCO'!D8` | `projectWorkbook(result)["Dashboard"]["D22"]` |
| Dashboard | B26 | `'3-Year TCO'!B11` | `projectWorkbook(result)["Dashboard"]["B26"]` |
| Dashboard | C26 | `IFERROR(B26/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C26"]` |
| Dashboard | B27 | `'3-Year TCO'!B12` | `projectWorkbook(result)["Dashboard"]["B27"]` |
| Dashboard | C27 | `IFERROR(B27/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C27"]` |
| Dashboard | B28 | `'3-Year TCO'!B13` | `projectWorkbook(result)["Dashboard"]["B28"]` |
| Dashboard | C28 | `IFERROR(B28/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C28"]` |
| Dashboard | B29 | `'3-Year TCO'!B14` | `projectWorkbook(result)["Dashboard"]["B29"]` |
| Dashboard | C29 | `IFERROR(B29/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C29"]` |
| Dashboard | B30 | `'3-Year TCO'!B15` | `projectWorkbook(result)["Dashboard"]["B30"]` |
| Dashboard | C30 | `IFERROR(B30/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C30"]` |
| Dashboard | B31 | `'3-Year TCO'!B16` | `projectWorkbook(result)["Dashboard"]["B31"]` |
| Dashboard | C31 | `IFERROR(B31/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C31"]` |
| Dashboard | B32 | `'3-Year TCO'!B17` | `projectWorkbook(result)["Dashboard"]["B32"]` |
| Dashboard | C32 | `IFERROR(B32/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C32"]` |
| Dashboard | B33 | `'3-Year TCO'!B18` | `projectWorkbook(result)["Dashboard"]["B33"]` |
| Dashboard | C33 | `IFERROR(B33/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C33"]` |
| Dashboard | B34 | `'3-Year TCO'!B19` | `projectWorkbook(result)["Dashboard"]["B34"]` |
| Dashboard | C34 | `IFERROR(B34/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C34"]` |
| Dashboard | B35 | `'3-Year TCO'!B21` | `projectWorkbook(result)["Dashboard"]["B35"]` |
| Dashboard | C35 | `IFERROR(B35/$B$7,0)` | `projectWorkbook(result)["Dashboard"]["C35"]` |
