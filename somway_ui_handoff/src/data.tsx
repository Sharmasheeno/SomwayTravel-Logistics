import React from 'react';
import { StatusBadge } from './components/UI';

export const ticketRows = [
  ['SOM/TKT/260901','Ahmed Hassan','NBO → DXB','01 Sep 2026','One Way','Nairobi','USD 1,250','USD 950',<span className="money-positive">USD 300</span>,'EVC Plus',<StatusBadge tone="green">Issued</StatusBadge>],
  ['SOM/TKT/260902','Amina Yusuf','MOG → IST','02 Sep 2026','Return','Mogadishu','USD 780','USD 610',<span className="money-positive">USD 170</span>,'Cash',<StatusBadge tone="blue">Ticketed</StatusBadge>],
  ['SOM/TKT/260903','Fatuma Ali','NBO → JED','03 Sep 2026','One Way','Nairobi','USD 620','USD 480',<span className="money-positive">USD 140</span>,'Bank',<StatusBadge tone="orange">Pending</StatusBadge>],
  ['SOM/TKT/260904','Omar Farah','MOG → DXB','04 Sep 2026','Return','Mogadishu','USD 890','USD 700',<span className="money-positive">USD 190</span>,'EVC Plus',<StatusBadge tone="green">Issued</StatusBadge>],
  ['SOM/TKT/260905','Hawa Mohamed','NBO → DOH','05 Sep 2026','One Way','Nairobi','USD 740','USD 600',<span className="money-positive">USD 140</span>,'M-Pesa',<StatusBadge tone="red">Refund Due</StatusBadge>],
];

export const cargoRows = [
  ['CGO-MOG-20260901-0013','01 Sep 2026','MOG → NBO','Ahmed','Sharmake Hassan Said','21 kg','USD 42',<StatusBadge tone="green">Paid</StatusBadge>,<StatusBadge tone="blue">In Transit</StatusBadge>],
  ['CGO-NBO-20260901-0012','01 Sep 2026','NBO → MOG','Amina','Abdulkadir','12 kg','USD 24',<StatusBadge tone="green">Paid</StatusBadge>,<StatusBadge tone="green">Delivered</StatusBadge>],
  ['CGO-MOG-20260831-0011','31 Aug 2026','MOG → NBO','Fatuma','Hodan','18 kg','USD 36',<StatusBadge tone="orange">Unpaid</StatusBadge>,<StatusBadge tone="cyan">Arrived</StatusBadge>],
  ['CGO-NBO-20260831-0010','31 Aug 2026','NBO → MOG','Kevin','Jean','9 kg','USD 18',<StatusBadge tone="green">Paid</StatusBadge>,<StatusBadge tone="orange">Ready</StatusBadge>],
];

export const visaRows = [
  ['VIS-M-72561','Ahmed Sheikh','Dubai, UAE','Mogadishu','Tourist Visa','USD 150','USD 85',<span className="money-positive">USD 65</span>,<StatusBadge tone="red">Refund Due</StatusBadge>,<StatusBadge tone="red">Refused</StatusBadge>],
  ['VIS-N-72560','Hawa Mohamed','Turkey','Nairobi','Tourist Visa','USD 220','USD 120',<span className="money-positive">USD 100</span>,<StatusBadge tone="green">Paid</StatusBadge>,<StatusBadge tone="blue">Submitted</StatusBadge>],
  ['VIS-M-72559','Omar Farah','Saudi Arabia','Mogadishu','Umrah Visa','USD 180','USD 100',<span className="money-positive">USD 80</span>,<StatusBadge tone="green">Paid</StatusBadge>,<StatusBadge tone="orange">Processing</StatusBadge>],
  ['VIS-N-72558','Amina Ali','Canada','Nairobi','Visitor Visa','USD 450','USD 300',<span className="money-positive">USD 150</span>,<StatusBadge tone="green">Paid</StatusBadge>,<StatusBadge tone="orange">Docs Pending</StatusBadge>],
];

export const expenseRows = [
  ['30 Aug 2026','Nairobi','Rent','Office rent — August 2026','M-Pesa','KES 30,000',<StatusBadge tone="green">Approved</StatusBadge>,'Included'],
  ['29 Aug 2026','Nairobi','Salaries','Staff salaries — August 2026','Bank Transfer','KES 120,000',<StatusBadge tone="green">Approved</StatusBadge>,'Included'],
  ['28 Aug 2026','Mogadishu','Travel & Transport','Client visit — transport','Cash','USD 42',<StatusBadge tone="green">Approved</StatusBadge>,'Included'],
  ['27 Aug 2026','Mogadishu','Marketing','Digital marketing','EVC Plus','USD 68',<StatusBadge tone="orange">Pending</StatusBadge>,'Review'],
];

export const clientsRows = [
  ['Smoke R','+252 61 0000101','Mogadishu','Individual','0','0','0','USD 0','—'],
  ['Smoke C','+254 700 000102','Nairobi','Individual','0','0','0','KES 0','—'],
  ['Ahmed','+252 61 6882629','Mogadishu','Individual','0','1','0','USD 24','01 Sep 2026'],
  ['Ahmed Sheikh','+252 61 2222222','Mogadishu','Individual','0','0','1','USD 150','31 Aug 2026'],
  ['Abdulkadir Hassan','+254 711 688268','Nairobi','Individual','0','1','0','KES 3,100','01 Sep 2026'],
];

export const receivableRows = [
  ['Abdi Wholesale Ltd','Cargo','Nairobi','INV-2026-0546','15 Sep 2026','USD 2,450','USD 1,200','USD 1,250',<StatusBadge tone="orange">Partially Paid</StatusBadge>,'30 Days'],
  ['SomTech Solutions','Visa','Mogadishu','INV-2026-0432','10 Sep 2026','USD 980','USD 0','USD 980',<StatusBadge tone="red">Outstanding</StatusBadge>,'35 Days'],
  ['Blue Ocean Ltd','Cargo','Nairobi','INV-2026-0419','05 Sep 2026','USD 1,760','USD 1,760','USD 0',<StatusBadge tone="green">Paid</StatusBadge>,'0 Days'],
  ['Horizon Group','Ticketing','Mogadishu','INV-2026-0398','30 Aug 2026','USD 1,320','USD 0','USD 1,320',<StatusBadge tone="red">Overdue</StatusBadge>,'42 Days'],
];

export const payableRows = [
  ['31 Aug 2026','Mogadishu','Ticket provider','Ticket cost for Ahmed: NBO to MOG','31 Aug 2026','USD 50','USD 50','USD 0',<StatusBadge tone="green">Paid</StatusBadge>],
  ['30 Aug 2026','Nairobi','Ethiopian Airlines','Ticket cost for John: NBO to ADD','05 Sep 2026','USD 680','USD 200','USD 480',<StatusBadge tone="orange">Partial</StatusBadge>],
  ['29 Aug 2026','Nairobi','Qatar Airways','Consolidator settlement — Aug','03 Sep 2026','USD 2,450','USD 0','USD 2,450',<StatusBadge tone="red">Outstanding</StatusBadge>],
  ['28 Aug 2026','Mogadishu','Turkish Airlines','Ticket cost for Mary: MOG to IST','02 Sep 2026','USD 950','USD 950','USD 0',<StatusBadge tone="green">Paid</StatusBadge>],
];
