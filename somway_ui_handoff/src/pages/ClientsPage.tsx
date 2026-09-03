import React from 'react';
import { Button, DataTable, FilterField, MetricCard, PageHeader, Pagination, Panel, SearchField, StatusBadge } from '../components/UI';
import { clientsRows } from '../data';
import { Icon } from '../icons';

export default function ClientsPage(){const rows=clientsRows.map((r,i)=>[<div style={{display:'flex',alignItems:'center',gap:9}}><div className="avatar" style={{width:30,height:30,color:'#31537f',background:'#eef3fb'}}>{String(r[0]).slice(0,2).toUpperCase()}</div><div><strong style={{fontSize:10}}>{r[0]}</strong><div className="muted">client@somway.com</div></div></div>,r[1],<StatusBadge tone={i%2?'blue':'green'}>{r[2]}</StatusBadge>,r[3],r[4],r[5],r[6],r[7],r[8],<div className="action-group"><button className="small-icon"><Icon name="eye" size={15}/></button><button className="small-icon"><Icon name="edit" size={15}/></button><button className="small-icon"><Icon name="more" size={15}/></button></div>]);return <>
 <PageHeader title="Clients Registry" subtitle="Manage and view all clients across SomWay." actions={<><Button variant="secondary" icon="download">Download Clients</Button><Button icon="plus">New Client</Button></>}/>
 <div className="filter-row"><SearchField placeholder="Search clients by name, email, phone, or company..."/><FilterField value="All Types" icon="users"/><FilterField value="All Home Offices" icon="building"/><Button variant="secondary" icon="filter">Filters</Button></div>
 <div className="metrics-grid five"><MetricCard icon="users" label="Total Clients" value="247" delta="↑ 15.1%" tone="blue"/><MetricCard icon="user" label="Active Clients" value="198" delta="↑ 12.4%" tone="green"/><MetricCard icon="building" label="Corporate Clients" value="89 (36.0%)" tone="violet"/><MetricCard icon="user" label="Individual Clients" value="158 (64.0%)" tone="orange"/><MetricCard icon="wallet" label="Lifetime Spend" value="KES 12.45M" delta="↑ 18.6%" tone="cyan"/></div>
 <Panel title="Client Directory"><DataTable columns={['Client Name','Contact','Home Office','Type','Tickets','Cargo','Visas','Spend','Last Activity','Actions']} rows={rows}/><Pagination/></Panel>
 </>}
