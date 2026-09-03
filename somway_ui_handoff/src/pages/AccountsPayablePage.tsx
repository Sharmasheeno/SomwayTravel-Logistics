import React from 'react';
import { Button, DataTable, FilterField, MetricCard, PageHeader, Pagination, Panel, SearchField } from '../components/UI';
import { payableRows } from '../data';
import { Icon } from '../icons';

export default function AccountsPayablePage(){const rows=payableRows.map(r=>[...r,<div className="action-group"><button className="small-icon"><Icon name="eye" size={15}/></button><button className="small-icon"><Icon name="more" size={15}/></button></div>]);return <>
 <PageHeader title="Accounts Payable" subtitle="Track accounts billed, paid, due and outstanding to airlines and consolidators." actions={<Button icon="plus">New Payable</Button>}/>
 <div className="metrics-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}><MetricCard icon="money" label="Outstanding (KES)" value="KES 18,420" delta="↑ 8.7%" tone="cyan"/><MetricCard icon="money" label="Outstanding (USD)" value="USD 66,540" delta="↑ 18.6%" tone="violet"/><MetricCard icon="receipt" label="Open Bills" value="126" delta="↑ 12.0%" tone="orange"/></div>
 <Panel style={{marginTop:14} as any}><div className="filter-row" style={{margin:0}}><FilterField value="All Branches" icon="building"/><FilterField value="All Currencies" icon="money"/><FilterField value="All Statuses" icon="check"/><SearchField placeholder="Search payable to, description..."/><Button variant="secondary" icon="filter">Filters</Button><Button variant="ghost" icon="refresh">Reset</Button></div></Panel>
 <Panel title="Payables"><DataTable columns={['Date','Branch','Payable To','Description','Due Date','Billed','Paid','Balance','Status','Actions']} rows={rows}/><Pagination/></Panel>
 </>}
