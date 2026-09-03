import React from 'react';
import { Button, DataTable, Donut, MetricCard, PageHeader, Pagination, Panel, SearchField, FilterField } from '../components/UI';
import { visaRows } from '../data';
import { Icon } from '../icons';

export default function VisaPage(){
 const rows=visaRows.map(r=>[...r,<div className="action-group"><button className="small-icon"><Icon name="eye" size={15}/></button><button className="small-icon"><Icon name="edit" size={15}/></button><button className="small-icon"><Icon name="more" size={15}/></button></div>]);
 return <>
  <PageHeader title="Visa Applications" subtitle="Track every application, payment and progress." actions={<Button icon="plus">New Visa</Button>}/>
  <div className="content-grid">
   <div className="stack"><div className="metrics-grid five"><MetricCard icon="passport" label="Total Applications" value="328" delta="↑ 18.4%" tone="blue"/><MetricCard icon="file" label="Submitted" value="126" delta="↑ 15.1%" tone="violet"/><MetricCard icon="check" label="Approved" value="183" delta="↑ 21.3%" tone="green"/><MetricCard icon="clock" label="Pending" value="34" delta="- 6.2%" tone="orange"/><MetricCard icon="alert" label="Refused" value="14" delta="- 3.7%" tone="red"/></div>
   <div className="filter-row"><SearchField placeholder="Search by reference, applicant or destination..."/><FilterField value="All Branches" icon="building"/><FilterField value="All Destinations" icon="globe"/><FilterField value="All Progress" icon="filter"/></div></div>
   <Panel title="Approval Rate"><Donut total="78.7%" centerLabel="Approval Rate" segments={[{value:79,color:'#16a34a',label:'Approved',amount:'183'},{value:6,color:'#ef4444',label:'Refused',amount:'14'},{value:15,color:'#f59e0b',label:'Pending',amount:'34'}]}/></Panel>
  </div>
  <Panel title="Visa Register"><DataTable columns={['Reference','Applicant','Destination','Office','Visa Type','Sale Amount','Cost','Profit','Payment','Progress','Actions']} rows={rows}/><Pagination/></Panel>
 </>
}
